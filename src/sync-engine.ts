import { App, normalizePath, TFile, Vault } from "obsidian";
import { ArenaApi } from "./api";
import type {
	ArenaBlock,
	ArenaChannel,
	ArenaSyncSettings,
	ChannelMapping,
	ConflictResolution,
	ImportProgress,
	SyncConflict,
	SyncOptions,
	SyncRecord,
	SyncResult,
} from "./types";
import {
	blockFileName as utilsBlockFileName,
	blockToMarkdown,
	computeHash,
	resolveChannelFolder,
	resolveAttachmentBaseFolder,
	sanitiseFilename,
	resolveImageUrl,
} from "./utils";
import { unifiedDiff } from "./diff";
import { pMap } from "./utils";

type ProgressHandler = (progress: ImportProgress) => void;

const CONCURRENCY = {
	CHANNEL_SYNC: 3,
	PREVIEW_FETCH: 5,
	DETAIL_FETCH: 5,
	BLOCK_PROCESS: 5,
} as const;

export class SyncEngine {
	private api: ArenaApi;
	private readonly settings: ArenaSyncSettings;
	private vault: Vault;
	private onProgress?: ProgressHandler;
	private blockDetailsCache = new Map<number, unknown>();
	private syncRecordMap = new Map<string, SyncRecord>();
	private channelPreviewCache = new Map<string, string | null>();
	private folderCache = new Set<string>();
	private ensureFolderMutex: Promise<void> = Promise.resolve();
	private _timers = new Map<string, { start: number; durationMs?: number; callSite: string }>();

	private get debug(): boolean {
		return this.settings.debugLogging === true;
	}

	private time(label: string): void {
		if (this.debug) {
			this._timers.set(label, { start: this.now(), callSite: label });
		}
	}

	private timeEnd(label: string): void {
		if (this.debug) {
			const slot = this._timers.get(label);
			if (slot) {
				const dur = this.now() - slot.start;
				this._timers.set(label, { ...slot, durationMs: dur });
			}
		}
	}

	private now(): number {
		if (typeof performance !== "undefined") return performance.now();
		return Date.now();
	}

	/**
	 * Ponytail: returns the timing slots accumulated during the most recent
	 * sync operation. Production callers (the plugin UI) ignore this; tests
	 * use it to assert that each labeled phase ran the expected number of times.
	 */
	getDebugTimings(): Map<string, { start: number; durationMs?: number; callSite: string }> {
		return new Map(this._timers);
	}

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
		for (const record of settings.syncRecords) {
			this.syncRecordMap.set(
				this.getRecordKey(record.blockId, record.channelId),
				record,
			);
		}
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
			conflicts: [],
			noLongerRemote: [],
			duration: 0,
		};
		const start = Date.now();

		const enabledMappings = this.settings.channelMappings.filter(
			(m) => m.enabled,
		);

		const results = await pMap(enabledMappings, CONCURRENCY.CHANNEL_SYNC, async (mapping) => {
			try {
				return await this.syncChannel(mapping, options);
			} catch (err) {
				return {
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
					errors: [
						{
							blockId: null,
							channelSlug: mapping.channelSlug,
							message:
								err instanceof Error
									? err.message
									: String(err),
							recoverable: false,
						},
					],
					duration: 0,
				};
			}
		});

		for (const result of results) {
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
			aggregate.conflicts?.push(...(result.conflicts ?? []));
			aggregate.noLongerRemote?.push(...(result.noLongerRemote ?? []));
		}

		await this.updateMasterOverview(aggregate, dryRun);

		aggregate.duration = Date.now() - start;
		return aggregate;
	}

	async syncChannel(
		mapping: ChannelMapping,
		options: SyncOptions = {},
	): Promise<SyncResult> {
		this.blockDetailsCache.clear();
		this.channelPreviewCache.clear();
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
			conflicts: [],
			noLongerRemote: [],
			duration: 0,
		};
		const start = Date.now();
		this.time(`arena-sync:channel-metadata:${mapping.channelSlug}`);
		const channel = await this.api.getChannel(mapping.channelSlug);
		this.timeEnd(`arena-sync:channel-metadata:${mapping.channelSlug}`);

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
		const channelFolder = resolveChannelFolder(mapping);
		this.time(`arena-sync:fetch-blocks:${mapping.channelSlug}`);
		const blocks = await this.api.getAllChannelBlocksWithProgress(
			mapping.channelSlug,
			(currentPage: number, totalPages: number) => {
				this.onProgress?.({
					channelSlug: mapping.channelSlug,
					phase: "pages",
					current: currentPage,
					total: totalPages,
				});
			},
		);
		this.timeEnd(`arena-sync:fetch-blocks:${mapping.channelSlug}`);

		if (!dryRun) {
			await this.ensureFolder(channelFolder);
		}

		await this.prefetchChannelPreviews(blocks);
		await this.prefetchBlockDetails(blocks);

		const importedPaths: string[] = [];
		const remoteBlockIds = blocks.map((block) => block.id);
		const attachmentBaseFolder = resolveAttachmentBaseFolder(
			this.settings,
			mapping,
		);

		let completed = 0;
		// Avoid copying the blocks array when no exclusions are configured.
		const hasExclusions = this.settings.excludeClasses.length > 0;
		const blocksToProcess = hasExclusions
			? blocks.filter((block) => {
					if (this.shouldExclude(block)) {
						completed++;
						result.skipped++;
						this.onProgress?.({
							channelSlug: mapping.channelSlug,
							phase: "blocks",
							current: completed,
							total: blocks.length,
						});
						return false;
					}
					return true;
				})
			: blocks;

		await pMap(blocksToProcess, CONCURRENCY.BLOCK_PROCESS, async (block) => {
			this.time(`arena-sync:block:${block.id}`);
			try {
				const path = await this.pullBlock(
					block,
					mapping,
					channel,
					channelFolder,
					attachmentBaseFolder,
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
			} finally {
				completed++;
				this.timeEnd(`arena-sync:block:${block.id}`);
				this.onProgress?.({
					channelSlug: mapping.channelSlug,
					phase: "blocks",
					current: completed,
					total: blocks.length,
				});
			}
		});

		await this.updateChannelIndex(
			mapping,
			channel,
			importedPaths,
			dryRun,
			result,
		);

		this.markMissing(mapping, remoteBlockIds, result, dryRun);
	}

	private async pullBlock(
		block: ArenaBlock,
		mapping: ChannelMapping,
		channel: ArenaChannel,
		channelFolder: string,
		attachmentBaseFolder: string,
		result: SyncResult,
		dryRun: boolean,
	): Promise<string> {
		const noteFileName = this.blockFileName(block);
		const notePath = normalizePath(`${channelFolder}/${noteFileName}`);
		const assetPath = await this.ensureBlockAsset(
			block,
			attachmentBaseFolder,
			dryRun,
			result,
		);
		const record = this.findRecord(block.id, mapping.channelId);
		if (!dryRun && record?.remoteMissingAt) {
			record.remoteMissingAt = null;
		}
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
			...(await this.buildBlockContext(block, channel.slug)),
		});
		const remoteHash = await computeHash(markdown);

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

		let localHash: string | undefined;
		let localContent: string | undefined;
		if (
			record &&
			!record.pendingConflict &&
			record.localPath === notePath &&
			record.remoteHash === remoteHash &&
			typeof (existing.stat as { mtime?: number } | undefined)?.mtime ===
				"number" &&
			(existing.stat as { mtime: number }).mtime <=
				new Date(record.lastSyncedAt).getTime()
		) {
			localHash = record.remoteHash;
		} else {
			localContent = await this.vault.read(existing);
			localHash = await computeHash(localContent);
		}

		const remoteChanged = !record || record.remoteHash !== remoteHash;
		const localChanged = !record || record.localHash !== localHash;
		const unresolvedConflict =
			Boolean(record?.pendingConflict) && localHash !== remoteHash;
		const shouldReportConflict =
			localHash !== remoteHash &&
			(unresolvedConflict ||
				!record ||
				(remoteChanged && localChanged));

		if (shouldReportConflict) {
			const content = localContent ?? (await this.vault.read(existing));
			const conflict: SyncConflict = {
				blockId: block.id,
				channelId: mapping.channelId,
				channelSlug: mapping.channelSlug,
				localPath: notePath,
				localHash,
				remoteHash,
				remoteContent: markdown,
				diff: unifiedDiff(content, markdown, notePath, notePath),
			};
			result.conflicts?.push(conflict);
			result.actions.push(`conflict ${notePath}`);
			if (!dryRun) {
				if (!record) {
					this.upsertRecord(
						block.id,
						mapping.channelId,
						notePath,
						localHash,
						remoteHash,
					);
				}
				const pending = this.findRecord(block.id, mapping.channelId);
				if (pending) {
					pending.pendingConflict = {
						localHash,
						remoteHash,
						detectedAt: new Date().toISOString(),
					};
					pending.remoteMissingAt = null;
				}
			}
			return notePath;
		}

		if (localHash === remoteHash) {
			result.skipped++;
			result.actions.push(`skip ${notePath}`);
			if (!dryRun && record?.pendingConflict) {
				record.pendingConflict = null;
			}
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

		if (localChanged && !remoteChanged) {
			result.skipped++;
			result.actions.push(`preserve ${notePath} (local edit)`);
			return notePath;
		}

		result.updated++;
		result.actions.push(`update ${notePath}`);
		result.fileDiffs.push({
			path: notePath,
			before: localContent ?? "",
			after: markdown,
			diff: unifiedDiff(localContent ?? "", markdown, notePath, notePath),
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

	async resolveConflict(
		conflict: SyncConflict,
		resolution: ConflictResolution,
	): Promise<void> {
		const record = this.findRecord(conflict.blockId, conflict.channelId);
		if (!record) {
			throw new Error(`Conflict record not found for ${conflict.localPath}`);
		}

		if (resolution === "review-later") {
			record.pendingConflict = {
				localHash: conflict.localHash,
				remoteHash: conflict.remoteHash,
				detectedAt: new Date().toISOString(),
			};
			return;
		}

		const file = this.vault.getAbstractFileByPath(conflict.localPath);
		if (!(file instanceof TFile)) {
			throw new Error(`Conflict file not found: ${conflict.localPath}`);
		}

		if (resolution === "keep-local") {
			// Keep the generated remote hash as the baseline. This preserves the
			// local divergence so a later remote change becomes a new conflict.
			this.upsertRecord(
				conflict.blockId,
				conflict.channelId,
				conflict.localPath,
				conflict.remoteHash,
				conflict.remoteHash,
			);
			return;
		}

		const currentContent = await this.vault.read(file);
		const currentHash = await computeHash(currentContent);
		if (currentHash !== conflict.localHash) {
			throw new Error(
				`The local file changed since the conflict was previewed: ${conflict.localPath}`,
			);
		}
		await this.vault.modify(file, conflict.remoteContent);
		this.upsertRecord(
			conflict.blockId,
			conflict.channelId,
			conflict.localPath,
			conflict.remoteHash,
			conflict.remoteHash,
		);
	}

	private async ensureBlockAsset(
		block: ArenaBlock,
		baseFolder: string,
		dryRun: boolean,
		result: SyncResult,
	): Promise<string | undefined> {
		let url: string | null = null;
		let fileName: string | null = null;

		if (block.type === "Image") {
			if (this.settings.imageHandling !== "download" || !block.image) {
				return undefined;
			}
			url = resolveImageUrl(block, "original-first");
			fileName = block.image.filename;
		}

		if (block.type === "Attachment") {
			if (
				this.settings.attachmentHandling !== "download" ||
				!block.attachment
			) {
				return undefined;
			}
			url = block.attachment.url;
			fileName = block.attachment.filename;
		}

		if (!url || !fileName) return undefined;

		this.time(`arena-sync:asset:${block.id}`);
		const finalName = `${block.id}-${sanitiseFilename(fileName)}`;
		const assetPath = normalizePath(`${baseFolder}/${finalName}`);
		result.downloaded++;
		result.actions.push(
			`${dryRun ? "download" : "ensure"} asset ${assetPath}`,
		);

		if (dryRun) {
			this.timeEnd(`arena-sync:asset:${block.id}`);
			return assetPath;
		}

		await this.ensureFolder(baseFolder);
		const existing = this.vault.getAbstractFileByPath(assetPath);
		if (existing instanceof TFile) {
			this.timeEnd(`arena-sync:asset:${block.id}`);
			return assetPath;
		}

		const data = await this.api.downloadBinary(url);
		await this.vault.createBinary(assetPath, data);
		this.timeEnd(`arena-sync:asset:${block.id}`);
		return assetPath;
	}

	/**
	 * Pre-fetch preview images for Channel blocks so they are cached before
	 * rendering begins.
	 */
	private async prefetchChannelPreviews(blocks: ArenaBlock[]): Promise<void> {
		if (!this.settings.includeChannelBlockPreviewImage) return;

		const channelSlugsToFetch = new Set<string>();
		for (const block of blocks) {
			if (this.isChannelBlock(block) && !this.shouldExclude(block)) {
				const slug = this.extractChannelSlugFromBlock(block);
				if (slug && !this.channelPreviewCache.has(slug)) {
					channelSlugsToFetch.add(slug);
				}
			}
		}

		if (channelSlugsToFetch.size > 0) {
			await pMap(
				Array.from(channelSlugsToFetch),
				CONCURRENCY.PREVIEW_FETCH,
				(slug) => this.getChannelPreviewImage(slug),
			);
		}
	}

	/**
	 * Pre-fetch block details (comments and connected channels) for any blocks
	 * that need them and are not already cached.
	 */
	private async prefetchBlockDetails(blocks: ArenaBlock[]): Promise<void> {
		const needsComments = this.settings.includeBlockComments;
		const needsChannels = this.settings.includeBlockConnectedChannels;

		if (!needsComments && !needsChannels) return;

		const blockIdsToFetch = new Set<number>();
		for (const block of blocks) {
			if (this.shouldExclude(block)) continue;

			if (
				(this.blockNeedsComments(block) || needsChannels) &&
				!this.blockDetailsCache.has(block.id)
			) {
				blockIdsToFetch.add(block.id);
			}
		}

		if (blockIdsToFetch.size > 0) {
			await pMap(
				Array.from(blockIdsToFetch),
				CONCURRENCY.DETAIL_FETCH,
				(id) => this.getBlockDetail(id),
			);
		}
	}

	/**
	 * Determine whether a block likely needs comment fetching based on settings
	 * and the block's comment count (if known).
	 */
	private blockNeedsComments(block: ArenaBlock): boolean {
		if (!this.settings.includeBlockComments) return false;
		return (
			"comment_count" in block &&
			typeof block.comment_count === "number"
				? block.comment_count > 0
				: true
		);
	}

	private async updateChannelIndex(
		mapping: ChannelMapping,
		channel: ArenaChannel,
		notePaths: string[],
		dryRun: boolean,
		result: SyncResult,
	): Promise<void> {
		this.time(`arena-sync:index:${mapping.channelSlug}`);
		const indexPath = this.channelIndexPath(mapping);
		const sorted = [...notePaths].sort();
		const channelDescription =
			channel.metadata?.description?.trim() ||
			channel.description?.trim() ||
			"";
		const appearsInChannels = this.extractChannelAppearsIn(channel);
		const followerCount = channel.counts?.followers ?? null;
		const lines: string[] = [`# ${channel.title}`, "", "## Info", ""];
		if (channelDescription) {
			lines.push(channelDescription);
			lines.push("");
		}
		lines.push(
			`- Are.na: https://www.are.na/channel/${channel.slug}`,
			`- Started: ${channel.created_at}`,
			`- Modified: ${channel.updated_at}`,
			`- Imported blocks: ${sorted.length}`,
			`- Length: ${channel.length}`,
		);
		if (typeof followerCount === "number") {
			lines.push(`- Followers: ${followerCount}`);
		}
		if (appearsInChannels.length > 0) {
			lines.push("");
			lines.push("## This Channel Appears In");
			lines.push("");
			for (const ch of appearsInChannels) {
				if (ch.slug) {
					lines.push(
						`- [${ch.title}](https://www.are.na/channel/${ch.slug})`,
					);
				} else {
					lines.push(`- ${ch.title}`);
				}
			}
		}
		lines.push("", "## Notes");
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

		if (dryRun) {
			this.timeEnd(`arena-sync:index:${mapping.channelSlug}`);
			return;
		}
		if (!existing) {
			await this.vault.create(indexPath, content);
			this.timeEnd(`arena-sync:index:${mapping.channelSlug}`);
			return;
		}
		if (existing instanceof TFile) {
			await this.vault.modify(existing, content);
		}
		this.timeEnd(`arena-sync:index:${mapping.channelSlug}`);
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
			const indexPath = this.channelIndexPath(mapping);
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
		result.actions.push(
			`${existing ? "update" : "create"} ${overviewPath}`,
		);
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
		return this.settings.excludeClasses.includes(block.type);
	}

	private isChannelBlock(block: ArenaBlock): boolean {
		const sourceUrl = block.source?.url;
		if (!sourceUrl) return false;
		try {
			const url = new URL(sourceUrl);
			return url.hostname === "www.are.na" && /^\/channel\/[^/]+/.test(url.pathname);
		} catch {
			return /are\.na\/channel\/[^/?#]+/.test(sourceUrl);
		}
	}

	private channelIndexPath(mapping: ChannelMapping): string {
		const folder = resolveChannelFolder(mapping);
		if (this.settings.channelIndexNoteStyle === "folder-name") {
			const parts = folder.split("/").filter(Boolean);
			const folderName = parts[parts.length - 1] || "index";
			return normalizePath(`${folder}/${folderName}.md`);
		}
		return normalizePath(`${folder}/index.md`);
	}

	private async buildBlockContext(
		block: ArenaBlock,
		sourceChannelSlug: string,
	): Promise<{
		bannerImageUrl?: string;
		bodyImageUrl?: string;
		comments?: Array<{
			author: string;
			body: string;
			createdAt?: string;
		}>;
		connectedChannels?: Array<{
			title: string;
			slug?: string;
		}>;
	}> {
		const out: {
			bannerImageUrl?: string;
			bodyImageUrl?: string;
			comments?: Array<{
				author: string;
				body: string;
				createdAt?: string;
			}>;
			connectedChannels?: Array<{
				title: string;
				slug?: string;
			}>;
		} = {};

		const needsComments = this.blockNeedsComments(block);
		const needsChannels = this.settings.includeBlockConnectedChannels;

		if (needsComments || needsChannels) {
			const detail = await this.getBlockDetail(block.id);
			if (detail && needsComments) {
				const comments = this.extractComments(detail);
				if (comments.length > 0) {
					out.comments = comments;
				}
			}
			if (detail && needsChannels) {
				const channels = this.extractConnectedChannels(
					detail,
					sourceChannelSlug,
				);
				if (channels.length > 0) {
					out.connectedChannels = channels;
				}
			}
		}

		if (
			this.settings.includeChannelBlockPreviewImage &&
			this.isChannelBlock(block)
		) {
			const slug = this.extractChannelSlugFromBlock(block);
			if (slug) {
				const previewUrl = await this.getChannelPreviewImage(slug);
				if (previewUrl) {
					out.bodyImageUrl = previewUrl;
					out.bannerImageUrl = previewUrl;
				}
			}
		}

		return out;
	}

	private async getBlockDetail(id: number): Promise<unknown> {
		if (this.blockDetailsCache.has(id)) {
			return this.blockDetailsCache.get(id);
		}
		try {
			const detail = await this.api.getBlock(id);
			this.blockDetailsCache.set(id, detail);
			return detail;
		} catch (error) {
			console.warn(
				`[arena-sync] Failed to fetch block detail for ${id}:`,
				error,
			);
			this.blockDetailsCache.set(id, null);
			return null;
		}
	}

	private extractComments(detail: unknown): Array<{
		author: string;
		body: string;
		createdAt?: string;
	}> {
		const obj = detail as Record<string, unknown>;
		const raw = obj?.comments;
		if (!Array.isArray(raw)) return [];
		const comments: Array<{
			author: string;
			body: string;
			createdAt?: string;
		}> = [];
		for (const item of raw) {
			if (!item || typeof item !== "object") continue;
			const c = item as Record<string, unknown>;
			const body =
				typeof c.body === "string"
					? c.body
					: typeof c.content === "string"
						? c.content
						: typeof c.comment === "string"
							? c.comment
							: "";
			if (!body.trim()) continue;
			const user = (c.user || {}) as Record<string, unknown>;
			const author =
				(typeof user.username === "string" && user.username) ||
				(typeof user.slug === "string" && user.slug) ||
				(typeof c.author === "string" && c.author) ||
				"Unknown";
			const createdAt =
				typeof c.created_at === "string" ? c.created_at : undefined;
			comments.push({ author, body: body.trim(), createdAt });
		}
		return comments;
	}

	/**
	 * Generic helper that extracts channel references from any object shape
	 * containing the standard Are.na pool keys.
	 */
	private extractChannelPool(
		source: unknown,
		excludeSlug: string,
	): Array<{ title: string; slug?: string }> {
		const obj = source as Record<string, unknown>;
		const pools = [
			obj.connected_by_channels,
			obj.connected_channels,
			obj.channels,
			obj.appears_in_channels,
		];
		const bySlug = new Map<string, { title: string; slug?: string }>();
		const byTitle = new Map<string, { title: string; slug?: string }>();
		for (const pool of pools) {
			if (!Array.isArray(pool)) continue;
			for (const item of pool) {
				if (!item || typeof item !== "object") continue;
				const row = item as Record<string, unknown>;
				const slug =
					typeof row.slug === "string" && row.slug.trim()
						? row.slug.trim()
						: undefined;
				if (slug && slug === excludeSlug) continue;
				const title =
					typeof row.title === "string" && row.title.trim()
						? row.title.trim()
						: slug || "Untitled";
				if (slug) {
					bySlug.set(slug, { title, slug });
				} else {
					byTitle.set(title.toLowerCase(), { title });
				}
			}
		}
		return [...bySlug.values(), ...byTitle.values()].sort((a, b) =>
			a.title.localeCompare(b.title),
		);
	}

	private extractConnectedChannels(
		detail: unknown,
		sourceChannelSlug: string,
	): Array<{ title: string; slug?: string }> {
		return this.extractChannelPool(detail, sourceChannelSlug);
	}

	private extractChannelAppearsIn(
		channel: ArenaChannel,
	): Array<{ title: string; slug?: string }> {
		return this.extractChannelPool(channel, channel.slug);
	}

	private extractChannelSlugFromBlock(block: ArenaBlock): string | null {
		const sourceUrl = block.source?.url;
		if (!sourceUrl) return null;
		try {
			const url = new URL(sourceUrl);
			const match = url.pathname.match(/\/channel\/([^/]+)/);
			return match?.[1] ? decodeURIComponent(match[1]) : null;
		} catch (error) {
			console.debug(
				`[arena-sync] Error parsing URL ${sourceUrl}, falling back to regex:`,
				error,
			);
			const match = sourceUrl.match(/\/channel\/([^/?#]+)/);
			if (!match?.[1]) return null;
			try {
				return decodeURIComponent(match[1]);
			} catch {
				return match[1];
			}
		}
	}

	private async getChannelPreviewImage(slug: string): Promise<string | null> {
		if (this.channelPreviewCache.has(slug)) {
			return this.channelPreviewCache.get(slug) || null;
		}
		try {
			const page = await this.api.getChannelContents(slug, 1);
			for (const block of page.contents) {
				if (block.type !== "Image" || !block.image) continue;
				const url = resolveImageUrl(block, "display-first");
				if (url) {
					this.channelPreviewCache.set(slug, url);
					return url;
				}
			}
		} catch (error) {
			console.warn(
				`[arena-sync] Failed to fetch channel preview for ${slug}:`,
				error,
			);
			// best effort only
		}
		this.channelPreviewCache.set(slug, null);
		return null;
	}

	private getRecordKey(blockId: number, channelId: number): string {
		return `${channelId}-${blockId}`;
	}

	private findRecord(
		blockId: number,
		channelId: number,
	): SyncRecord | undefined {
		return this.syncRecordMap.get(this.getRecordKey(blockId, channelId));
	}

	private upsertRecord(
		blockId: number,
		channelId: number,
		localPath: string,
		localHash: string,
		remoteHash: string,
	): void {
		const key = this.getRecordKey(blockId, channelId);
		const existing = this.syncRecordMap.get(key);

		if (existing) {
			Object.assign(existing, {
				localPath,
				lastSyncedAt: new Date().toISOString(),
				localHash,
				remoteHash,
				pendingConflict: null,
				remoteMissingAt: null,
			});
		} else {
			const record: SyncRecord = {
				blockId,
				channelId,
				localPath,
				lastSyncedAt: new Date().toISOString(),
				localHash,
				remoteHash,
				pendingConflict: null,
				remoteMissingAt: null,
			};
			this.syncRecordMap.set(key, record);
			this.settings.syncRecords.push(record);
		}
	}

	private async ensureFolder(path: string): Promise<void> {
		const normalized = normalizePath(path);
		// Double-Checked Locking pattern: fast synchronous path
		if (this.folderCache.has(normalized)) return;

		let release!: () => void;
		const next = new Promise<void>((r) => { release = r; });
		const prev = this.ensureFolderMutex;
		this.ensureFolderMutex = next;
		await prev;

		try {
			// Second check after acquiring the lock
			if (this.folderCache.has(normalized)) return;
			if (this.vault.getAbstractFileByPath(normalized)) {
				this.folderCache.add(normalized);
				return;
			}

			const parts = normalized.split("/").filter(Boolean);
			let current = "";
			for (const part of parts) {
				current = current ? `${current}/${part}` : part;
				if (!this.folderCache.has(current)) {
					if (!this.vault.getAbstractFileByPath(current)) {
						await this.vault.createFolder(current);
					}
					this.folderCache.add(current);
				}
			}
			this.folderCache.add(normalized);
		} finally {
			release();
		}
	}

	private markMissing(
		mapping: ChannelMapping,
		importedBlockIds: number[],
		result: SyncResult,
		dryRun: boolean,
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
			const detectedAt = record.remoteMissingAt ?? new Date().toISOString();
			if (!dryRun) {
				record.remoteMissingAt = detectedAt;
				record.pendingConflict = null;
			}
			result.missingPaths.push(record.localPath);
			result.noLongerRemote?.push({
				blockId: record.blockId,
				channelId: record.channelId,
				localPath: record.localPath,
				detectedAt,
			});
			result.actions.push(`no longer remote ${record.localPath}`);
		}
	}
}
