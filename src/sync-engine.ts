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
	sanitiseFilename,
} from "./utils";

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
			skipped: 0,
			downloaded: 0,
			dryRun,
			actions: [],
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
				aggregate.skipped += result.skipped;
				aggregate.downloaded += result.downloaded;
				aggregate.actions.push(...result.actions);
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

	async syncChannel(
		mapping: ChannelMapping,
		options: SyncOptions = {},
	): Promise<SyncResult> {
		const dryRun = options.dryRun === true;
		const result: SyncResult = {
			created: 0,
			updated: 0,
			deleted: 0,
			skipped: 0,
			downloaded: 0,
			dryRun,
			actions: [],
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
		const markdown = blockToMarkdown(block, this.settings, {
			channelSlug: channel.slug,
			channelTitle: channel.title,
			assetPath,
		});
		const remoteHash = computeHash(markdown);
		const existing = this.vault.getAbstractFileByPath(notePath);
		const record = this.findRecord(block.id, mapping.channelId);

		if (!existing) {
			result.created++;
			result.actions.push(`create ${notePath}`);
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
			}
			return notePath;
		}

		result.updated++;
		result.actions.push(`update ${notePath}`);
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

		const baseFolder = this.resolveAttachmentBaseFolder(mapping);
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
		result.actions.push(`${existing ? "update" : "create"} ${indexPath}`);

		if (dryRun) return;
		if (!existing) {
			await this.vault.create(indexPath, content);
			return;
		}
		if (existing instanceof TFile) {
			await this.vault.modify(existing, content);
		}
	}

	private resolveAttachmentBaseFolder(mapping: ChannelMapping): string {
		switch (this.settings.attachmentStorage) {
			case "channel":
				return normalizePath(`${mapping.localFolder}/_attachments`);
			case "custom":
				return normalizePath(
					this.settings.customAttachmentFolder ||
						this.settings.globalAttachmentFolder,
				);
			case "global":
			default:
				return normalizePath(this.settings.globalAttachmentFolder);
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
}
