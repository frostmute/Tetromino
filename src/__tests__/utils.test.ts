import {
	blockFileName,
	blockToMarkdown,
	computeHash,
	markdownToBlockContent,
	normalizeArenaUrl,
	resolveChannelFolder,
	resolveAttachmentBaseFolder,
	sanitiseFilename,
	pMap,
} from "../utils";
import type {ArenaBlock, ArenaSyncSettings} from "../types";
import {DEFAULT_SETTINGS} from "../types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeBlock(overrides: Partial<ArenaBlock> = {}): ArenaBlock {
	return {
		id: 12345,
		title: "Test Block",
		content: "Hello world",
		content_html: "<p>Hello world</p>",
		description: null,
		description_html: null,
		source: null,
		image: null,
		attachment: null,
		class: "Text",
		base_class: "Block",
		created_at: "2026-01-15T10:00:00.000Z",
		updated_at: "2026-01-16T12:00:00.000Z",
		connected_at: "2026-01-15T10:00:00.000Z",
		position: 1,
		user: {
			id: 1,
			slug: "testuser",
			username: "testuser",
			first_name: "Test",
			last_name: "User",
			avatar: "",
			channel_count: 5,
		},
		...overrides,
	};
}

/* ------------------------------------------------------------------ */
/*  blockToMarkdown                                                   */
/* ------------------------------------------------------------------ */

describe("blockToMarkdown", () => {
	const settings: ArenaSyncSettings = { ...DEFAULT_SETTINGS };

	it("converts a text block with front-matter", () => {
		const md = blockToMarkdown(makeBlock(), settings);
		expect(md).toContain("---");
		expect(md).toContain("arena_id: 12345");
		expect(md).toContain('arena_class: "Text"');
		expect(md).toContain("# Test Block");
		expect(md).toContain("Hello world");
	});

	it("omits front-matter when disabled", () => {
		const s = { ...settings, frontmatterEnabled: false };
		const md = blockToMarkdown(makeBlock(), s);
		expect(md).not.toContain("---\narena_id");
		expect(md).toContain("# Test Block");
	});

	it("handles a link block", () => {
		const block = makeBlock({
			class: "Link",
			content: null,
			source: { url: "https://example.com", title: "Example" },
			description: "A description",
		});
		const md = blockToMarkdown(block, settings);
		expect(md).toContain("[Example](https://example.com)");
		expect(md).toContain("A description");
	});

	it("handles an image block with external link", () => {
		const block = makeBlock({
			class: "Image",
			content: null,
			image: {
				filename: "photo.jpg",
				content_type: "image/jpeg",
				original: { url: "https://cdn.are.na/photo.jpg" },
				display: { url: "https://cdn.are.na/photo_display.jpg" },
				thumb: { url: "https://cdn.are.na/photo_thumb.jpg" },
			},
		});
		const s = { ...settings, imageHandling: "link" as const };
		const md = blockToMarkdown(block, s);
		expect(md).toContain("[Test Block](https://cdn.are.na/photo_display.jpg)");
	});

	it("embeds image blocks using Are.na display image in embed mode", () => {
		const block = makeBlock({
			class: "Image",
			content: null,
			image: {
				filename: "photo.jpg",
				content_type: "image/jpeg",
				original: { url: "https://cdn.are.na/photo.jpg" },
				display: { url: "https://cdn.are.na/photo_display.jpg" },
				thumb: { url: "https://cdn.are.na/photo_thumb.jpg" },
			},
		});
		const s = { ...settings, imageHandling: "embed" as const };
		const md = blockToMarkdown(block, s);
		expect(md).toContain("![Test Block](https://cdn.are.na/photo_display.jpg)");
	});

	it("handles an attachment block", () => {
		const block = makeBlock({
			class: "Attachment",
			content: null,
			attachment: {
				file_name: "notes.pdf",
				file_size: 1024,
				url: "https://cdn.are.na/notes.pdf",
				content_type: "application/pdf",
				extension: "pdf",
			},
		});
		const md = blockToMarkdown(block, settings);
		expect(md).toContain("[notes.pdf](https://cdn.are.na/notes.pdf)");
	});

	it("falls back to Block ID when title is null", () => {
		const block = makeBlock({ title: null });
		const md = blockToMarkdown(block, settings);
		expect(md).toContain("# Block 12345");
	});

	it("adds optional banner frontmatter field when enabled", () => {
		const block = makeBlock({
			class: "Image",
			content: null,
			image: {
				filename: "photo.jpg",
				content_type: "image/jpeg",
				original: { url: "https://cdn.are.na/photo.jpg" },
				display: { url: "https://cdn.are.na/photo_display.jpg" },
				thumb: { url: "https://cdn.are.na/photo_thumb.jpg" },
			},
		});
		const s = {
			...settings,
			bannerFieldEnabled: true,
			bannerFieldName: "banner",
		};
		const md = blockToMarkdown(block, s);
		expect(md).toContain('banner: "https://cdn.are.na/photo_thumb.jpg"');
	});

	it("can include block description in frontmatter", () => {
		const block = makeBlock({ description: "Short summary" });
		const s = {
			...settings,
			includeBlockDescriptionFrontmatter: true,
		};
		const md = blockToMarkdown(block, s);
		expect(md).toContain('arena_description: "Short summary"');
	});

	it("supports display-first banner priority", () => {
		const block = makeBlock({
			class: "Image",
			content: null,
			image: {
				filename: "photo.jpg",
				content_type: "image/jpeg",
				original: { url: "https://cdn.are.na/photo.jpg" },
				display: { url: "https://cdn.are.na/photo_display.jpg" },
				thumb: { url: "https://cdn.are.na/photo_thumb.jpg" },
			},
		});
		const s = {
			...settings,
			bannerFieldEnabled: true,
			bannerFieldName: "banner",
			bannerImagePriority: "display-first" as const,
		};
		const md = blockToMarkdown(block, s);
		expect(md).toContain('banner: "https://cdn.are.na/photo_display.jpg"');
	});

	it("renders comments and connected channels sections from context", () => {
		const block = makeBlock({ class: "Channel", content: null });
		const md = blockToMarkdown(block, settings, {
			bodyImageUrl: "https://cdn.are.na/channel-preview.jpg",
			connectedChannels: [
				{ title: "A Library", slug: "a-library" },
				{ title: "Read", slug: "read" },
			],
			comments: [
				{
					author: "testuser",
					createdAt: "2026-03-30T00:00:00.000Z",
					body: "Great channel",
				},
			],
		});
		expect(md).toContain("![Test Block](https://cdn.are.na/channel-preview.jpg)");
		expect(md).toContain("## This Block Also Appears In");
		expect(md).toContain("[A Library](https://www.are.na/channel/a-library)");
		expect(md).toContain("## Comments");
		expect(md).toContain("Great channel");
	});
});

/* ------------------------------------------------------------------ */
/*  blockToMarkdown with templateEnabled                              */
/* ------------------------------------------------------------------ */

describe("blockToMarkdown with templateEnabled", () => {
	const base: ArenaSyncSettings = {
		...DEFAULT_SETTINGS,
		templateEnabled: true,
		templateString: "---\ntitle: {{title}}\narena_id: {{id}}\n---\n\n{{content}}",
	};

	it("renders via template when templateEnabled is true", () => {
		const block = makeBlock({ title: "My Block", content: "Hello" });
		const md = blockToMarkdown(block, base);
		expect(md).toContain("title: My Block");
		expect(md).toContain("arena_id: 12345");
		expect(md).toContain("Hello");
	});

	it("falls back to legacy path when templateEnabled is false", () => {
		const s = { ...base, templateEnabled: false };
		const md = blockToMarkdown(makeBlock(), s);
		expect(md).toContain("arena_id: 12345");
		expect(md).toContain("# Test Block");
	});

	it("template: #if guard works for optional description", () => {
		const tmpl = "{{#if description}}desc: {{description}}{{/if}}";
		const s = { ...base, templateString: tmpl };
		expect(blockToMarkdown(makeBlock({ description: "Cool" }), s)).toContain("desc: Cool");
		expect(blockToMarkdown(makeBlock({ description: null }), s)).toBe("");
	});

	it("template: image block sets image variable with download path", () => {
		const block = makeBlock({
			class: "Image",
			content: null,
			image: {
				filename: "photo.jpg",
				content_type: "image/jpeg",
				original: { url: "https://cdn.are.na/photo.jpg" },
				display: { url: "https://cdn.are.na/photo_display.jpg" },
				thumb: { url: "https://cdn.are.na/photo_thumb.jpg" },
			},
		});
		const s = { ...base, templateString: "{{image}}", imageHandling: "download" as const };
		const md = blockToMarkdown(block, s, { assetPath: "Are.na/Attachments/12345-photo.jpg" });
		expect(md).toBe("Are.na/Attachments/12345-photo.jpg");
	});

	it("template: preserves YAML frontmatter and sanitizes body", () => {
		const tmpl = "---\ntitle: {{title}}\n---\n\n{{content}}";
		const s = { ...base, templateString: tmpl };
		const block = makeBlock({ content: "<script>evil()</script>safe" });
		const md = blockToMarkdown(block, s);
		expect(md).toContain("title: Test Block");
		expect(md).not.toContain("<script>");
		expect(md).toContain("safe");
	});
});

/* ------------------------------------------------------------------ */
/*  markdownToBlockContent                                            */
/* ------------------------------------------------------------------ */

describe("markdownToBlockContent", () => {
	it("strips front-matter and extracts title", () => {
		const md = [
			"---",
			"arena-id: 99",
			"---",
			"",
			"# My Title",
			"",
			"Body text here.",
		].join("\n");
		const { title, content } = markdownToBlockContent(md);
		expect(title).toBe("My Title");
		expect(content).toBe("Body text here.");
	});

	it("handles content without front-matter", () => {
		const md = "# Solo\n\nJust content.";
		const { title, content } = markdownToBlockContent(md);
		expect(title).toBe("Solo");
		expect(content).toBe("Just content.");
	});
});

/* ------------------------------------------------------------------ */
/*  computeHash                                                       */
/* ------------------------------------------------------------------ */

describe("computeHash", () => {
	it("returns a 16-char hex string", () => {
		const h = computeHash("test");
		expect(h).toMatch(/^[0-9a-f]{16}$/);
	});

	it("is deterministic", () => {
		expect(computeHash("abc")).toBe(computeHash("abc"));
	});

	it("differs for different inputs", () => {
		expect(computeHash("a")).not.toBe(computeHash("b"));
	});
});

/* ------------------------------------------------------------------ */
/*  sanitiseFilename                                                  */
/* ------------------------------------------------------------------ */

describe("sanitiseFilename", () => {
	it("replaces forbidden characters", () => {
		expect(sanitiseFilename('a<b>c:d"e')).toBe("a_b_c_d_e");
	});

	it("collapses whitespace", () => {
		expect(sanitiseFilename("hello   world")).toBe("hello world");
	});

	it("replaces exact dots to prevent directory traversal", () => {
		expect(sanitiseFilename(".")).toBe("_");
		expect(sanitiseFilename("..")).toBe("__");
		expect(sanitiseFilename("...")).toBe("___");
		expect(sanitiseFilename("hello.md")).toBe("hello.md"); // Normal extensions should work
	});
});

/* ------------------------------------------------------------------ */
/*  blockFileName                                                     */
/* ------------------------------------------------------------------ */

describe("blockFileName", () => {
	const block = makeBlock();

	it("title scheme", () => {
		expect(blockFileName(block, "title")).toBe("Test Block.md");
	});

	it("id scheme", () => {
		expect(blockFileName(block, "id")).toBe("12345.md");
	});

	it("title-id scheme", () => {
		expect(blockFileName(block, "title-id")).toBe("Test Block (12345).md");
	});
});

describe("normalizeArenaUrl", () => {
	it("converts v2 api block URLs to web URLs", () => {
		expect(normalizeArenaUrl("https://api.are.na/v2/blocks/12345")).toBe(
			"https://www.are.na/block/12345"
		);
	});

	it("converts v3 api block URLs to web URLs", () => {
		expect(normalizeArenaUrl("https://api.are.na/v3/blocks/12345")).toBe(
			"https://www.are.na/block/12345"
		);
	});

	it("leaves external URLs unchanged", () => {
		expect(normalizeArenaUrl("https://example.com")).toBe("https://example.com");
	});
});

describe("resolveChannelFolder", () => {
	it("uses default Are.na/<slug> when local folder is blank", () => {
		expect(
			resolveChannelFolder({
				channelSlug: "rad-readings",
				channelId: 0,
				channelTitle: "",
				localFolder: "",
				lastSyncedAt: null,
				enabled: true,
			}),
		).toBe("Are.na/rad-readings");
	});

	it("uses explicit local folder when provided", () => {
		expect(
			resolveChannelFolder({
				channelSlug: "rad-readings",
				channelId: 0,
				channelTitle: "",
				localFolder: "Custom/Wherever",
				lastSyncedAt: null,
				enabled: true,
			}),
		).toBe("Custom/Wherever");
	});
});

/* ------------------------------------------------------------------ */
/*  resolveAttachmentBaseFolder,                                       */
/* ------------------------------------------------------------------ */

describe("resolveAttachmentBaseFolder,", () => {
	const baseSettings = { ...DEFAULT_SETTINGS };
	const baseMapping = {
		channelSlug: "test-channel",
		channelId: 1,
		channelTitle: "Test Channel",
		localFolder: "",
		lastSyncedAt: null,
		enabled: true,
	};

	it("uses global attachment folder by default (global mode)", () => {
		const result = resolveAttachmentBaseFolder(baseSettings, baseMapping);
		expect(result).toBe("Are.na/Attachments");
	});

	it("uses channel folder + _attachments when storage is channel", () => {
		const s = { ...baseSettings, attachmentStorage: "channel" as const };
		const result = resolveAttachmentBaseFolder(s, baseMapping);
		expect(result).toBe("Are.na/test-channel/_attachments");
	});

	it("uses explicit local folder + _attachments when storage is channel", () => {
		const s = { ...baseSettings, attachmentStorage: "channel" as const };
		const m = { ...baseMapping, localFolder: "Custom/Path" };
		const result = resolveAttachmentBaseFolder(s, m);
		expect(result).toBe("Custom/Path/_attachments");
	});

	it("uses custom attachment folder when storage is custom", () => {
		const s = {
			...baseSettings,
			attachmentStorage: "custom" as const,
			customAttachmentFolder: "Custom/Assets",
		};
		const result = resolveAttachmentBaseFolder(s, baseMapping);
		expect(result).toBe("Custom/Assets");
	});

	it("falls back to global folder if custom storage has no folder defined", () => {
		const s = {
			...baseSettings,
			attachmentStorage: "custom" as const,
			customAttachmentFolder: "", // empty
		};
		const result = resolveAttachmentBaseFolder(s, baseMapping);
		expect(result).toBe("Are.na/Attachments");
	});

	it("uses mapping override for attachment storage", () => {
		// Global setting is 'global', but mapping overrides to 'channel'
		const m = {
			...baseMapping,
			attachmentStorageOverride: "channel" as const,
		};
		const result = resolveAttachmentBaseFolder(baseSettings, m);
		expect(result).toBe("Are.na/test-channel/_attachments");
	});

	it("uses mapping override for custom attachment folder", () => {
		const s = {
			...baseSettings,
			attachmentStorage: "custom" as const,
			customAttachmentFolder: "Default/Custom",
		};
		const m = {
			...baseMapping,
			attachmentStorageOverride: "custom" as const,
			customAttachmentFolderOverride: "Specific/Override",
		};
		const result = resolveAttachmentBaseFolder(s, m);
		expect(result).toBe("Specific/Override");
	});
});

/* ------------------------------------------------------------------ */
/*  pMap                                                              */
/* ------------------------------------------------------------------ */

describe("pMap", () => {
	it("maps items correctly and preserves order", async () => {
		const items = [1, 2, 3, 4, 5];
		const results = await pMap(items, 2, async (x) => {
			// Random delay to test order preservation
			await new Promise((r) => setTimeout(r, (5 - x) * 5));
			return x * 2;
		});
		expect(results).toEqual([2, 4, 6, 8, 10]);
	});

	it("respects the concurrency limit", async () => {
		const items = [1, 2, 3, 4, 5];
		let active = 0;
		let maxActive = 0;
		const limit = 2;

		await pMap(items, limit, async (x) => {
			active++;
			maxActive = Math.max(maxActive, active);
			await new Promise((r) => setTimeout(r, 10));
			active--;
			return x;
		});

		expect(maxActive).toBe(limit);
	});

	it("handles an empty array", async () => {
		const results = await pMap([], 2, async (x) => x);
		expect(results).toEqual([]);
	});

	it("handles a limit larger than the number of items", async () => {
		const items = [1, 2, 3];
		const results = await pMap(items, 10, async (x) => x);
		expect(results).toEqual([1, 2, 3]);
	});

	it("propagates errors from the mapping function and halts further execution", async () => {
		const items = [1, 2, 3, 4];
		const executed: number[] = [];
		const pMapPromise = pMap(items, 2, async (x) => {
			executed.push(x);
			if (x === 1) {
				throw new Error("Test error");
			}
			return x;
		});

		await expect(pMapPromise).rejects.toThrow("Test error");

		// Wait briefly to ensure no background tasks are unexpectedly spawned/run
		await new Promise((r) => setTimeout(r, 10));
		expect(executed).not.toContain(3);
		expect(executed).not.toContain(4);
	});
});
