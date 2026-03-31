import { createHash } from "crypto";
import { normalizePath } from "obsidian";
import type {
	AttachmentStorage,
	ArenaBlock,
	ArenaSyncSettings,
	ChannelMapping,
} from "./types";

export interface MarkdownContext {
	channelSlug?: string;
	channelTitle?: string;
	assetPath?: string;
}

function yamlQuote(value: string): string {
	return `"${value.replace(/"/g, '\\"')}"`;
}

function resolveImageEmbedUrl(block: ArenaBlock): string | null {
	if (!block.image) return null;
	return (
		block.image.display?.url ||
		block.image.thumb?.url ||
		block.image.original?.url ||
		null
	);
}

function resolveBlockBannerUrlWithPriority(
	block: ArenaBlock,
	priority: "thumb-first" | "display-first",
): string | null {
	if (!block.image) return null;
	if (priority === "display-first") {
		return (
			block.image.display?.url ||
			block.image.thumb?.url ||
			block.image.original?.url ||
			null
		);
	}
	return (
		block.image.thumb?.url ||
		block.image.display?.url ||
		block.image.original?.url ||
		null
	);
}

export function normalizeArenaUrl(url: string): string {
	if (!url) return url;
	try {
		const parsed = new URL(url);
		if (parsed.hostname === "api.are.na") {
			const path = parsed.pathname.replace(/^\/v2/, "");
			const converted = path
				.replace(/^\/channels\/([^/]+).*$/, "/channel/$1")
				.replace(/^\/blocks\/([^/]+).*$/, "/block/$1")
				.replace(/^\/users\/([^/]+).*$/, "/user/$1");
			return `https://www.are.na${converted}`;
		}
		return url;
	} catch {
		return url;
	}
}

/**
 * Convert an Are.na block into a Markdown string suitable for Obsidian.
 */
export function blockToMarkdown(
	block: ArenaBlock,
	settings: ArenaSyncSettings,
	context: MarkdownContext = {}
): string {
	const parts: string[] = [];

	if (settings.frontmatterEnabled) {
		parts.push("---");
		parts.push(`arena_id: ${block.id}`);
		parts.push(`arena_url: ${yamlQuote(`https://www.are.na/block/${block.id}`)}`);
		parts.push(`arena_class: ${yamlQuote(block.class)}`);
		parts.push(`arena_created_at: ${yamlQuote(block.created_at)}`);
		parts.push(`arena_updated_at: ${yamlQuote(block.updated_at)}`);
		if (context.channelSlug) {
			parts.push(`arena_channel_slug: ${yamlQuote(context.channelSlug)}`);
		}
		if (context.channelTitle) {
			parts.push(`arena_channel_title: ${yamlQuote(context.channelTitle)}`);
		}
		if (block.source?.url) {
			parts.push(`arena_source_url: ${yamlQuote(normalizeArenaUrl(block.source.url))}`);
		}
		if (settings.bannerFieldEnabled) {
			const bannerValue = resolveBlockBannerUrlWithPriority(
				block,
				settings.bannerImagePriority,
			);
			if (bannerValue) {
				const bannerFieldName = settings.bannerFieldName.trim() || "banner";
				parts.push(`${bannerFieldName}: ${yamlQuote(bannerValue)}`);
			}
		}
		parts.push("---");
		parts.push("");
	}

	const title = block.title ?? `Block ${block.id}`;
	parts.push(`# ${title}`);
	parts.push("");

	switch (block.class) {
		case "Text":
			parts.push(block.content ?? "");
			break;
		case "Image":
			if (block.image) {
				const embedUrl = resolveImageEmbedUrl(block);
				if (settings.imageHandling === "download") {
					const ref = context.assetPath ?? block.image.filename;
					parts.push(`![[${ref}]]`);
				} else if (settings.imageHandling === "embed") {
					if (embedUrl) {
						parts.push(`![${title}](${embedUrl})`);
					}
				} else if (embedUrl) {
					parts.push(`[${title}](${embedUrl})`);
				}
			}
			break;
		case "Link":
			if (block.source?.url) {
				const source = normalizeArenaUrl(block.source.url);
				parts.push(`[${block.source.title || source}](${source})`);
			}
			if (block.description) {
				parts.push("");
				parts.push(block.description);
			}
			break;
		case "Media":
			if (block.source?.url) {
				parts.push(`<${normalizeArenaUrl(block.source.url)}>`);
			}
			break;
		case "Attachment":
			if (block.attachment) {
				if (context.assetPath && settings.attachmentHandling === "download") {
					if (settings.downloadedAttachmentLinkStyle === "embed") {
						parts.push(`![[${context.assetPath}]]`);
					} else {
						parts.push(`[[${context.assetPath}|${block.attachment.file_name}]]`);
					}
				} else {
					parts.push(`[${block.attachment.file_name}](${block.attachment.url})`);
				}
			}
			break;
	}

	if (block.description && block.class !== "Link") {
		parts.push("");
		parts.push("---");
		parts.push("");
		parts.push(block.description);
	}

	parts.push("");
	return parts.join("\n");
}

export function resolveAttachmentBaseFolder(
	settings: ArenaSyncSettings,
	mapping: ChannelMapping
): string {
	const storage: AttachmentStorage =
		mapping.attachmentStorageOverride ?? settings.attachmentStorage;
	switch (storage) {
		case "channel":
			return normalizePath(`${mapping.localFolder}/_attachments`);
		case "custom":
			return normalizePath(
				mapping.customAttachmentFolderOverride ||
					settings.customAttachmentFolder ||
					settings.globalAttachmentFolder
			);
		case "global":
		default:
			return normalizePath(settings.globalAttachmentFolder);
	}
}

export function markdownToBlockContent(md: string): {
	title: string;
	content: string;
} {
	let body = md;

	if (body.startsWith("---")) {
		const end = body.indexOf("---", 3);
		if (end !== -1) {
			body = body.slice(end + 3).trimStart();
		}
	}

	let title = "";
	const h1 = body.match(/^# (.+)$/m);
	if (h1) {
		title = h1[1].trim();
		body = body.replace(h1[0], "").trimStart();
	}

	body = body.replace(/\n---\s*$/g, "").trimEnd();

	return { title, content: body };
}

export function computeHash(input: string): string {
	return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 16);
}

export function sanitiseFilename(name: string): string {
	return name
		// eslint-disable-next-line no-control-regex
		.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
		.replace(/\s+/g, " ")
		.trim();
}

export function blockFileName(
	block: ArenaBlock,
	scheme: "title" | "id" | "title-id"
): string {
	const safeTitle = sanitiseFilename(block.title ?? `Block ${block.id}`);
	switch (scheme) {
		case "title":
			return `${safeTitle}.md`;
		case "id":
			return `${block.id}.md`;
		case "title-id":
			return `${safeTitle} (${block.id}).md`;
	}
}
