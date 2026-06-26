import { App, Vault, TFile, normalizePath } from "obsidian";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS, ArenaChannel, ArenaBlock, ChannelMapping } from "../types";
import { makeChannel, makeBlock } from "./fixtures";

jest.mock("obsidian", () => ({
	App: jest.fn(),
	Vault: jest.fn(),
	normalizePath: (path: string) => path.replace(/\\/g, "/").replace(/\/+/g, "/"),
	TFile: class TFile {
		path: string;
		name: string;
		basename: string;
		extension: string;
		stat: unknown;
		vault: unknown;
		parent: unknown;
		constructor() {
			this.path = "";
			this.name = "";
			this.basename = "";
			this.extension = "";
			this.stat = {};
			this.vault = null;
			this.parent = null;
		}
	},
}));

jest.mock("../api");

class MockTFile extends TFile {
	constructor(path: string) {
		super();
		this.path = path;
		this.name = path.split("/").pop() || path;
		this.basename = this.name.replace(/\.md$/, "");
		this.extension = path.endsWith(".md") ? "md" : path.split(".").pop() || "";
	}
}

class MockVault {
	files = new Map<string, { file: TFile; content: string; binary?: ArrayBuffer }>();
	folders = new Set<string>();

	getAbstractFileByPath(path: string): TFile | { path: string } | null {
		const normalized = normalizePath(path);
		const entry = this.files.get(normalized);
		if (entry) return entry.file;
		if (this.folders.has(normalized)) return { path: normalized };
		return null;
	}

	async read(file: TFile): Promise<string> {
		return this.files.get(file.path)?.content ?? "";
	}

	async create(path: string, content: string): Promise<TFile> {
		const normalized = normalizePath(path);
		const f = new MockTFile(normalized);
		this.files.set(normalized, { file: f, content });
		return f;
	}

	async createBinary(path: string, data: ArrayBuffer): Promise<TFile> {
		const normalized = normalizePath(path);
		const f = new MockTFile(normalized);
		this.files.set(normalized, { file: f, content: "", binary: data });
		return f;
	}

	async modify(file: TFile, content: string): Promise<void> {
		const entry = this.files.get(file.path);
		if (entry) entry.content = content;
	}

	async rename(file: TFile, newPath: string): Promise<void> {
		const oldPath = file.path;
		const entry = this.files.get(oldPath);
		if (entry) {
			this.files.delete(oldPath);
			const normalizedNew = normalizePath(newPath);
			entry.file.path = normalizedNew;
			entry.file.name = normalizedNew.split("/").pop() || normalizedNew;
			entry.file.basename = entry.file.name.replace(/\.md$/, "");
			this.files.set(normalizedNew, entry);
		}
	}

	async createFolder(path: string): Promise<void> {
		this.folders.add(normalizePath(path));
	}
}

describe("SyncEngine extended coverage", () => {
	let mockApp: App;
	let mockApi: jest.Mocked<ArenaApi>;
	let mockVault: MockVault;
	let defaultSettings: typeof DEFAULT_SETTINGS;

	beforeEach(() => {
		mockVault = new MockVault();
		mockApp = { vault: mockVault as unknown as Vault } as unknown as App;
		mockApi = new ArenaApi("test-token") as jest.Mocked<ArenaApi>;
		mockApi.getChannel = jest.fn();
		mockApi.getAllChannelBlocksWithProgress = jest.fn();
		mockApi.getBlock = jest.fn();
		mockApi.getChannelContents = jest.fn();
		mockApi.downloadBinary = jest.fn();

		defaultSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
		defaultSettings.channelMappings = [];
		defaultSettings.syncRecords = [];
	});

	function makeMapping(slug: string, folder = ""): ChannelMapping {
		return {
			channelSlug: slug,
			channelId: 0,
			channelTitle: "",
			localFolder: folder,
			lastSyncedAt: null,
			enabled: true,
		} as ChannelMapping;
	}

	async function runSync(mapping: ChannelMapping, options: { dryRun?: boolean } = {}) {
		const engine = new SyncEngine(mockApp, mockApi, defaultSettings);
		return engine.syncChannel(mapping, options);
	}

	describe("import flow and determinism", () => {
		it("creates notes for blocks and channel index", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const blocks = [makeBlock(1, { title: "Hello" }), makeBlock(2, { title: "World" })];
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);

			const mapping = makeMapping("test-channel");
			const result = await runSync(mapping);

			expect(result.created).toBe(2); // 2 blocks (index is not counted in created)
			expect(result.skipped).toBe(0);
			expect(mockVault.files.has("Are.na/test-channel/Hello.md")).toBe(true);
			expect(mockVault.files.has("Are.na/test-channel/World.md")).toBe(true);
			expect(mockVault.files.has("Are.na/test-channel/index.md")).toBe(true);
		});

		it("produces identical output on repeated import", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const blocks = [makeBlock(1, { title: "Hello", content: "Body" })];
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);
			const first = mockVault.files.get("Are.na/test-channel/Hello.md")?.content ?? "";

			// Reset settings syncRecords to simulate same input from scratch
			defaultSettings.syncRecords = [];
			const result2 = await runSync(mapping);
			const second = mockVault.files.get("Are.na/test-channel/Hello.md")?.content ?? "";

			expect(second).toBe(first);
			expect(result2.skipped).toBe(1);
		});
	});

	describe("dry-run preview", () => {
		it("does not modify vault but reports actions", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const blocks = [makeBlock(1, { title: "DryRun" })];
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);

			const mapping = makeMapping("test-channel");
			const result = await runSync(mapping, { dryRun: true });

			expect(result.dryRun).toBe(true);
			expect(result.created).toBe(1);
			expect(result.actions).toContain("create Are.na/test-channel/DryRun.md");
			expect(mockVault.files.has("Are.na/test-channel/DryRun.md")).toBe(false);
			expect(mockVault.folders.has("Are.na/test-channel")).toBe(false);
		});
	});

	describe("conflict resolution", () => {
		it("updates a note when remote content changed", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, { title: "Note", content: "Remote" });
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);

			// Simulate local edit
			const file = mockVault.files.get("Are.na/test-channel/Note.md")!;
			await mockVault.modify(file.file, "Local edit");

			// Re-sync with same block but changed remote content
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
				makeBlock(1, { title: "Note", content: "Remote changed" }),
			]);
			const result = await runSync(mapping);

			expect(result.updated).toBe(1);
			expect(mockVault.files.get("Are.na/test-channel/Note.md")?.content).toContain("Remote changed");
		});

		it("skips unchanged note on re-sync", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, { title: "Note" });
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);
			const result2 = await runSync(mapping);

			expect(result2.skipped).toBe(1);
			expect(result2.updated).toBe(0);
		});
	});

	describe("attachment handling", () => {
		it("downloads image asset when handling is download", async () => {
			defaultSettings.imageHandling = "download";
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, {
				class: "Image",
				title: "Pic",
				image: {
					filename: "test.png",
					content_type: "image/png",
					original: { url: "https://example.com/test.png" },
					display: { url: "https://example.com/test-display.png" },
					thumb: { url: "https://example.com/test-thumb.png" },
				},
			});
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);
			mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

			const mapping = makeMapping("test-channel");
			const result = await runSync(mapping);

			expect(result.downloaded).toBe(1);
			expect(mockApi.downloadBinary).toHaveBeenCalledWith("https://example.com/test.png");
			expect(mockVault.files.has("Are.na/Attachments/1-test.png")).toBe(true);
			const note = mockVault.files.get("Are.na/test-channel/Pic.md")?.content ?? "";
			expect(note).toContain("![[Are.na/Attachments/1-test.png]]");
		});

		it("does not download in dry-run but reports action", async () => {
			defaultSettings.imageHandling = "download";
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, {
				class: "Image",
				title: "Pic",
				image: {
					filename: "test.png",
					content_type: "image/png",
					original: { url: "https://example.com/test.png" },
					display: { url: "https://example.com/test-display.png" },
					thumb: { url: "https://example.com/test-thumb.png" },
				},
			});
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);

			const mapping = makeMapping("test-channel");
			const result = await runSync(mapping, { dryRun: true });

			expect(result.downloaded).toBe(1);
			expect(mockApi.downloadBinary).not.toHaveBeenCalled();
			expect(mockVault.files.has("Are.na/Attachments/1-test.png")).toBe(false);
		});

		it("links attachment correctly when handling is download", async () => {
			defaultSettings.attachmentHandling = "download";
			defaultSettings.downloadedAttachmentLinkStyle = "link";
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, {
				class: "Attachment",
				title: "Doc",
				attachment: {
					file_name: "report.pdf",
					file_size: 1024,
					url: "https://example.com/report.pdf",
					content_type: "application/pdf",
					extension: "pdf",
				},
			});
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);
			mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(4));

			const mapping = makeMapping("test-channel");
			const result = await runSync(mapping);

			expect(result.downloaded).toBe(1);
			const note = mockVault.files.get("Are.na/test-channel/Doc.md")?.content ?? "";
			expect(note).toContain("[[Are.na/Attachments/1-report.pdf|report.pdf]]");
		});
	});

	describe("template rendering", () => {
		it("uses custom template when enabled", async () => {
			defaultSettings.templateEnabled = true;
			defaultSettings.templateString = "# {{title}}\n\nCustom: {{content}}\n";
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, { title: "Templated", content: "Body text" });
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);

			const note = mockVault.files.get("Are.na/test-channel/Templated.md")?.content ?? "";
			expect(note).toBe("# Templated\n\nCustom: Body text\n");
		});
	});

	describe("metadata preservation", () => {
		it("includes arena_created_at in generated frontmatter", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, { title: "Meta", created_at: "2024-06-01T12:00:00.000Z" });
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);

			const note = mockVault.files.get("Are.na/test-channel/Meta.md")?.content ?? "";
			expect(note).toContain("arena_created_at: \"2024-06-01T12:00:00.000Z\"");
		});

		it("does not call vault.modify when content is unchanged", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, { title: "Stable" });
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);

			const modifySpy = jest.spyOn(mockVault, "modify");
			await runSync(mapping);

			expect(modifySpy).not.toHaveBeenCalled();
			modifySpy.mockRestore();
		});
	});

	describe("moves and renames", () => {
		it("moves note when block title changes", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
				makeBlock(1, { title: "Old Title" }),
			]);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);
			expect(mockVault.files.has("Are.na/test-channel/Old Title.md")).toBe(true);

			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
				makeBlock(1, { title: "New Title" }),
			]);
			const result = await runSync(mapping);

			expect(result.moved).toBe(1);
			expect(mockVault.files.has("Are.na/test-channel/Old Title.md")).toBe(false);
			expect(mockVault.files.has("Are.na/test-channel/New Title.md")).toBe(true);
			expect(result.moves).toContainEqual({
				from: "Are.na/test-channel/Old Title.md",
				to: "Are.na/test-channel/New Title.md",
			});
		});
	});

	describe("missing blocks / deletion", () => {
		it("marks missing blocks when they disappear from channel", async () => {
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
				makeBlock(1, { title: "Keep" }),
				makeBlock(2, { title: "Remove" }),
			]);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);

			// Now only block 1 remains on remote
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
				makeBlock(1, { title: "Keep" }),
			]);
			const result = await runSync(mapping);

			expect(result.deleted).toBe(1);
			expect(result.missingPaths).toContain("Are.na/test-channel/Remove.md");
			expect(result.actions).toContain("missing Are.na/test-channel/Remove.md");
		});
	});

	describe("channel index and overview", () => {
		it("generates channel index with sorted note links", async () => {
			const channel = makeChannel(1, "alpha", "Alpha") as ArenaChannel;
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
				makeBlock(10, { title: "Zebra" }),
				makeBlock(11, { title: "Apple" }),
			]);

			const mapping = makeMapping("alpha");
			await runSync(mapping);

			const index = mockVault.files.get("Are.na/alpha/index.md")?.content ?? "";
			expect(index).toContain("# Alpha");
			expect(index).toContain("- [[Are.na/alpha/Apple.md|Apple]]");
			expect(index).toContain("- [[Are.na/alpha/Zebra.md|Zebra]]");
			// Apple should come before Zebra (sorted)
			expect(index.indexOf("Apple")).toBeLessThan(index.indexOf("Zebra"));
		});

		it("updates master overview after syncAll", async () => {
			defaultSettings.channelMappings = [
				{ channelSlug: "ch1", enabled: true, localFolder: "", channelId: 1, channelTitle: "Ch1", lastSyncedAt: null } as ChannelMapping,
			];
			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			mockApi.getChannel.mockResolvedValue(makeChannel(1, "ch1", "Ch1") as ArenaChannel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([]);

			await engine.syncAll();

			const overview = mockVault.files.get("Are.na/overview.md")?.content ?? "";
			expect(overview).toContain("# Are.na Overview");
			expect(overview).toContain("- [[Are.na/ch1/index.md|Ch1]]");
		});
	});

	describe("excluded classes", () => {
		it("skips blocks with excluded classes", async () => {
			defaultSettings.excludeClasses = ["Media"];
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
				makeBlock(1, { title: "Text" }),
				makeBlock(2, { title: "MediaBlock", class: "Media" }),
			]);

			const mapping = makeMapping("test-channel");
			const result = await runSync(mapping);

			expect(result.skipped).toBe(1);
			expect(mockVault.files.has("Are.na/test-channel/Text.md")).toBe(true);
			expect(mockVault.files.has("Are.na/test-channel/MediaBlock.md")).toBe(false);
		});
	});

	describe("block context enrichment", () => {
		it("fetches block details when comments enabled", async () => {
			defaultSettings.includeBlockComments = true;
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, { title: "Commented", comment_count: 2 });
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);
			mockApi.getBlock.mockResolvedValue({
				id: 1,
				comments: [
					{ body: "Nice!", user: { username: "alice" }, created_at: "2024-01-01T00:00:00.000Z" },
				],
			} as unknown as ArenaBlock);

			const mapping = makeMapping("test-channel");
			await runSync(mapping);

			const note = mockVault.files.get("Are.na/test-channel/Commented.md")?.content ?? "";
			expect(note).toContain("## Comments");
			expect(note).toContain("alice");
			expect(note).toContain("Nice!");
		});

		it("fetches channel preview image when enabled", async () => {
			defaultSettings.includeChannelBlockPreviewImage = true;
			const channel = makeChannel(1, "test-channel", "Test Channel") as ArenaChannel;
			const block = makeBlock(1, {
				title: "ChannelBlock",
				class: "Channel",
				source: { url: "https://www.are.na/channel/other-channel", title: "" },
			});
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);
			mockApi.getChannelContents.mockResolvedValue({
				contents: [
					makeBlock(99, {
						class: "Image",
						image: {
							filename: "preview.jpg",
							content_type: "image/jpeg",
							original: { url: "https://example.com/preview.jpg" },
							display: { url: "https://example.com/preview.jpg" },
							thumb: { url: "https://example.com/preview.jpg" },
						},
					}),
				],
				length: 1,
				total_pages: 1,
				current_page: 1,
				per: 100,
			});

			const mapping = makeMapping("test-channel");
			await runSync(mapping);

			const note = mockVault.files.get("Are.na/test-channel/ChannelBlock.md")?.content ?? "";
			expect(note).toContain("https://example.com/preview.jpg");
		});
	});
});
