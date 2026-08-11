/**
 * Are.na API type definitions
 */

export interface ArenaUser {
	id: number;
	slug: string;
	username: string;
	first_name: string;
	last_name: string;
	avatar: string;
	channel_count: number;
}

export interface ArenaBlock {
	id: number;
	title: string | null;
	content: string | null;
	content_html: string | null;
	description: string | null;
	description_html: string | null;
	source: { url: string; title: string } | null;
	image: {
		filename: string;
		content_type: string;
		original?: { url: string };
		display?: { url: string };
		thumb?: { url: string };
	} | null;
	attachment: {
		file_name: string;
		file_size: number;
		url: string;
		content_type: string;
		extension: string;
	} | null;
	class: string;
	base_class: "Block";
	created_at: string;
	updated_at: string;
	connected_at: string;
	position?: number;
	user: ArenaUser;
}

export interface ArenaChannel {
	id: number;
	title: string;
	slug: string;
	length: number;
	follower_count?: number;
	followers_count?: number;
	description?: string | null;
	status: "closed" | "public" | "private";
	user: ArenaUser;
	contents?: ArenaBlock[];
	created_at: string;
	updated_at: string;
	metadata?: {
		description: string | null;
	} | null;
}

export interface ArenaChannelListItem {
	id: number;
	title: string;
	slug: string;
	length: number;
	status: "closed" | "public" | "private";
	updated_at: string;
}

export interface ArenaPaginatedResponse<T> {
	contents: T[];
	length: number;
	total_pages: number;
	current_page: number;
	per: number;
}

/**
 * Plugin-specific types
 */

export type BlockNamingScheme = "title" | "id" | "title-id";
export type ImageHandling = "embed" | "link" | "download";
export type AttachmentHandling = "link" | "download";
export type DownloadedAttachmentLinkStyle = "embed" | "link";
export type AttachmentStorage = "channel" | "global" | "custom";
export type BannerImagePriority = "thumb-first" | "display-first";
export type ChannelIndexNoteStyle = "index" | "folder-name";

export interface ChannelMapping {
	channelSlug: string;
	channelId: number;
	channelTitle: string;
	localFolder: string;
	lastSyncedAt: string | null;
	enabled: boolean;
	attachmentStorageOverride?: AttachmentStorage | null;
	customAttachmentFolderOverride?: string;
	lastAttachmentBase?: string | null;
}

export interface PendingConflict {
	localHash: string;
	remoteHash: string;
	detectedAt: string;
}

export interface SyncRecord {
	blockId: number;
	channelId: number;
	localPath: string;
	lastSyncedAt: string;
	localHash: string;
	remoteHash: string;
	/** Set while a local/remote conflict is waiting for an explicit decision. */
	pendingConflict?: PendingConflict | null;
	/** Set when the block is no longer present in its remote channel. */
	remoteMissingAt?: string | null;
}

export interface SyncConflict {
	blockId: number;
	channelId: number;
	channelSlug: string;
	localPath: string;
	localHash: string;
	remoteHash: string;
	remoteContent: string;
	diff: string;
}

export interface NoLongerRemoteCandidate {
	blockId: number;
	channelId: number;
	localPath: string;
	detectedAt: string;
}

export type ConflictResolution = "keep-local" | "use-remote" | "review-later";

export interface SyncResult {
	created: number;
	updated: number;
	deleted: number;
	moved: number;
	skipped: number;
	downloaded: number;
	dryRun: boolean;
	actions: string[];
	moves: MoveRecord[];
	fileDiffs: FileDiff[];
	missingPaths: string[];
	errors: SyncError[];
	/** Conflicts are optional for compatibility with existing result fixtures. */
	conflicts?: SyncConflict[];
	/** Missing upstream blocks are reported without deleting local notes. */
	noLongerRemote?: NoLongerRemoteCandidate[];
	duration: number;
}

export interface SyncOptions {
	dryRun?: boolean;
}

export interface ImportProgress {
	channelSlug: string;
	phase: "pages" | "blocks";
	current: number;
	total: number;
}

export interface SyncError {
	blockId: number | null;
	channelSlug: string;
	message: string;
	recoverable: boolean;
}

export interface MoveRecord {
	from: string;
	to: string;
}

export interface FileDiff {
	path: string;
	before: string;
	after: string;
	diff: string;
	kind: "create" | "update" | "move" | "delete";
}

export interface ArenaSyncSettings {
	apiToken: string;
	syncInterval: number;
	syncOnStartup: boolean;
	autoEnableImportedChannels: boolean;
	blockNaming: BlockNamingScheme;
	bannerFieldEnabled: boolean;
	bannerFieldName: string;
	bannerImagePriority: BannerImagePriority;
	includeBlockDescriptionFrontmatter: boolean;
	includeBlockComments: boolean;
	includeBlockConnectedChannels: boolean;
	includeChannelBlockPreviewImage: boolean;
	channelIndexNoteStyle: ChannelIndexNoteStyle;
	imageHandling: ImageHandling;
	attachmentHandling: AttachmentHandling;
	downloadedAttachmentLinkStyle: DownloadedAttachmentLinkStyle;
	attachmentStorage: AttachmentStorage;
	globalAttachmentFolder: string;
	customAttachmentFolder: string;
	channelMappings: ChannelMapping[];
	syncRecords: SyncRecord[];
	frontmatterEnabled: boolean;
	excludeClasses: string[];
	notifyOnSync: boolean;
	debugLogging: boolean;
	templateEnabled: boolean;
	templateString: string;
}

/**
 * True when `value` is a finite, non-negative number (0 means "disabled").
 * Rejects NaN, Infinity, negative values, and non-numbers (e.g. strings in
 * a hand-edited data file) so a bad syncInterval can never schedule a timer.
 */
export function isNonNegativeFinite(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Parses a user-typed sync-interval string. Accepts a non-negative decimal
 * number ("0", "30", "0.5"); an empty string means "disabled" (0). Returns
 * null for anything else (negative, NaN, trailing/embedded garbage) so the
 * caller can reject it instead of silently coercing.
 */
export function parseSyncIntervalInput(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") return 0;
	if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
	const minutes = Number(trimmed);
	return isNonNegativeFinite(minutes) ? minutes : null;
}

export const DEFAULT_SETTINGS: ArenaSyncSettings = {
	apiToken: "",
	syncInterval: 0,
	syncOnStartup: false,
	autoEnableImportedChannels: true,
	blockNaming: "title",
	bannerFieldEnabled: false,
	bannerFieldName: "banner",
	bannerImagePriority: "thumb-first",
	includeBlockDescriptionFrontmatter: false,
	includeBlockComments: false,
	includeBlockConnectedChannels: false,
	includeChannelBlockPreviewImage: false,
	channelIndexNoteStyle: "index",
	imageHandling: "download",
	attachmentHandling: "download",
	downloadedAttachmentLinkStyle: "link",
	attachmentStorage: "global",
	globalAttachmentFolder: "Are.na/Attachments",
	customAttachmentFolder: "",
	channelMappings: [],
	syncRecords: [],
	frontmatterEnabled: true,
	excludeClasses: [],
	notifyOnSync: true,
	debugLogging: false,
	templateEnabled: false,
	templateString: `---\ntitle: "{{title}}"\narena_id: {{id}}\narena_class: {{class}}\narena_url: "{{arena_url}}"\n{{#if description}}description: "{{description}}"{{/if}}\n---\n\n# {{title}}\n\n{{content}}\n\n{{#if description}}\n## Description\n{{description}}\n{{/if}}`
};
