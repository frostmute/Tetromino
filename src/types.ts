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
		original: { url: string };
		display: { url: string };
		thumb: { url: string };
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

export interface SyncRecord {
	blockId: number;
	channelId: number;
	localPath: string;
	lastSyncedAt: string;
	localHash: string;
	remoteHash: string;
}

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

export const DEFAULT_SETTINGS: ArenaSyncSettings = {
	apiToken: "",
	syncInterval: 30,
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
	templateString: `---\ntitle: "{{title}}"\narena_id: {{id}}\narena_class: {{class}}\narena_url: "{{arena_url}}"\n{{#if description}}description: "{{description}}"{{/if}}\n---\n\n# {{title}}\n\n{{#if image}}![{{title}}]({{image}}){{/if}}\n\n{{content}}\n\n{{#if description}}\n## Description\n{{description}}\n{{/if}}`
};
