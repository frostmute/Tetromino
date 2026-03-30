import { App, normalizePath, TFile, Vault } from "obsidian";
import { ArenaApi } from "./api";
import type {
	ArenaBlock,
	ArenaChannel,
	ArenaSyncSettings,
	ChannelMapping,
	ImportProgress,
	SyncOptions,
	SyncRecord,
	SyncResult,
} from "./types";
import {
	blockFileName as utilsBlockFileName,
	blockToMarkdown,
	computeHash,
	resolveAttachmentBaseFolder,
	sanitiseFilename,
} from "./utils";
import { unifiedDiff } from "./diff";

type ProgressHandler = (progress: ImportProgress) => void;

export class SyncEngine {
	private api: ArenaApi;
	private readonly settings: ArenaSyncSettings;
	private vault: Vault;
	private onProgress?: ProgressHandler;

	constructor(
		app: App,
		api: ArenaApi,
		settings: ArenaSyncSettings,
		onProgress?: ProgressHandler,
	) {
		this.api = api;
		this.settings = settings;
		this.vault = app.vault;
		this.onProgress = onProgress;
	}

	async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
		const dryRun = options.dryRun === true;
		const aggregate: SyncResult = {
			created: 0,
			updated: 0,
			deleted: 0,
			moved: 0,
			skipped: 0,
			downloaded: 0,
			dryRun,
			actions: [],
			moves: [],
			fileDiffs: [],
			missingPaths: [],
			errors: [],
			duration: 0,
		};
		const start = Date.now();

		for (const mapping of this.settings.channelMappings) {
			if (!mapping.enabled) continue;
			try {
				const result = await this.syncChannel(mapping, options);
				aggregate.created += result.created;
				aggregate.updated += result.updated;
				aggregate.deleted += result.deleted;
				aggregate.moved += result.moved;
				aggregate.skipped += result.skipped;
				aggregate.downloaded += result.downloaded;
				aggregate.actions.push(...result.actions);
				aggregate.moves.push(...result.moves);
				aggregate.fileDiffs.push(...result.fileDiffs);
				aggregate.missingPaths.push(...result.missingPaths);
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

		await this.updateMasterOverview(aggregate, dryRun);

		aggregate.duration = Date.now() - start;
		return aggregate;
	}

	async syncChannel(
		mapping: ChannelMapping,
		options: SyncOptions = {},
	): Promise<SyncResult> {
		const dryRun = options.dryRun === true;
		const result: SyncResult = {
			created: 0,
			updated: 0,
			deleted: 0,
			moved: 0,
			skipped: 0,
			downloaded: 0,
			dryRun,
			actions: [],
			moves: [],
			fileDiffs: [],
			missingPaths: [],
			errors: [],
			duration: 0,
		};
		const start = Date.now();
		const channel = await this.api.getChannel(mapping.channelSlug);

		if (!dryRun) {
			mapping.channelId = channel.id;
			mapping.channelTitle = channel.title;
		}

		await this.pull(mapping, channel, result, dryRun);

		if (!dryRun) {
			mapping.lastSyncedAt = new Date().toISOString();
		}

		result.duration = Date.now() - start;
		return result;
	}

	private async pull(
		mapping: ChannelMapping,
		channel: ArenaChannel,
		result: SyncResult,
		dryRun: boolean,
	): Promise<void> {
		const blocks = await this.api.getAllChannelBlocksWithProgress(
			mapping.channelSlug,
			(currentPage, totalPages) => {
				this.onProgress?.({
					channelSlug: mapping.channelSlug,
					phase: "pages",
					current: currentPage,
					total: totalPages,
				});
			},
		);

		if (!dryRun) {
			await this.ensureFolder(mapping.localFolder);
		}

		const importedPaths: string[] = [];
		const importedBlockIds: number[] = [];
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i];
			this.onProgress?.({
				channelSlug: mapping.channelSlug,
				phase: "blocks",
				current: i + 1,
				total: blocks.length,
			});

			if (this.shouldExclude(block)) {
				result.skipped++;
				continue;
			}

			try {
				const path = await this.pullBlock(
					block,
					mapping,
					channel,
					result,
					dryRun,
				);
				importedPaths.push(path);
				importedBlockIds.push(block.id);
			} catch (err) {
				result.errors.push({
					blockId: block.id,
					channelSlug: mapping.channelSlug,
					message: (err as Error).message,
					recoverable: true,
				});
			}
		}

		await this.updateChannelIndex(
			mapping,
			channel,
			importedPaths,
			dryRun,
			result,
		);

		this.markMissing(mapping, importedBlockIds, result);
	}

	private async pullBlock(
		block: ArenaBlock,
		mapping: ChannelMapping,
		channel: ArenaChannel,
		result: SyncResult,
		dryRun: boolean,
	): Promise<string> {
		const noteFileName = this.blockFileName(block);
		const notePath = normalizePath(
			`${mapping.localFolder}/${noteFileName}`,
		);
		const assetPath = await this.ensureBlockAsset(
			block,
			mapping,
			dryRun,
			result,
		);
		const record = this.findRecord(block.id, mapping.channelId);
		let existing = this.vault.getAbstractFileByPath(notePath);
		let moved = false;

		if (record && record.localPath !== notePath) {
			const oldFile = this.vault.getAbstractFileByPath(record.localPath);
			if (oldFile instanceof TFile) {
				moved = true;
				result.moved++;
				result.moves.push({ from: record.localPath, to: notePath });
				result.actions.push(`move ${record.localPath} -> ${notePath}`);
				if (!dryRun && !existing) {
					await this.vault.rename(oldFile, notePath);
					existing = this.vault.getAbstractFileByPath(notePath);
				}
			}
		}

		const markdown = blockToMarkdown(block, this.settings, {
			channelSlug: channel.slug,
			channelTitle: channel.title,
			assetPath,
		});
		const remoteHash = computeHash(markdown);

		if (!existing) {
			result.created++;
			result.actions.push(`create ${notePath}`);
			result.fileDiffs.push({
				path: notePath,
				before: "",
				after: markdown,
				diff: unifiedDiff("", markdown, "empty", notePath),
				kind: "create",
			});
			if (!dryRun) {
				await this.vault.create(notePath, markdown);
				this.upsertRecord(
					block.id,
					mapping.channelId,
					notePath,
					remoteHash,
					remoteHash,
				);
			}
			return notePath;
		}

		if (!(existing instanceof TFile)) {
			result.actions.push(`skip ${notePath} (not a file)`);
			return notePath;
		}

		const localContent = await this.vault.read(existing);
		const localHash = computeHash(localContent);
		if (localHash === remoteHash) {
			result.skipped++;
			result.actions.push(`skip ${notePath}`);
			if (!record && !dryRun) {
				this.upsertRecord(
					block.id,
					mapping.channelId,
					notePath,
					localHash,
					remoteHash,
				);
			} else if (moved && !dryRun) {
				this.upsertRecord(
					block.id,
					mapping.channelId,
					notePath,
					localHash,
					remoteHash,
				);
			}
			return notePath;
		}

		result.updated++;
		result.actions.push(`update ${notePath}`);
		result.fileDiffs.push({
			path: notePath,
			before: localContent,
			after: markdown,
			diff: unifiedDiff(localContent, markdown, notePath, notePath),
			kind: "update",
		});
		if (!dryRun) {
			await this.vault.modify(existing, markdown);
			this.upsertRecord(
				block.id,
				mapping.channelId,
				notePath,
				remoteHash,
				remoteHash,
			);
		}
		return notePath;
	}

	private async ensureBlockAsset(
		block: ArenaBlock,
		mapping: ChannelMapping,
		dryRun: boolean,
		result: SyncResult,
	): Promise<string | undefined> {
		let url: string | null = null;
		let fileName: string | null = null;

		if (block.class === "Image") {
			if (this.settings.imageHandling !== "download" || !block.image) {
				return undefined;
			}
			url = block.image.original.url;
			fileName = block.image.filename;
		}

		if (block.class === "Attachment") {
			if (
				this.settings.attachmentHandling !== "download" ||
				!block.attachment
			) {
				return undefined;
			}
			url = block.attachment.url;
			fileName = block.attachment.file_name;
		}

		if (!url || !fileName) return undefined;

		const baseFolder = resolveAttachmentBaseFolder(this.settings, mapping);
		const finalName = `${block.id}-${sanitiseFilename(fileName)}`;
		const assetPath = normalizePath(`${baseFolder}/${finalName}`);
		result.downloaded++;
		result.actions.push(
			`${dryRun ? "download" : "ensure"} asset ${assetPath}`,
		);

		if (dryRun) return assetPath;

		await this.ensureFolder(baseFolder);
		const existing = this.vault.getAbstractFileByPath(assetPath);
		if (existing instanceof TFile) {
			return assetPath;
		}

		const data = await this.api.downloadBinary(url);
		await this.vault.createBinary(assetPath, data);
		return assetPath;
	}

	private async updateChannelIndex(
		mapping: ChannelMapping,
		channel: ArenaChannel,
		notePaths: string[],
		dryRun: boolean,
		result: SyncResult,
	): Promise<void> {
		const indexPath = normalizePath(`${mapping.localFolder}/index.md`);
		const sorted = [...notePaths].sort();
		const lines: string[] = [
			`# ${channel.title}`,
			"",
			`- Are.na: https://www.are.na/channel/${channel.slug}`,
			`- Imported blocks: ${sorted.length}`,
			"",
			"## Notes",
		];
		for (const notePath of sorted) {
			// Extract filename and create clean link text
			const fileName = notePath.split("/").pop() || notePath;
			const linkText = fileName.replace(".md", "");
			lines.push(`- [[${notePath}|${linkText}]]`);
		}
		lines.push("");
		const content = lines.join("\n");
		const existing = this.vault.getAbstractFileByPath(indexPath);
		if (existing && !(existing instanceof TFile)) {
			result.actions.push(`skip ${indexPath} (not a file)`);
			return;
		}
		const before =
			existing instanceof TFile ? await this.vault.read(existing) : "";
		if (existing && before === content) {
			result.actions.push(`skip ${indexPath}`);
			return;
		}
		result.actions.push(`${existing ? "update" : "create"} ${indexPath}`);
		result.fileDiffs.push({
			path: indexPath,
			before,
			after: content,
			diff: unifiedDiff(before, content, indexPath, indexPath),
			kind: existing ? "update" : "create",
		});

		if (dryRun) return;
		if (!existing) {
			await this.vault.create(indexPath, content);
			return;
		}
		if (existing instanceof TFile) {
			await this.vault.modify(existing, content);
		}
	}

	private async updateMasterOverview(
		result: SyncResult,
		dryRun: boolean,
	): Promise<void> {
		const overviewPath = normalizePath("Are.na/overview.md");
		const lines: string[] = ["# Are.na Overview", "", "## Channels"];
		for (const mapping of this.settings.channelMappings) {
			if (!mapping.enabled) continue;
			const title = mapping.channelTitle || mapping.channelSlug;
			const indexPath = normalizePath(`${mapping.localFolder}/index.md`);
			lines.push(`- [[${indexPath}|${title}]]`);
		}
		lines.push("");
		const content = lines.join("\n");
		const existing = this.vault.getAbstractFileByPath(overviewPath);
		if (existing && !(existing instanceof TFile)) {
			result.actions.push(`skip ${overviewPath} (not a file)`);
			return;
		}
		const before =
			existing instanceof TFile ? await this.vault.read(existing) : "";
		if (existing && before === content) {
			result.actions.push(`skip ${overviewPath}`);
			return;
		}
		result.actions.push(`${existing ? "update" : "create"} ${overviewPath}`);
		result.fileDiffs.push({
			path: overviewPath,
			before,
			after: content,
			diff: unifiedDiff(before, content, overviewPath, overviewPath),
			kind: existing ? "update" : "create",
		});
		if (dryRun) return;
		await this.ensureFolder("Are.na");
		if (!existing) {
			await this.vault.create(overviewPath, content);
			return;
		}
		if (existing instanceof TFile) {
			await this.vault.modify(existing, content);
		}
	}

	private blockFileName(block: ArenaBlock): string {
		return utilsBlockFileName(block, this.settings.blockNaming);
	}

	private shouldExclude(block: ArenaBlock): boolean {
		return this.settings.excludeClasses.includes(block.class);
	}

	private findRecord(
		blockId: number,
		channelId: number,
	): SyncRecord | undefined {
		return this.settings.syncRecords.find(
			(r) => r.blockId === blockId && r.channelId === channelId,
		);
	}

	private upsertRecord(
		blockId: number,
		channelId: number,
		localPath: string,
		localHash: string,
		remoteHash: string,
	): void {
		const idx = this.settings.syncRecords.findIndex(
			(r) => r.blockId === blockId && r.channelId === channelId,
		);
		const record: SyncRecord = {
			blockId,
			channelId,
			localPath,
			lastSyncedAt: new Date().toISOString(),
			localHash,
			remoteHash,
		};
		if (idx >= 0) {
			this.settings.syncRecords[idx] = record;
		} else {
			this.settings.syncRecords.push(record);
		}
	}

	private async ensureFolder(path: string): Promise<void> {
		const normalized = normalizePath(path);
		const parts = normalized.split("/").filter(Boolean);
		let current = "";
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			if (!this.vault.getAbstractFileByPath(current)) {
				await this.vault.createFolder(current);
			}
		}
	}

	private markMissing(
		mapping: ChannelMapping,
		importedBlockIds: number[],
		result: SyncResult,
	): void {
		if (!mapping.channelId) return;
		const imported = new Set(importedBlockIds);
		const missing = this.settings.syncRecords.filter(
			(record) =>
				record.channelId === mapping.channelId &&
				!imported.has(record.blockId),
		);
		if (missing.length === 0) return;
		for (const record of missing) {
			result.deleted++;
			result.missingPaths.push(record.localPath);
			result.actions.push(`missing ${record.localPath}`);
		}
	}
}
