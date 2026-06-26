import { App, Vault, TFile, normalizePath } from "obsidian";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS, ChannelMapping } from "../types";
import {
	makeMockApp,
	MockVault,
	vaultWithExistingNotes,
} from "./fixtures/vault";
import {
	makeChannel,
	makeSmallChannelBlocks,
	makeMixedChannelBlocks,
	makePaginatedChannelBlocks,
	makeConflictScenarioBlocks,
	makeChannelResponse,
	makePaginatedBlocksResponse,
	makeEmptyPaginatedResponse,
	makeErrorResponse,
	emptyChannel,
} from "./fixtures/scenarios";

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

describe("Integration tests with realistic fixtures", () => {
	let mockApp: App;
	let mockApi: jest.Mocked<ArenaApi>;
	let mockVault: MockVault;
	let defaultSettings: typeof DEFAULT_SETTINGS;

	beforeEach(() => {
		mockVault = new MockVault();
		const { app } = makeMockApp(mockVault);
		mockApp = app;
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

	async function runSync(mapping: ChannelMapping, options?: { dryRun?: boolean }) {
		const engine = new SyncEngine(mockApp, mockApi, defaultSettings);
		return engine.syncChannel(mapping, options);
	}

	/* -------------------------------------------------------------- */
	/*  Small channel import                                            */
	/* -------------------------------------------------------------- */

		describe("small channel import", () => {
		it("creates notes for a small realistic channel", async () => {
			const channel = makeChannel(1, "small-channel", "Small Channel", { length: 3 });
			const blocks = makeSmallChannelBlocks();
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
			mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

			const mapping = makeMapping("small-channel");
			const result = await runSync(mapping);

			expect(result.created).toBe(3);
			expect(result.skipped).toBe(0);
			expect(mockVault.has("Are.na/small-channel/Introduction.md")).toBe(true);
			expect(mockVault.has("Are.na/small-channel/Cover Photo.md")).toBe(true);
			expect(mockVault.has("Are.na/small-channel/Reference Article.md")).toBe(true);
			expect(mockVault.has("Are.na/small-channel/index.md")).toBe(true);

			const index = mockVault.content("Are.na/small-channel/index.md") ?? "";
			expect(index).toContain("# Small Channel");
			expect(index).toContain("[[Are.na/small-channel/Cover Photo.md|Cover Photo]]");
		});
	});

	/* -------------------------------------------------------------- */
	/*  Mixed block types                                               */
	/* -------------------------------------------------------------- */

	describe("mixed block types channel", () => {
		it("handles all block types in a single channel", async () => {
			const channel = makeChannel(2, "mixed-channel", "Mixed Channel", { length: 10 });
			const blocks = makeMixedChannelBlocks();
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
			mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

			defaultSettings.imageHandling = "download";
			defaultSettings.attachmentHandling = "download";

			const mapping = makeMapping("mixed-channel");
			const result = await runSync(mapping);

			expect(result.created).toBe(10);
			expect(mockVault.has("Are.na/mixed-channel/Overview.md")).toBe(true);
			expect(mockVault.has("Are.na/mixed-channel/Diagram.md")).toBe(true);
			expect(mockVault.has("Are.na/mixed-channel/External Resource.md")).toBe(true);
			expect(mockVault.has("Are.na/mixed-channel/Video Embed.md")).toBe(true);
			expect(mockVault.has("Are.na/mixed-channel/Podcast Episode.md")).toBe(true);
			expect(mockVault.has("Are.na/mixed-channel/Research PDF.md")).toBe(true);
			expect(mockVault.has("Are.na/mixed-channel/Related Channel.md")).toBe(true);
			expect(mockVault.has("Are.na/mixed-channel/Unicode_ 你好世界 🌍 Émojis.md")).toBe(true);

			// Image block should have downloaded asset
			expect(result.downloaded).toBeGreaterThanOrEqual(1);
			expect(mockVault.has("Are.na/Attachments/2-diagram.jpg")).toBe(true);
		});
	});

	/* -------------------------------------------------------------- */
	/*  Empty channel                                                   */
	/* -------------------------------------------------------------- */

	describe("empty channel", () => {
		it("creates only an index note for an empty channel", async () => {
			mockApi.getChannel.mockResolvedValue(emptyChannel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([]);

			const mapping = makeMapping("empty-channel");
			const result = await runSync(mapping);

			expect(result.created).toBe(0);
			expect(result.skipped).toBe(0);
			expect(mockVault.has("Are.na/empty-channel/index.md")).toBe(true);
			const index = mockVault.content("Are.na/empty-channel/index.md") ?? "";
			expect(index).toContain("# Empty Channel");
		});
	});

	/* -------------------------------------------------------------- */
	/*  Large paginated channel                                         */
	/* -------------------------------------------------------------- */

	describe("large paginated channel", () => {
		it("imports a large channel with 250 blocks", async () => {
			const channel = makeChannel(3, "large-channel", "Large Channel", { length: 250 });
			const blocks = makePaginatedChannelBlocks(250);
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
			mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

			const mapping = makeMapping("large-channel");
			const result = await runSync(mapping);

			expect(result.created).toBe(250);
			expect(mockVault.has("Are.na/large-channel/index.md")).toBe(true);
			// Vault also contains downloaded attachment files
			expect(mockVault.paths().length).toBeGreaterThan(250);
		});
	});

	/* -------------------------------------------------------------- */
	/*  Conflict resolution with existing notes                         */
	/* -------------------------------------------------------------- */

	describe("conflict resolution with existing notes", () => {
		it("updates changed notes, skips unchanged, and marks missing", async () => {
			const channel = makeChannel(10, "existing-channel", "Existing Channel", { length: 3 });
			const initialBlocks = [
				{ id: 1, title: "Stable Note", content: "This note will not change." },
				{ id: 2, title: "Changing Note", content: "Original remote content." },
				{ id: 3, title: "Delete Me", content: "This note will be deleted." },
			];
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(
				initialBlocks.map((b, i) => ({
					id: b.id,
					title: b.title,
					content: b.content,
					content_html: `<p>${b.content}</p>`,
					description: null,
					description_html: null,
					source: null,
					image: null,
					attachment: null,
					class: "Text",
					base_class: "Block",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
					connected_at: "2026-01-01T00:00:00.000Z",
					position: i + 1,
					user: {
						id: 1,
						slug: "testuser",
						username: "testuser",
						first_name: "Test",
						last_name: "User",
						avatar: "",
						channel_count: 1,
					},
				}))
			);

			const mapping = makeMapping("existing-channel");
			// First sync to establish sync records
			await runSync(mapping);
			expect(mockVault.has("Are.na/existing-channel/Stable Note.md")).toBe(true);
			expect(mockVault.has("Are.na/existing-channel/Changing Note.md")).toBe(true);
			expect(mockVault.has("Are.na/existing-channel/Delete Me.md")).toBe(true);

			// Now change remote: block 2 updated, block 3 removed, block 4 added
			const updatedBlocks = [
				{ id: 1, title: "Stable Note", content: "This note will not change." },
				{ id: 2, title: "Changing Note", content: "Updated remote content." },
				{ id: 4, title: "New Note", content: "Brand new block." },
			];
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(
				updatedBlocks.map((b, i) => ({
					id: b.id,
					title: b.title,
					content: b.content,
					content_html: `<p>${b.content}</p>`,
					description: null,
					description_html: null,
					source: null,
					image: null,
					attachment: null,
					class: "Text",
					base_class: "Block",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
					connected_at: "2026-01-01T00:00:00.000Z",
					position: i + 1,
					user: {
						id: 1,
						slug: "testuser",
						username: "testuser",
						first_name: "Test",
						last_name: "User",
						avatar: "",
						channel_count: 1,
					},
				}))
			);

			const result = await runSync(mapping);

			expect(result.created).toBe(1); // New Note
			expect(result.updated).toBe(1); // Changing Note
			expect(result.skipped).toBe(1); // Stable Note
			expect(result.deleted).toBe(1); // Delete Me
			expect(result.missingPaths).toContain("Are.na/existing-channel/Delete Me.md");
		});
	});

	/* -------------------------------------------------------------- */
	/*  Special characters in titles                                    */
	/* -------------------------------------------------------------- */

	describe("special characters in block titles", () => {
		it("sanitises filenames containing special characters", async () => {
			const channel = makeChannel(6, "special-chars-channel", "Special Channel", { length: 2 });
			const blocks = [
				{
					id: 1,
					title: 'Special / Characters: & < > " Quotes',
					content: "Body",
					content_html: "<p>Body</p>",
					description: null,
					description_html: null,
					source: null,
					image: null,
					attachment: null,
					class: "Text",
					base_class: "Block",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
					connected_at: "2026-01-01T00:00:00.000Z",
					position: 1,
					user: {
						id: 1,
						slug: "testuser",
						username: "testuser",
						first_name: "Test",
						last_name: "User",
						avatar: "",
						channel_count: 1,
					},
				},
			];
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks as any);

			const mapping = makeMapping("special-chars-channel");
			const result = await runSync(mapping);

			expect(result.created).toBe(1);
			// Filename should be sanitised
			const paths = mockVault.paths();
			const notePath = paths.find((p) => p.includes("Special") && p.endsWith(".md"));
			expect(notePath).toBeDefined();
			const fileName = notePath!.split("/").pop()!;
			expect(fileName).not.toContain("<");
			expect(fileName).not.toContain(">");
			expect(fileName).not.toContain(":");
		});
	});

	/* -------------------------------------------------------------- */
	/*  Dry-run with realistic data                                     */
	/* -------------------------------------------------------------- */

	describe("dry-run with realistic mixed channel", () => {
		it("reports all actions without modifying vault", async () => {
			const channel = makeChannel(7, "dry-run-channel", "Dry Run Channel", { length: 5 });
			const blocks = makeMixedChannelBlocks().slice(0, 5);
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);

			const mapping = makeMapping("dry-run-channel");
			const result = await runSync(mapping, { dryRun: true });

			expect(result.dryRun).toBe(true);
			expect(result.created).toBe(5);
			expect(mockVault.paths()).toHaveLength(0);
			expect(result.actions).toContain("create Are.na/dry-run-channel/Overview.md");
		});
	});

	/* -------------------------------------------------------------- */
	/*  Channel with deleted blocks                                     */
	/* -------------------------------------------------------------- */

	describe("channel with deleted blocks", () => {
		it("marks missing blocks after they are removed from channel", async () => {
			const channel = makeChannel(8, "shrinking-channel", "Shrinking Channel", { length: 3 });
			const initialBlocks = [
				{ id: 1, title: "Keep 1", content: "Stay" },
				{ id: 2, title: "Keep 2", content: "Stay" },
				{ id: 3, title: "Delete Me", content: "Go away" },
			];
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(
				initialBlocks.map((b, i) => ({
					id: b.id,
					title: b.title,
					content: b.content,
					content_html: `<p>${b.content}</p>`,
					description: null,
					description_html: null,
					source: null,
					image: null,
					attachment: null,
					class: "Text",
					base_class: "Block",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
					connected_at: "2026-01-01T00:00:00.000Z",
					position: i + 1,
					user: {
						id: 1,
						slug: "testuser",
						username: "testuser",
						first_name: "Test",
						last_name: "User",
						avatar: "",
						channel_count: 1,
					},
				}))
			);

			const mapping = makeMapping("shrinking-channel");
			await runSync(mapping);
			expect(mockVault.has("Are.na/shrinking-channel/Delete Me.md")).toBe(true);

			// Now simulate deletion
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(
				initialBlocks.slice(0, 2).map((b, i) => ({
					id: b.id,
					title: b.title,
					content: b.content,
					content_html: `<p>${b.content}</p>`,
					description: null,
					description_html: null,
					source: null,
					image: null,
					attachment: null,
					class: "Text",
					base_class: "Block",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
					connected_at: "2026-01-01T00:00:00.000Z",
					position: i + 1,
					user: {
						id: 1,
						slug: "testuser",
						username: "testuser",
						first_name: "Test",
						last_name: "User",
						avatar: "",
						channel_count: 1,
					},
				}))
			);
			const result = await runSync(mapping);

			expect(result.deleted).toBe(1);
			expect(result.missingPaths).toContain("Are.na/shrinking-channel/Delete Me.md");
		});
	});

	/* -------------------------------------------------------------- */
	/*  Unicode and international characters                            */
	/* -------------------------------------------------------------- */

	describe("unicode and international characters", () => {
		it("correctly handles unicode block titles and content", async () => {
			const channel = makeChannel(9, "unicode-channel", "Unicode Channel", { length: 1 });
			const blocks = [
				{
					id: 1,
					title: "Unicode: 你好世界 🌍 Émojis",
					content: "Mixed scripts: العربية עברית 日本語",
					content_html: "<p>Mixed scripts</p>",
					description: null,
					description_html: null,
					source: null,
					image: null,
					attachment: null,
					class: "Text",
					base_class: "Block",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
					connected_at: "2026-01-01T00:00:00.000Z",
					position: 1,
					user: {
						id: 1,
						slug: "testuser",
						username: "testuser",
						first_name: "Test",
						last_name: "User",
						avatar: "",
						channel_count: 1,
					},
				},
			];
			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks as any);

			const mapping = makeMapping("unicode-channel");
			const result = await runSync(mapping);

			expect(result.created).toBe(1);
			const paths = mockVault.paths();
			const notePath = paths.find((p) => p.includes("Unicode") || p.includes("你好"));
			expect(notePath).toBeDefined();
			const content = mockVault.content(notePath!) ?? "";
			expect(content).toContain("你好世界");
			expect(content).toContain("日本語");
		});
	});
});
