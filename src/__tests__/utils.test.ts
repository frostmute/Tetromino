import {
	blockFileName,
	blockToMarkdown,
	computeHash,
	markdownToBlockContent,
	normalizeArenaUrl,
	sanitiseFilename,
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
		expect(md).toContain("![Test Block](https://cdn.are.na/photo.jpg)");
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
	it("converts api block URLs to web URLs", () => {
		expect(normalizeArenaUrl("https://api.are.na/v2/blocks/12345")).toBe(
			"https://www.are.na/block/12345"
		);
	});

	it("leaves external URLs unchanged", () => {
		expect(normalizeArenaUrl("https://example.com")).toBe("https://example.com");
	});
});
