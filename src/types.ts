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
	class: "Image" | "Text" | "Link" | "Media" | "Attachment";
	base_class: "Block";
	created_at: string;
	updated_at: string;
	connected_at: string;
	position: number;
	user: ArenaUser;
}

export interface ArenaChannel {
	id: number;
	title: string;
	slug: string;
	length: number;
	status: "closed" | "public" | "private";
	user: ArenaUser;
	contents: ArenaBlock[];
	created_at: string;
	updated_at: string;
	metadata: {
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

export type SyncDirection = "pull" | "push" | "both";
export type ConflictStrategy = "local-wins" | "remote-wins" | "newest-wins" | "ask";
export type BlockNamingScheme = "title" | "id" | "title-id";
export type ImageHandling = "embed" | "link" | "download";

export interface ChannelMapping {
	channelSlug: string;
	channelId: number;
	channelTitle: string;
	localFolder: string;
	syncDirection: SyncDirection;
	lastSyncedAt: string | null;
	enabled: boolean;
}

export interface SyncRecord {
	blockId: number;
	channelId: number;
	localPath: string;
	lastSyncedAt: string;
	localHash: string;
	remoteHash: string;
	syncDirection: SyncDirection;
}

export interface SyncResult {
	created: number;
	updated: number;
	deleted: number;
	skipped: number;
	conflicts: ConflictItem[];
	errors: SyncError[];
	duration: number;
}

export interface ConflictItem {
	blockId: number;
	localPath: string;
	localModified: string;
	remoteModified: string;
	strategy: ConflictStrategy;
}

export interface SyncError {
	blockId: number | null;
	channelSlug: string;
	message: string;
	recoverable: boolean;
}

export interface ArenaSyncSettings {
	apiToken: string;
	syncInterval: number;
	syncOnStartup: boolean;
	defaultSyncDirection: SyncDirection;
	conflictStrategy: ConflictStrategy;
	blockNaming: BlockNamingScheme;
	imageHandling: ImageHandling;
	channelMappings: ChannelMapping[];
	syncRecords: SyncRecord[];
	frontmatterEnabled: boolean;
	frontmatterFields: string[];
	excludeClasses: string[];
	notifyOnSync: boolean;
	debugLogging: boolean;
}

export const DEFAULT_SETTINGS: ArenaSyncSettings = {
	apiToken: "",
	syncInterval: 30,
	syncOnStartup: false,
	defaultSyncDirection: "pull",
	conflictStrategy: "newest-wins",
	blockNaming: "title",
	imageHandling: "download",
	channelMappings: [],
	syncRecords: [],
	frontmatterEnabled: true,
	frontmatterFields: ["arena-id", "arena-channel", "arena-class", "arena-source", "arena-created", "arena-updated"],
	excludeClasses: [],
	notifyOnSync: true,
	debugLogging: false,
};
