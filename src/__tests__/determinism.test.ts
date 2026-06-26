import { App, Vault, TFile, normalizePath } from "obsidian";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS, ChannelMapping } from "../types";
import { MockVault, makeMockApp } from "./fixtures/vault";
import {
	makeChannel,
	makeSmallChannelBlocks,
	makeMixedChannelBlocks,
	makePaginatedChannelBlocks,
	makeTextBlock,
	makeImageBlock,
	makeLinkBlock,
	makeEmbedBlock,
	makeMediaBlock,
	makeAttachmentBlock,
	makeChannelBlock,
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

function cloneSettings(): typeof DEFAULT_SETTINGS {
	return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function getVaultSnapshot(vault: MockVault): Map<string, string> {
	const snapshot = new Map<string, string>();
	for (const path of vault.paths().sort()) {
		snapshot.set(path, vault.content(path) ?? "");
	}
	return snapshot;
}

function expectVaultsEqual(a: Map<string, string>, b: Map<string, string>): void {
	expect(a.size).toBe(b.size);
	for (const [path, contentA] of a) {
		expect(b.has(path)).toBe(true);
		const contentB = b.get(path)!;
		if (contentA !== contentB) {
			expect(contentB).toBe(contentA);
		}
	}
}

describe("Determinism and stability", () => {
	let mockApi: jest.Mocked<ArenaApi>;

	beforeEach(() => {
		mockApi = new ArenaApi("test-token") as jest.Mocked<ArenaApi>;
		mockApi.getChannel = jest.fn();
		mockApi.getAllChannelBlocksWithProgress = jest.fn();
		mockApi.getBlock = jest.fn();
		mockApi.getChannelContents = jest.fn();
		mockApi.downloadBinary = jest.fn();
	});

	async function runFreshSync(
		mapping: ChannelMapping,
		options?: { dryRun?: boolean },
		customSettings?: typeof DEFAULT_SETTINGS,
	) {
		const vault = new MockVault();
		const { app } = makeMockApp(vault);
		const settings = customSettings
			? JSON.parse(JSON.stringify(customSettings))
			: cloneSettings();
		settings.channelMappings = [];
		settings.syncRecords = [];
		const engine = new SyncEngine(app, mockApi, settings);
		const result = await engine.syncChannel(mapping, options);
		return { vault, result, settings };
	}

	/* -------------------------------------------------------------- */
	/*  Repeated import from scratch produces identical vault state     */
	/* -------------------------------------------------------------- */

	it("produces byte-for-byte identical files on repeated fresh imports", async () => {
		const channel = makeChannel(1, "stable-channel", "Stable Channel", {
			length: 3,
		});
		const blocks = makeSmallChannelBlocks();
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("stable-channel");
		const run1 = await runFreshSync(mapping);
		const run2 = await runFreshSync(mapping);
		const run3 = await runFreshSync(mapping);

		const snap1 = getVaultSnapshot(run1.vault);
		const snap2 = getVaultSnapshot(run2.vault);
		const snap3 = getVaultSnapshot(run3.vault);

		expectVaultsEqual(snap1, snap2);
		expectVaultsEqual(snap2, snap3);
	});

	/* -------------------------------------------------------------- */
	/*  Block order in API response does not affect final output        */
	/* -------------------------------------------------------------- */

	it("produces identical vault state regardless of block order in API response", async () => {
		const channel = makeChannel(2, "order-channel", "Order Channel", {
			length: 3,
		});
		const blocks = makeSmallChannelBlocks();
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("order-channel");

		// Run 1: original order
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		const run1 = await runFreshSync(mapping);

		// Run 2: reversed order
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
			...blocks,
		].reverse());
		const run2 = await runFreshSync(mapping);

		// Run 3: shuffled order
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
			blocks[1],
			blocks[2],
			blocks[0],
		]);
		const run3 = await runFreshSync(mapping);

		const snap1 = getVaultSnapshot(run1.vault);
		const snap2 = getVaultSnapshot(run2.vault);
		const snap3 = getVaultSnapshot(run3.vault);

		expectVaultsEqual(snap1, snap2);
		expectVaultsEqual(snap2, snap3);
	});

	/* -------------------------------------------------------------- */
	/*  Pagination boundaries do not affect final output                */
	/* -------------------------------------------------------------- */

	it("produces identical vault state across different pagination boundaries", async () => {
		const channel = makeChannel(3, "page-channel", "Page Channel", {
			length: 10,
		});
		const blocks = makePaginatedChannelBlocks(10);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("page-channel");

		// Run 1: blocks in natural order
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		const run1 = await runFreshSync(mapping);

		// Run 2: blocks reversed to simulate different page boundaries
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([
			...blocks,
		].reverse());
		const run2 = await runFreshSync(mapping);

		const snap1 = getVaultSnapshot(run1.vault);
		const snap2 = getVaultSnapshot(run2.vault);

		expectVaultsEqual(snap1, snap2);
	});

	/* -------------------------------------------------------------- */
	/*  Mixed block types produce deterministic output                  */
	/* -------------------------------------------------------------- */

	it("produces identical output for mixed block types on repeated imports", async () => {
		const channel = makeChannel(4, "mixed-channel", "Mixed Channel", {
			length: 10,
		});
		const blocks = makeMixedChannelBlocks();
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const settings = cloneSettings();
		settings.imageHandling = "download";
		settings.attachmentHandling = "download";

		const mapping = makeMapping("mixed-channel");
		const run1 = await runFreshSync(mapping, undefined, settings);
		const run2 = await runFreshSync(mapping, undefined, settings);

		const snap1 = getVaultSnapshot(run1.vault);
		const snap2 = getVaultSnapshot(run2.vault);

		expectVaultsEqual(snap1, snap2);

		// Verify binary assets are also present in both runs
		const paths1 = run1.vault.paths().filter((p) => !p.endsWith(".md"));
		const paths2 = run2.vault.paths().filter((p) => !p.endsWith(".md"));
		expect(paths1.sort()).toEqual(paths2.sort());
	});

	/* -------------------------------------------------------------- */
	/*  Template rendering is deterministic                              */
	/* -------------------------------------------------------------- */

	it("produces identical template output on repeated imports", async () => {
		const channel = makeChannel(5, "template-channel", "Template Channel", {
			length: 2,
		});
		const blocks = [
			makeTextBlock(1, "First", "Body one"),
			makeTextBlock(2, "Second", "Body two"),
		];
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);

		const settings = cloneSettings();
		settings.templateEnabled = true;
		settings.templateString =
			'---\ntitle: "{{title}}"\narena_id: {{id}}\n---\n\n# {{title}}\n\n{{content}}\n\n{{#if description}}> {{description}}{{/if}}\n';

		const mapping = makeMapping("template-channel");
		const run1 = await runFreshSync(mapping, undefined, settings);
		const run2 = await runFreshSync(mapping, undefined, settings);

		const snap1 = getVaultSnapshot(run1.vault);
		const snap2 = getVaultSnapshot(run2.vault);

		expectVaultsEqual(snap1, snap2);
	});

	/* -------------------------------------------------------------- */
	/*  Timestamps in output come only from API data                    */
	/* -------------------------------------------------------------- */

	it("does not inject local timestamps into generated markdown", async () => {
		const fixedDate = "2024-03-15T10:30:00.000Z";
		const channel = makeChannel(6, "time-channel", "Time Channel", {
			length: 1,
			created_at: fixedDate,
			updated_at: fixedDate,
		});
		const block = makeTextBlock(1, "Time Test", "Content");
		(block as unknown as Record<string, string>).created_at = fixedDate;
		(block as unknown as Record<string, string>).updated_at = fixedDate;

		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([block]);

		const mapping = makeMapping("time-channel");
		const { vault } = await runFreshSync(mapping);

		// Collect all generated markdown
		const allContent = vault
			.paths()
			.filter((p) => p.endsWith(".md"))
			.map((p) => vault.content(p) ?? "")
			.join("\n");

		// Assert no current-year dates that aren't the fixed date
		const currentYear = new Date().getFullYear().toString();
		const lines = allContent.split("\n");
		for (const line of lines) {
			if (line.includes(currentYear) && !line.includes(fixedDate.slice(0, 4))) {
				// This would indicate a local timestamp leaked in
				expect(line).toContain(fixedDate.slice(0, 4));
			}
		}

		// More direct: the content should contain the fixed date
		expect(allContent).toContain(fixedDate);
	});

	/* -------------------------------------------------------------- */
	/*  syncAll produces deterministic master overview                  */
	/* -------------------------------------------------------------- */

	it("produces identical master overview on repeated syncAll calls", async () => {
		const ch1 = makeChannel(1, "alpha", "Alpha", { length: 0 });
		const ch2 = makeChannel(2, "beta", "Beta", { length: 0 });

		mockApi.getChannel.mockImplementation((slug: string) => {
			if (slug === "alpha") return Promise.resolve(ch1);
			if (slug === "beta") return Promise.resolve(ch2);
			return Promise.reject(new Error("Unknown channel"));
		});
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue([]);

		const settings = cloneSettings();
		settings.channelMappings = [
			{
				channelSlug: "alpha",
				enabled: true,
				localFolder: "",
				channelId: 0,
				channelTitle: "",
				lastSyncedAt: null,
			} as ChannelMapping,
			{
				channelSlug: "beta",
				enabled: true,
				localFolder: "",
				channelId: 0,
				channelTitle: "",
				lastSyncedAt: null,
			} as ChannelMapping,
		];

		const run1Vault = new MockVault();
		const { app: app1 } = makeMockApp(run1Vault);
		const engine1 = new SyncEngine(
			app1,
			mockApi,
			JSON.parse(JSON.stringify(settings)),
		);
		await engine1.syncAll();

		const run2Vault = new MockVault();
		const { app: app2 } = makeMockApp(run2Vault);
		const engine2 = new SyncEngine(
			app2,
			mockApi,
			JSON.parse(JSON.stringify(settings)),
		);
		await engine2.syncAll();

		const overview1 = run1Vault.content("Are.na/overview.md") ?? "";
		const overview2 = run2Vault.content("Are.na/overview.md") ?? "";

		expect(overview2).toBe(overview1);
	});

	/* -------------------------------------------------------------- */
	/*  Large channel determinism                                       */
	/* -------------------------------------------------------------- */

	it("produces identical output for large channels on repeated imports", async () => {
		const channel = makeChannel(7, "large-channel", "Large Channel", {
			length: 250,
		});
		const blocks = makePaginatedChannelBlocks(250);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("large-channel");
		const run1 = await runFreshSync(mapping);
		const run2 = await runFreshSync(mapping);

		const snap1 = getVaultSnapshot(run1.vault);
		const snap2 = getVaultSnapshot(run2.vault);

		expectVaultsEqual(snap1, snap2);
	});

	/* -------------------------------------------------------------- */
	/*  Dry-run reports are deterministic                               */
	/* -------------------------------------------------------------- */

	it("produces identical dry-run action sets on repeated runs", async () => {
		const channel = makeChannel(8, "dryrun-channel", "Dry Run Channel", {
			length: 3,
		});
		const blocks = makeSmallChannelBlocks();
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("dryrun-channel");
		const run1 = await runFreshSync(mapping, { dryRun: true });
		const run2 = await runFreshSync(mapping, { dryRun: true });

		// Vault should remain empty in both cases
		expect(run1.vault.paths()).toHaveLength(0);
		expect(run2.vault.paths()).toHaveLength(0);

		// Action counts should match
		expect(run2.result.created).toBe(run1.result.created);
		expect(run2.result.downloaded).toBe(run1.result.downloaded);
	});

	/* -------------------------------------------------------------- */
	/*  Re-sync with unchanged data is a no-op                          */
	/* -------------------------------------------------------------- */

	it("does not modify vault files when re-syncing unchanged remote data", async () => {
		const channel = makeChannel(9, "noop-channel", "Noop Channel", {
			length: 2,
		});
		const blocks = [
			makeTextBlock(1, "Note A", "Content A"),
			makeTextBlock(2, "Note B", "Content B"),
		];
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);

		const vault = new MockVault();
		const { app } = makeMockApp(vault);
		const settings = cloneSettings();
		settings.channelMappings = [];
		settings.syncRecords = [];

		const engine = new SyncEngine(app, mockApi, settings);
		const mapping = makeMapping("noop-channel");

		// First sync
		await engine.syncChannel(mapping);
		const firstSnapshot = getVaultSnapshot(vault);

		// Second sync with identical data
		const result2 = await engine.syncChannel(mapping);
		const secondSnapshot = getVaultSnapshot(vault);

		expect(result2.skipped).toBe(2);
		expect(result2.created).toBe(0);
		expect(result2.updated).toBe(0);
		expectVaultsEqual(firstSnapshot, secondSnapshot);
	});
});
