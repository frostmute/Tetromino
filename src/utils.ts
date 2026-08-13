import { renderTemplate, parseTemplate } from "./templateUtils";
import { sanitizeMarkdownContent } from "./securityUtils";
import { normalizePath } from "obsidian";
import type {
	AttachmentStorage,
	ArenaBlock,
	ArenaSyncSettings,
	ChannelMapping,
} from "./types";

const FRONTMATTER_REGEX = /^(---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$))([\s\S]*)$/;

export interface MarkdownContext {
	channelSlug?: string;
	channelTitle?: string;
	assetPath?: string;
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
}

export function resolveChannelFolder(mapping: ChannelMapping): string {
	const explicit = mapping.localFolder?.trim();
	if (explicit) {
		return normalizePath(explicit);
	}
	const slug = mapping.channelSlug?.trim();
	return normalizePath(slug ? `Are.na/${slug}` : "Are.na");
}

function yamlQuote(value: string): string {
	return JSON.stringify(value);
}

type ImageUrlPriority = "thumb-first" | "display-first" | "original-first";
type ImageVariant = "small" | "medium" | "large" | "src";

const IMAGE_URL_ORDER: Record<ImageUrlPriority, ImageVariant[]> = {
	"thumb-first": ["small", "medium", "src", "large"],
	"display-first": ["medium", "large", "small", "src"],
	"original-first": ["src", "large", "medium", "small"],
};

export function resolveImageUrl(
	block: ArenaBlock,
	priority: ImageUrlPriority = "display-first",
): string | null {
	const image = block.image;
	if (!image) return null;

	for (const variant of IMAGE_URL_ORDER[priority]) {
		const url = variant === "src" ? image.src : image[variant]?.src;
		if (url) return url;
	}
	return null;
}

function sanitizeMarkdownOutput(markdown: string): string {
	const frontmatter = FRONTMATTER_REGEX.exec(markdown);
	if (frontmatter) {
		return frontmatter[1] + sanitizeMarkdownContent(frontmatter[2]);
	}
	return sanitizeMarkdownContent(markdown);
}

function descriptionMarkdown(block: ArenaBlock): string {
	return block.description?.markdown?.trim() ?? "";
}

/** Render the complete block body shared by legacy and template output. */
function renderBlockContent(
	block: ArenaBlock,
	settings: ArenaSyncSettings,
	context: MarkdownContext,
): string {
	const title = block.title ?? `Block ${block.id}`;
	const body: string[] = [];
	const content =
		typeof block.content === "object" &&
		block.content &&
		typeof block.content.markdown === "string" &&
		block.content.markdown.trim()
			? block.content.markdown.trim()
			: null;
	const source = block.source?.url ? normalizeArenaUrl(block.source.url) : null;
	let representation = "";

	if (block.type === "Image" && block.image) {
		const imageUrl = resolveImageUrl(block);
		if (settings.imageHandling === "download") {
			const asset = context.assetPath || (imageUrl ? block.image.filename : null);
			if (asset) representation = `![[${asset}]]`;
		} else if (imageUrl && settings.imageHandling === "embed") {
			representation = `![${title}](${imageUrl})`;
		} else if (imageUrl) {
			representation = `[${title}](${imageUrl})`;
		}
	} else if (block.type === "Link" && source) {
		representation = `[${block.source?.title || source}](${source})`;
	} else if (block.type === "Embed") {
		const embedUrl = block.embed?.url ?? source;
		if (embedUrl) {
			representation = `<${embedUrl}>`;
		}
	} else if (block.type === "Attachment" && block.attachment) {
		const fileName = block.attachment.filename;
		if (context.assetPath && settings.attachmentHandling === "download") {
			representation = settings.downloadedAttachmentLinkStyle === "embed"
				? `![[${context.assetPath}]]`
				: `[[${context.assetPath}|${fileName}]]`;
		} else {
			representation = `[${fileName}](${block.attachment.url})`;
		}
	}

	if (context.bodyImageUrl && block.type !== "Image") {
		body.push(`![${title}](${context.bodyImageUrl})`);
	}
	if (representation && block.type === "Image") body.push(representation);
	if (content) body.push(content);
	if (representation && block.type !== "Image") body.push(representation);
	return body.join("\n\n");
}

export function normalizeArenaUrl(url: string): string {
	if (!url) return url;
	try {
		const parsed = new URL(url);
		if (parsed.hostname === "api.are.na") {
			const path = parsed.pathname.replace(/^\/v\d+/, "");
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
	const descriptionString = descriptionMarkdown(block);

	if (settings.templateEnabled && settings.templateString) {
		const ast = parseTemplate(settings.templateString);
		const vars: Record<string, unknown> = {
			id: block.id,
			title: block.title ?? `Block ${block.id}`,
			type: block.type,
			arena_url: `https://www.are.na/block/${block.id}`,
			description: descriptionString,
			created_at: block.created_at,
			updated_at: block.updated_at,
			source_url: block.source?.url ? normalizeArenaUrl(block.source.url) : "",
			channel_slug: context.channelSlug || "",
			channel_title: context.channelTitle || ""
		};

		vars.content = renderBlockContent(block, settings, context);
		vars.comments = context.comments || [];
		vars.connected_channels = context.connectedChannels || [];

		if (block.type === "Image" && block.image) {
			const embedUrl = resolveImageUrl(block);
			if (settings.imageHandling === "download" && context.assetPath) {
				vars.image = context.assetPath;
			} else if (settings.imageHandling === "embed" && embedUrl) {
				vars.image = embedUrl;
			} else if (embedUrl) {
				vars.image = embedUrl;
			}
		} else if (context.bodyImageUrl) {
			vars.image = context.bodyImageUrl;
		}

		if (settings.bannerFieldEnabled) {
			const bannerValue = context.bannerImageUrl || resolveImageUrl(block, settings.bannerImagePriority);
			if (bannerValue) {
				vars[settings.bannerFieldName.trim() || "banner"] = bannerValue;
			}
		}

		return sanitizeMarkdownOutput(renderTemplate(ast, vars));
	}

	// Legacy hardcoded logic

	const parts: string[] = [];

	if (settings.frontmatterEnabled) {
		parts.push("---");
		parts.push(`arena_id: ${block.id}`);
		parts.push(`arena_url: ${yamlQuote(`https://www.are.na/block/${block.id}`)}`);
		parts.push(`arena_type: ${yamlQuote(block.type)}`);
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
		if (settings.includeBlockDescriptionFrontmatter && descriptionString) {
			parts.push(`arena_description: ${yamlQuote(descriptionString)}`);
		}
		if (settings.bannerFieldEnabled) {
			const bannerValue =
				context.bannerImageUrl ||
				resolveImageUrl(block, settings.bannerImagePriority);
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

	const renderedBody = renderBlockContent(block, settings, context);
	if (renderedBody) {
		parts.push(renderedBody);
	}

	if (block.type === "Link" && descriptionString) {
		parts.push("");
		parts.push(descriptionString);
	}

	if (descriptionString && block.type !== "Link") {
		parts.push("");
		parts.push("---");
		parts.push("");
		parts.push(descriptionString);
	}

	if (context.connectedChannels && context.connectedChannels.length > 0) {
		parts.push("");
		parts.push("## This Block Also Appears In");
		parts.push("");
		for (const ch of context.connectedChannels) {
			if (ch.slug) {
				parts.push(`- [${ch.title}](https://www.are.na/channel/${ch.slug})`);
			} else {
				parts.push(`- ${ch.title}`);
			}
		}
	}

	if (context.comments && context.comments.length > 0) {
		parts.push("");
		parts.push("## Comments");
		parts.push("");
		for (const comment of context.comments) {
			const prefix = comment.createdAt
				? `- **${comment.author}** (${comment.createdAt})`
				: `- **${comment.author}**`;
			parts.push(`${prefix}: ${comment.body}`);
		}
	}

	parts.push("");
	return sanitizeMarkdownOutput(parts.join("\n"));
}

export function resolveAttachmentBaseFolder(
	settings: ArenaSyncSettings,
	mapping: ChannelMapping
): string {
	const storage: AttachmentStorage =
		mapping.attachmentStorageOverride ?? settings.attachmentStorage;
	switch (storage) {
		case "channel":
			return normalizePath(`${resolveChannelFolder(mapping)}/_attachments`);
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
	const h1Match = /^# (.+)$/m.exec(body);
	if (h1Match) {
		title = h1Match[1].trim();
		body = body.replace(h1Match[0], "").trimStart();
	}

	body = body.replace(/\n---\s*$/g, "").trimEnd();

	return { title, content: body };
}

export async function computeHash(input: string): Promise<string> {
	// Use Web Crypto `subtle.digest`. Available in both Electron (desktop)
	// and Capacitor (mobile) renderers without any node-integration dance.
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", data);
	const bytes = new Uint8Array(digest);
	let hex = "";
	for (const b of bytes) hex += b.toString(16).padStart(2, "0");
	return hex.slice(0, 16);
}

export function sanitiseFilename(name: string): string {
	const sanitised = name
		// eslint-disable-next-line no-control-regex -- sanitizer for filenames that may carry control bytes (U+0000–U+001F) from upstream sources
		.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
		.replace(/\s+/g, " ")
		.trim();
	if (/^\.+$/.test(sanitised)) {
		return sanitised.replace(/\./g, "_");
	}
	return sanitised;
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


export async function pMap<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	if (items.length === 0) return [];
	const results = new Array<R | undefined>(items.length);
	let i = 0;
	let hasFailed = false;
	let firstError: unknown;

	const workers = Array.from({ length: Math.min(items.length, limit) }, async () => {
		while (!hasFailed) {
			const index = i++;
			if (index >= items.length) return;
			try {
				results[index] = await fn(items[index]);
			} catch (err) {
				if (!hasFailed) {
					hasFailed = true;
					firstError = err;
				}
				return;
			}
		}
	});

	await Promise.all(workers);
	if (hasFailed) throw firstError;
	// Ponytail: results is (R | undefined)[] because slots may not have been
	// written by workers before they exited. Filter undefined entries before
	// returning; the contract is that every input maps to a defined R.
	return results.filter((r): r is R => r !== undefined);
}
