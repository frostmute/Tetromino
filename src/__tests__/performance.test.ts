import {} from "obsidian";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS, ChannelMapping } from "../types";
import { makeMockApp, MockVault } from "./fixtures/vault";
import { makeChannel, makePaginatedChannelBlocks } from "./fixtures/scenarios";

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

interface TimingRecord {
	label: string;
	durationMs: number;
}

function captureConsoleTimings(): {
	getTimings: () => TimingRecord[];
	getAverage: (prefix: string) => number;
	getTotal: (prefix: string) => number;
	getCount: (prefix: string) => number;
	install: () => void;
	restore: () => void;
} {
	const timings: TimingRecord[] = [];
	const originalTime = console.time;
	const originalTimeEnd = console.timeEnd;

	const install = () => {
		const activeTimers = new Map<string, number>();
		console.time = (label: string) => {
			activeTimers.set(label, performance.now());
		};
		console.timeEnd = (label: string) => {
			const start = activeTimers.get(label);
			if (start !== undefined) {
				timings.push({ label, durationMs: performance.now() - start });
				activeTimers.delete(label);
			}
		};
	};

	const restore = () => {
		console.time = originalTime;
		console.timeEnd = originalTimeEnd;
	};

	const getTimings = () => timings;

	const filterByPrefix = (prefix: string) =>
		timings.filter((t) => t.label.startsWith(prefix));

	const getAverage = (prefix: string) => {
		const matches = filterByPrefix(prefix);
		if (matches.length === 0) return 0;
		return matches.reduce((sum, t) => sum + t.durationMs, 0) / matches.length;
	};

	const getTotal = (prefix: string) =>
		filterByPrefix(prefix).reduce((sum, t) => sum + t.durationMs, 0);

	const getCount = (prefix: string) => filterByPrefix(prefix).length;

	return { getTimings, getAverage, getTotal, getCount, install, restore };
}

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

describe("Performance profiling — large channel import", () => {
	let mockApp: App;
	let mockApi: jest.Mocked<ArenaApi>;
	let mockVault: MockVault;
	let defaultSettings: typeof DEFAULT_SETTINGS;
	let timingCapture: ReturnType<typeof captureConsoleTimings>;

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
		defaultSettings.imageHandling = "download";
		defaultSettings.attachmentHandling = "download";

		timingCapture = captureConsoleTimings();
		timingCapture.install();
	});

	afterEach(() => {
		timingCapture.restore();
	});

	async function runSync(mapping: ChannelMapping, options?: { dryRun?: boolean }) {
		const engine = new SyncEngine(mockApp, mockApi, defaultSettings);
		return engine.syncChannel(mapping, options);
	}

	it("profiles a 100-block channel import and reports baseline metrics", async () => {
		const BLOCK_COUNT = 100;
		const channel = makeChannel(1, "perf-100", "Perf 100", { length: BLOCK_COUNT });
		const blocks = makePaginatedChannelBlocks(BLOCK_COUNT);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("perf-100");
		const result = await runSync(mapping);

		expect(result.created).toBe(BLOCK_COUNT);

		// Verify timing data was captured
		const timings = timingCapture.getTimings();
		expect(timings.length).toBeGreaterThan(0);

		// Extract key metrics
		const channelMetadataTime = timingCapture.getTotal("arena-sync:channel-metadata:");
		const fetchBlocksTime = timingCapture.getTotal("arena-sync:fetch-blocks:");
		const totalBlockTime = timingCapture.getTotal("arena-sync:block:");
		const avgBlockTime = timingCapture.getAverage("arena-sync:block:");
		const totalAssetTime = timingCapture.getTotal("arena-sync:asset:");
		const indexTime = timingCapture.getTotal("arena-sync:index:");

		// All these phases should have been timed
		expect(timingCapture.getCount("arena-sync:channel-metadata:")).toBe(1);
		expect(timingCapture.getCount("arena-sync:fetch-blocks:")).toBe(1);
		expect(timingCapture.getCount("arena-sync:block:")).toBe(BLOCK_COUNT);
		expect(timingCapture.getCount("arena-sync:index:")).toBe(1);

		// Attachments: 20% of blocks are images + 20% are attachments = ~40 assets
		expect(timingCapture.getCount("arena-sync:asset:")).toBeGreaterThan(0);

		// Baseline assertions (these are loose because mock performance varies by machine)
		expect(channelMetadataTime).toBeGreaterThanOrEqual(0);
		expect(fetchBlocksTime).toBeGreaterThanOrEqual(0);
		expect(totalBlockTime).toBeGreaterThanOrEqual(0);
		expect(avgBlockTime).toBeGreaterThanOrEqual(0);

		// Log baseline metrics for documentation
		console.log("\n=== BASELINE PERFORMANCE METRICS (100 blocks) ===");
		console.log(`Total channel sync time: ${result.duration}ms`);
		console.log(`Channel metadata fetch: ${channelMetadataTime.toFixed(2)}ms`);
		console.log(`Block list fetch: ${fetchBlocksTime.toFixed(2)}ms`);
		console.log(`Total block processing: ${totalBlockTime.toFixed(2)}ms`);
		console.log(`Average per-block time: ${avgBlockTime.toFixed(2)}ms`);
		console.log(`Total attachment handling: ${totalAssetTime.toFixed(2)}ms`);
		console.log(`Index write: ${indexTime.toFixed(2)}ms`);
		console.log(`Blocks per second: ${(BLOCK_COUNT / (result.duration / 1000)).toFixed(1)}`);
		console.log("===================================================\n");
	});

	it("profiles a 250-block channel import for comparison", async () => {
		const BLOCK_COUNT = 250;
		const channel = makeChannel(2, "perf-250", "Perf 250", { length: BLOCK_COUNT });
		const blocks = makePaginatedChannelBlocks(BLOCK_COUNT);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("perf-250");
		const result = await runSync(mapping);

		expect(result.created).toBe(BLOCK_COUNT);
		expect(timingCapture.getCount("arena-sync:block:")).toBe(BLOCK_COUNT);

		const totalBlockTime = timingCapture.getTotal("arena-sync:block:");
		const avgBlockTime = timingCapture.getAverage("arena-sync:block:");

		console.log("\n=== BASELINE PERFORMANCE METRICS (250 blocks) ===");
		console.log(`Total channel sync time: ${result.duration}ms`);
		console.log(`Total block processing: ${totalBlockTime.toFixed(2)}ms`);
		console.log(`Average per-block time: ${avgBlockTime.toFixed(2)}ms`);
		console.log(`Blocks per second: ${(BLOCK_COUNT / (result.duration / 1000)).toFixed(1)}`);
		console.log("===================================================\n");
	});
});
