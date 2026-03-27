import { App, Notice, TFile, TFolder, normalizePath, Vault } from "obsidian";
import { ArenaApi } from "./api";
import type {
	ArenaBlock,
	ArenaSyncSettings,
	ChannelMapping,
	ConflictItem,
	SyncError,
	SyncRecord,
	SyncResult,
} from "./types";
import { blockToMarkdown, markdownToBlockContent, computeHash } from "./utils";

/**
 * Core synchronisation engine.
 *
 * Responsibilities:
 *  1. Pull remote Are.na blocks → local Markdown files
 *  2. Push local Markdown files → remote Are.na blocks
 *  3. Detect & resolve conflicts according to the user's chosen strategy
 */
export class SyncEngine {
	private app: App;
	private api: ArenaApi;
	private settings: ArenaSyncSettings;
	private vault: Vault;

	constructor(app: App, api: ArenaApi, settings: ArenaSyncSettings) {
		this.app = app;
		this.api = api;
		this.settings = settings;
		this.vault = app.vault;
	}

	/* ------------------------------------------------------------------ */
	/*  Public entry points                                               */
	/* ------------------------------------------------------------------ */

	/** Sync every enabled channel mapping. */
	async syncAll(): Promise<SyncResult> {
		const aggregate: SyncResult = {
			created: 0,
			updated: 0,
			deleted: 0,
			skipped: 0,
			conflicts: [],
			errors: [],
			duration: 0,
		};
		const start = Date.now();

		for (const mapping of this.settings.channelMappings) {
			if (!mapping.enabled) continue;
			try {
				const result = await this.syncChannel(mapping);
				aggregate.created += result.created;
				aggregate.updated += result.updated;
				aggregate.deleted += result.deleted;
				aggregate.skipped += result.skipped;
				aggregate.conflicts.push(...result.conflicts);
				aggregate.errors.push(...result.errors);
			} catch (err) {
				aggregate.errors.push({
					blockId: null,
					channelSlug: mapping.channelSlug,
					message: (err as Error).message,
					recoverable: false,
				});
			}
		}

		aggregate.duration = Date.now() - start;
		return aggregate;
	}

	/** Sync a single channel mapping. */
	async syncChannel(mapping: ChannelMapping): Promise<SyncResult> {
		const result: SyncResult = {
			created: 0,
			updated: 0,
			deleted: 0,
			skipped: 0,
			conflicts: [],
			errors: [],
			duration: 0,
		};
		const start = Date.now();
		const direction = mapping.syncDirection;

		if (direction === "pull" || direction === "both") {
			await this.pull(mapping, result);
		}

		if (direction === "push" || direction === "both") {
			await this.push(mapping, result);
		}

		mapping.lastSyncedAt = new Date().toISOString();
		result.duration = Date.now() - start;
		return result;
	}

	/* ------------------------------------------------------------------ */
	/*  Pull: Remote → Local                                              */
	/* ------------------------------------------------------------------ */

	private async pull(
		mapping: ChannelMapping,
		result: SyncResult
	): Promise<void> {
		const blocks = await this.api.getAllChannelBlocks(mapping.channelSlug);
		await this.ensureFolder(mapping.localFolder);

		for (const block of blocks) {
			if (this.shouldExclude(block)) {
				result.skipped++;
				continue;
			}

			try {
				await this.pullBlock(block, mapping, result);
			} catch (err) {
				result.errors.push({
					blockId: block.id,
					channelSlug: mapping.channelSlug,
					message: (err as Error).message,
					recoverable: true,
				});
			}
		}
	}

	private async pullBlock(
		block: ArenaBlock,
		mapping: ChannelMapping,
		result: SyncResult
	): Promise<void> {
		const fileName = this.blockFileName(block);
		const filePath = normalizePath(`${mapping.localFolder}/${fileName}`);
		const markdown = blockToMarkdown(block, this.settings);
		const remoteHash = computeHash(markdown);

		const existing = this.vault.getAbstractFileByPath(filePath);
		const record = this.findRecord(block.id, mapping.channelId);

		if (!existing) {
			// New block — create local file
			await this.vault.create(filePath, markdown);
			this.upsertRecord(block.id, mapping.channelId, filePath, remoteHash, remoteHash);
			result.created++;
			return;
		}

		if (!(existing instanceof TFile)) return;

		const localContent = await this.vault.read(existing);
		const localHash = computeHash(localContent);

		if (localHash === remoteHash) {
			result.skipped++;
			return;
		}

		// Conflict detection
		if (record && localHash !== record.localHash && remoteHash !== record.remoteHash) {
			const conflict: ConflictItem = {
				blockId: block.id,
				localPath: filePath,
				localModified: new Date(existing.stat.mtime).toISOString(),
				remoteModified: block.updated_at,
				strategy: this.settings.conflictStrategy,
			};
			result.conflicts.push(conflict);

			const resolved = this.resolveConflict(
				conflict,
				localContent,
				markdown
			);
			if (resolved !== null) {
				await this.vault.modify(existing, resolved);
				const h = computeHash(resolved);
				this.upsertRecord(block.id, mapping.channelId, filePath, h, remoteHash);
				result.updated++;
			}
			return;
		}

		// No conflict — overwrite local with remote
		await this.vault.modify(existing, markdown);
		this.upsertRecord(block.id, mapping.channelId, filePath, remoteHash, remoteHash);
		result.updated++;
	}

	/* ------------------------------------------------------------------ */
	/*  Push: Local → Remote                                              */
	/* ------------------------------------------------------------------ */

	private async push(
		mapping: ChannelMapping,
		result: SyncResult
	): Promise<void> {
		const folder = this.vault.getAbstractFileByPath(mapping.localFolder);
		if (!folder || !(folder instanceof TFolder)) return;

		const files = folder.children.filter(
			(f): f is TFile => f instanceof TFile && f.extension === "md"
		);

		for (const file of files) {
			try {
				await this.pushFile(file, mapping, result);
			} catch (err) {
				result.errors.push({
					blockId: null,
					channelSlug: mapping.channelSlug,
					message: (err as Error).message,
					recoverable: true,
				});
			}
		}
	}

	private async pushFile(
		file: TFile,
		mapping: ChannelMapping,
		result: SyncResult
	): Promise<void> {
		const content = await this.vault.read(file);
		const localHash = computeHash(content);
		const { title, body } = markdownToBlockContent(content);

		// Find existing sync record
		const record = this.settings.syncRecords.find(
			(r) => r.localPath === file.path && r.channelId === mapping.channelId
		);

		if (record) {
			if (localHash === record.localHash) {
				result.skipped++;
				return;
			}
			// Update existing remote block
			await this.api.updateBlock(mapping.channelSlug, record.blockId, {
				content: body,
				title: title || undefined,
			});
			record.localHash = localHash;
			record.lastSyncedAt = new Date().toISOString();
			result.updated++;
		} else {
			// Create new remote block
			const block = await this.api.createBlock(
				mapping.channelSlug,
				body,
				title || undefined
			);
			this.upsertRecord(
				block.id,
				mapping.channelId,
				file.path,
				localHash,
				computeHash(body)
			);
			result.created++;
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Conflict resolution                                               */
	/* ------------------------------------------------------------------ */

	private resolveConflict(
		conflict: ConflictItem,
		localContent: string,
		remoteContent: string
	): string | null {
		switch (conflict.strategy) {
			case "local-wins":
				return localContent;
			case "remote-wins":
				return remoteContent;
			case "newest-wins": {
				const localTime = new Date(conflict.localModified).getTime();
				const remoteTime = new Date(conflict.remoteModified).getTime();
				return localTime >= remoteTime ? localContent : remoteContent;
			}
			case "ask":
				// Return null — the UI layer will show a modal
				return null;
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Helpers                                                           */
	/* ------------------------------------------------------------------ */

	private blockFileName(block: ArenaBlock): string {
		const sanitize = (s: string) =>
			s.replace(/[\\/:*?"<>|]/g, "-").substring(0, 200);

		switch (this.settings.blockNaming) {
			case "title":
				return `${sanitize(block.title || `block-${block.id}`)}.md`;
			case "id":
				return `${block.id}.md`;
			case "title-id":
				return `${sanitize(block.title || "untitled")}-${block.id}.md`;
		}
	}

	private shouldExclude(block: ArenaBlock): boolean {
		return this.settings.excludeClasses.includes(block.class);
	}

	private findRecord(
		blockId: number,
		channelId: number
	): SyncRecord | undefined {
		return this.settings.syncRecords.find(
			(r) => r.blockId === blockId && r.channelId === channelId
		);
	}

	private upsertRecord(
		blockId: number,
		channelId: number,
		localPath: string,
		localHash: string,
		remoteHash: string
	): void {
		const idx = this.settings.syncRecords.findIndex(
			(r) => r.blockId === blockId && r.channelId === channelId
		);
		const record: SyncRecord = {
			blockId,
			channelId,
			localPath,
			lastSyncedAt: new Date().toISOString(),
			localHash,
			remoteHash,
			syncDirection: this.settings.defaultSyncDirection,
		};
		if (idx >= 0) {
			this.settings.syncRecords[idx] = record;
		} else {
			this.settings.syncRecords.push(record);
		}
	}

	private async ensureFolder(path: string): Promise<void> {
		const normalized = normalizePath(path);
		const exists = this.vault.getAbstractFileByPath(normalized);
		if (!exists) {
			await this.vault.createFolder(normalized);
		}
	}
}
