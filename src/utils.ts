import { createHash } from "crypto";
import type { ArenaBlock, ArenaSyncSettings } from "./types";

/**
 * Convert an Are.na block into a Markdown string suitable for Obsidian.
 */
export function blockToMarkdown(
	block: ArenaBlock,
	settings: ArenaSyncSettings
): string {
	const parts: string[] = [];

	// --- Front-matter --------------------------------------------------
	if (settings.frontmatterEnabled) {
		parts.push("---");
		for (const field of settings.frontmatterFields) {
			switch (field) {
				case "arena-id":
					parts.push(`arena-id: ${block.id}`);
					break;
				case "arena-channel":
					// Populated by caller context; omitted here
					break;
				case "arena-class":
					parts.push(`arena-class: ${block.class}`);
					break;
				case "arena-source":
					if (block.source?.url) {
						parts.push(`arena-source: "${block.source.url}"`);
					}
					break;
				case "arena-created":
					parts.push(`arena-created: ${block.created_at}`);
					break;
				case "arena-updated":
					parts.push(`arena-updated: ${block.updated_at}`);
					break;
			}
		}
		parts.push("---");
		parts.push("");
	}

	// --- Title ---------------------------------------------------------
	const title = block.title ?? `Block ${block.id}`;
	parts.push(`# ${title}`);
	parts.push("");

	// --- Body by block class -------------------------------------------
	switch (block.class) {
		case "Text":
			parts.push(block.content ?? "");
			break;

		case "Image":
			if (block.image) {
				if (settings.imageHandling === "link") {
					parts.push(`![${title}](${block.image.original.url})`);
				} else if (settings.imageHandling === "embed") {
					parts.push(`![[${block.image.filename}]]`);
				} else {
					// download — handled by sync engine; leave embed placeholder
					parts.push(`![[${sanitiseFilename(block.image.filename)}]]`);
				}
			}
			break;

		case "Link":
			if (block.source?.url) {
				parts.push(
					`[${block.source.title || block.source.url}](${block.source.url})`
				);
			}
			if (block.description) {
				parts.push("");
				parts.push(block.description);
			}
			break;

		case "Media":
			if (block.source?.url) {
				parts.push(`<${block.source.url}>`);
			}
			break;

		case "Attachment":
			if (block.attachment) {
				parts.push(
					`📎 [${block.attachment.file_name}](${block.attachment.url})`
				);
			}
			break;
	}

	// --- Description (if present & not already included) ----------------
	if (block.description && block.class !== "Link") {
		parts.push("");
		parts.push("---");
		parts.push("");
		parts.push(block.description);
	}

	parts.push("");
	return parts.join("\n");
}

/**
 * Extract the plain-text body from a synced Markdown note so it can
 * be pushed back to Are.na as block content.
 */
export function markdownToBlockContent(md: string): {
	title: string;
	content: string;
} {
	let body = md;

	// Strip front-matter
	if (body.startsWith("---")) {
		const end = body.indexOf("---", 3);
		if (end !== -1) {
			body = body.slice(end + 3).trimStart();
		}
	}

	// Extract first H1 as title
	let title = "";
	const h1 = body.match(/^# (.+)$/m);
	if (h1) {
		title = h1[1].trim();
		body = body.replace(h1[0], "").trimStart();
	}

	// Strip trailing horizontal rules used as separators
	body = body.replace(/\n---\s*$/g, "").trimEnd();

	return { title, content: body };
}

/**
 * Deterministic SHA-256 hash of a string (hex, first 16 chars).
 */
export function computeHash(input: string): string {
	return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 16);
}

/**
 * Turn an arbitrary filename into something safe for the local filesystem.
 */
export function sanitiseFilename(name: string): string {
	return name
		.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Build a note filename from a block according to the naming scheme.
 */
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
