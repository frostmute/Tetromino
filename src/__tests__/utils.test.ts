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

/* ------------------------------------------------------------------ */
/*  normalizeArenaUrl edge cases                                      */
/* ------------------------------------------------------------------ */

describe("normalizeArenaUrl edge cases", () => {
	it("returns empty string unchanged", () => {
		expect(normalizeArenaUrl("")).toBe("");
	});

	it("returns invalid URL unchanged", () => {
		expect(normalizeArenaUrl("not-a-url")).toBe("not-a-url");
	});

	it("leaves non-api are.na URLs unchanged", () => {
		expect(normalizeArenaUrl("https://www.are.na/channel/test")).toBe(
			"https://www.are.na/channel/test"
		);
	});

	it("converts api user URLs", () => {
		expect(normalizeArenaUrl("https://api.are.na/v2/users/testuser")).toBe(
			"https://www.are.na/user/testuser"
		);
	});
});

/* ------------------------------------------------------------------ */
/*  blockToMarkdown legacy path – uncovered branches                  */
/* ------------------------------------------------------------------ */

describe("blockToMarkdown legacy uncovered branches", () => {
	const settings: ArenaSyncSettings = { ...DEFAULT_SETTINGS };

	it("renders Media block with source URL", () => {
		const block = makeBlock({
			class: "Media",
			content: null,
			source: { url: "https://youtube.com/watch?v=123", title: "Video" },
		});
		const md = blockToMarkdown(block, settings);
		expect(md).toContain("<https://youtube.com/watch?v=123>");
	});

	it("renders Link block without source title", () => {
		const block = makeBlock({
			class: "Link",
			content: null,
			source: { url: "https://example.com", title: "" },
		});
		const md = blockToMarkdown(block, settings);
		expect(md).toContain("[https://example.com](https://example.com)");
	});

	it("renders Link block without description", () => {
		const block = makeBlock({
			class: "Link",
			content: null,
			source: { url: "https://example.com", title: "Example" },
			description: null,
		});
		const md = blockToMarkdown(block, settings);
		expect(md).toContain("[Example](https://example.com)");
		expect(md).not.toContain("---\n\nA description");
	});

	it("renders connected channel without slug", () => {
		const block = makeBlock({ class: "Channel", content: null });
		const md = blockToMarkdown(block, settings, {
			connectedChannels: [{ title: "No Slug Channel", slug: undefined }],
		});
		expect(md).toContain("- No Slug Channel");
		expect(md).not.toContain("[No Slug Channel]");
	});

	it("renders comment without createdAt", () => {
		const block = makeBlock();
		const md = blockToMarkdown(block, settings, {
			comments: [{ author: "anon", body: "Nice block" }],
		});
		expect(md).toContain("- **anon**: Nice block");
		expect(md).not.toContain("(");
	});

	it("renders Image block with no image data", () => {
		const block = makeBlock({ class: "Image", content: null, image: null });
		const md = blockToMarkdown(block, settings);
		expect(md).not.toContain("![");
	});

	it("renders Image block download with missing assetPath", () => {
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
		const s = { ...settings, imageHandling: "download" as const };
		const md = blockToMarkdown(block, s);
		expect(md).toContain("![[photo.jpg]]");
	});

	it("renders Attachment block download with embed style", () => {
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
		const s = {
			...settings,
			attachmentHandling: "download" as const,
			downloadedAttachmentLinkStyle: "embed" as const,
		};
		const md = blockToMarkdown(block, s, { assetPath: "Are.na/Attachments/notes.pdf" });
		expect(md).toContain("![[Are.na/Attachments/notes.pdf]]");
	});
});

/* ------------------------------------------------------------------ */
/*  blockToMarkdown template path – uncovered branches                */
/* ------------------------------------------------------------------ */

describe("blockToMarkdown template uncovered branches", () => {
	const base: ArenaSyncSettings = {
		...DEFAULT_SETTINGS,
		templateEnabled: true,
	};

	it("template: Link block renders markdown link", () => {
		const block = makeBlock({
			class: "Link",
			content: null,
			source: { url: "https://example.com", title: "Example" },
		});
		const s = { ...base, templateString: "{{content}}" };
		const md = blockToMarkdown(block, s);
		expect(md).toContain("[Example](https://example.com)");
	});

	it("template: Media block renders raw URL", () => {
		const block = makeBlock({
			class: "Media",
			content: null,
			source: { url: "https://vimeo.com/123", title: "Video" },
		});
		const s = { ...base, templateString: "{{content}}" };
		const md = blockToMarkdown(block, s);
		expect(md).toContain("<https://vimeo.com/123>");
	});

	it("template: Attachment block with download embed style", () => {
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
		const s = {
			...base,
			templateString: "{{content}}",
			attachmentHandling: "download" as const,
			downloadedAttachmentLinkStyle: "embed" as const,
		};
		const md = blockToMarkdown(block, s, { assetPath: "Attachments/notes.pdf" });
		expect(md).toBe("![[Attachments/notes.pdf]]");
	});

	it("template: Attachment block with download link style", () => {
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
		const s = {
			...base,
			templateString: "{{content}}",
			attachmentHandling: "download" as const,
			downloadedAttachmentLinkStyle: "link" as const,
		};
		const md = blockToMarkdown(block, s, { assetPath: "Attachments/notes.pdf" });
		expect(md).toBe("[[Attachments/notes.pdf|notes.pdf]]");
	});

	it("template: Attachment block without download falls back to URL", () => {
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
		const s = {
			...base,
			templateString: "{{content}}",
			attachmentHandling: "link" as const,
		};
		const md = blockToMarkdown(block, s);
		expect(md).toBe("[notes.pdf](https://cdn.are.na/notes.pdf)");
	});

	it("template: Image block with embed uses display URL", () => {
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
		const s = { ...base, templateString: "{{image}}", imageHandling: "embed" as const };
		const md = blockToMarkdown(block, s);
		expect(md).toBe("https://cdn.are.na/photo_display.jpg");
	});

	it("template: bodyImageUrl on non-Image block sets image var", () => {
		const block = makeBlock({ class: "Text", content: "Hello" });
		const s = { ...base, templateString: "{{image}}" };
		const md = blockToMarkdown(block, s, { bodyImageUrl: "https://cdn.are.na/preview.jpg" });
		expect(md).toBe("https://cdn.are.na/preview.jpg");
	});

	it("template: banner field enabled with custom name", () => {
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
			...base,
			templateString: "---\ncover: {{cover}}\n---",
			bannerFieldEnabled: true,
			bannerFieldName: "cover",
		};
		const md = blockToMarkdown(block, s);
		expect(md).toContain("cover: https://cdn.are.na/photo_thumb.jpg");
	});

	it("template: preserves frontmatter values that look dangerous (regression)", () => {
		const tmpl = "---\ntitle: {{title}}\nstyle_value: <style>body{color:red}</style>\n---\n\n{{content}}";
		const s = { ...base, templateString: tmpl };
		const block = makeBlock({ title: "Test", content: "<script>evil()</script>" });
		const md = blockToMarkdown(block, s);
		// Frontmatter should preserve literal tags; body should be sanitized
		expect(md).toContain("style_value: <style>body{color:red}</style>");
		expect(md).not.toContain("<script>");
		expect(md).not.toContain("evil()");
	});

	it("template: renders comments and connected channels (regression for dropped enrichment)", () => {
		const tmpl = "{{#each comments}}{{author}}: {{body}}\n{{/each}}{{#each connected_channels}}{{title}} {{/each}}";
		const s = { ...base, templateString: tmpl };
		const block = makeBlock({ title: "Test" });
		const md = blockToMarkdown(block, s, {
			comments: [
				{ author: "alice", body: "Nice!" },
				{ author: "bob", body: "Great!" },
			],
			connectedChannels: [
				{ title: "Channel A", slug: "channel-a" },
				{ title: "Channel B", slug: "channel-b" },
			],
		});
		expect(md).toContain("alice: Nice!");
		expect(md).toContain("bob: Great!");
		expect(md).toContain("Channel A");
		expect(md).toContain("Channel B");
	});
});

/* ------------------------------------------------------------------ */
/*  markdownToBlockContent edge cases                                 */
/* ------------------------------------------------------------------ */

describe("markdownToBlockContent edge cases", () => {
	it("handles content ending with horizontal rule", () => {
		const md = "# Title\n\nBody\n\n---";
		const { title, content } = markdownToBlockContent(md);
		expect(title).toBe("Title");
		expect(content).toBe("Body");
	});

	it("handles markdown without frontmatter but with h1", () => {
		const md = "# Hello\n\nWorld\n---";
		const { title, content } = markdownToBlockContent(md);
		expect(title).toBe("Hello");
		expect(content).toBe("World");
	});

	it("handles markdown without h1", () => {
		const md = "Just some content";
		const { title, content } = markdownToBlockContent(md);
		expect(title).toBe("");
		expect(content).toBe("Just some content");
	});
});

/* ------------------------------------------------------------------ */
/*  resolveChannelFolder edge cases                                   */
/* ------------------------------------------------------------------ */

describe("resolveChannelFolder edge cases", () => {
	it("falls back to Are.na when slug is missing", () => {
		expect(
			resolveChannelFolder({
				channelSlug: "",
				channelId: 0,
				channelTitle: "",
				localFolder: "",
				lastSyncedAt: null,
				enabled: true,
			}),
		).toBe("Are.na");
	});
});
