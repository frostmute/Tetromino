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
	resolveChannelFolder,
	resolveAttachmentBaseFolder,
	sanitiseFilename,
} from "./utils";
import { unifiedDiff } from "./diff";
import { pMap } from "./utils";

type ProgressHandler = (progress: ImportProgress) => void;

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
			duration: 0,
		};
		const start = Date.now();

		const enabledMappings = this.settings.channelMappings.filter(
			(m) => m.enabled,
		);

		const results = await pMap(enabledMappings, 3, async (mapping) => {
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
		const channelFolder = resolveChannelFolder(mapping);
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
			await this.ensureFolder(channelFolder);
		}

		if (this.settings.includeChannelBlockPreviewImage) {
			const channelSlugsToFetch = new Set<string>();
			for (const block of blocks) {
				if (block.class === "Channel" && !this.shouldExclude(block)) {
					const slug = this.extractChannelSlugFromBlock(block);
					if (slug && !this.channelPreviewCache.has(slug)) {
						channelSlugsToFetch.add(slug);
					}
				}
			}

			if (channelSlugsToFetch.size > 0) {
				await pMap(Array.from(channelSlugsToFetch), 5, (slug) =>
					this.getChannelPreviewImage(slug),
				);
			}
		}

		const needsComments = this.settings.includeBlockComments;
		const needsChannels = this.settings.includeBlockConnectedChannels;

		if (needsComments || needsChannels) {
			const blockIdsToFetch = new Set<number>();
			for (const block of blocks) {
				if (this.shouldExclude(block)) continue;

				const blockNeedsComments =
					needsComments &&
					("comment_count" in block &&
					typeof block.comment_count === "number"
						? block.comment_count > 0
						: true);

				if (
					(blockNeedsComments || needsChannels) &&
					!this.blockDetailsCache.has(block.id)
				) {
					blockIdsToFetch.add(block.id);
				}
			}

			if (blockIdsToFetch.size > 0) {
				await pMap(Array.from(blockIdsToFetch), 5, (id) =>
					this.getBlockDetail(id),
				);
			}
		}

		const importedPaths: string[] = [];
		const importedBlockIds: number[] = [];

		let completed = 0;
		const CONCURRENCY_LIMIT = 5;
		const workers = new Set<Promise<void>>();

		for (const block of blocks) {
			if (this.shouldExclude(block)) {
				completed++;
				result.skipped++;
				this.onProgress?.({
					channelSlug: mapping.channelSlug,
					phase: "blocks",
					current: completed,
					total: blocks.length,
				});
				continue;
			}

			const worker = (async () => {
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
				} finally {
					completed++;
					this.onProgress?.({
						channelSlug: mapping.channelSlug,
						phase: "blocks",
						current: completed,
						total: blocks.length,
					});
				}
			})();

			workers.add(worker);
			worker.then(() => workers.delete(worker));
			if (workers.size >= CONCURRENCY_LIMIT) {
				await Promise.race(workers);
			}
		}

		await Promise.all(workers);

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
		const channelFolder = resolveChannelFolder(mapping);
		const notePath = normalizePath(`${channelFolder}/${noteFileName}`);
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
			...(await this.buildBlockContext(block, channel.slug)),
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
		const indexPath = this.channelIndexPath(mapping);
		const sorted = [...notePaths].sort();
		const channelDescription =
			channel.metadata?.description?.trim() ||
			channel.description?.trim() ||
			"";
		const appearsInChannels = this.extractChannelAppearsIn(channel);
		const followerCount =
			channel.follower_count ?? channel.followers_count ?? null;
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
		return this.settings.excludeClasses.includes(block.class);
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

		const needsComments =
			this.settings.includeBlockComments &&
			("comment_count" in block && typeof block.comment_count === "number"
				? block.comment_count > 0
				: true);
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
			block.class === "Channel"
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

	private extractConnectedChannels(
		detail: unknown,
		sourceChannelSlug: string,
	): Array<{ title: string; slug?: string }> {
		const obj = detail as Record<string, unknown>;
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
				const ch = item as Record<string, unknown>;
				const slug =
					typeof ch.slug === "string" && ch.slug.trim()
						? ch.slug.trim()
						: undefined;
				const title =
					typeof ch.title === "string" && ch.title.trim()
						? ch.title.trim()
						: slug || "Untitled";
				if (slug && slug === sourceChannelSlug) continue;
				const row = { title, slug };
				if (slug) {
					bySlug.set(slug, row);
				} else {
					byTitle.set(title.toLowerCase(), row);
				}
			}
		}
		return [...bySlug.values(), ...byTitle.values()].sort((a, b) =>
			a.title.localeCompare(b.title),
		);
	}

	private extractChannelAppearsIn(
		channel: ArenaChannel,
	): Array<{ title: string; slug?: string }> {
		const chObj = channel as unknown as Record<string, unknown>;
		const pools = [
			chObj.connected_by_channels,
			chObj.connected_channels,
			chObj.channels,
			chObj.appears_in_channels,
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
				if (slug && slug === channel.slug) continue;
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
				if (block.class !== "Image" || !block.image) continue;
				const url =
					block.image.display?.url ||
					block.image.thumb?.url ||
					block.image.original?.url ||
					null;
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
			});
		} else {
			const record: SyncRecord = {
				blockId,
				channelId,
				localPath,
				lastSyncedAt: new Date().toISOString(),
				localHash,
				remoteHash,
			};
			this.syncRecordMap.set(key, record);
			this.settings.syncRecords.push(record);
		}
	}

	private async ensureFolder(path: string): Promise<void> {
		const release = await new Promise<() => void>((resolve) => {
			let releaseNext: () => void;
			this.ensureFolderMutex.then(() => resolve(releaseNext));
			this.ensureFolderMutex = new Promise((r) => {
				releaseNext = r;
			});
		});

		try {
			const normalized = normalizePath(path);
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
