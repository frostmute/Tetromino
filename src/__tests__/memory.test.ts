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

interface MemorySnapshot {
	heapUsedMB: number;
	heapTotalMB: number;
	rssMB: number;
	externalMB: number;
	arrayBuffersMB: number;
}

function getMemorySnapshot(): MemorySnapshot {
	const mu = process.memoryUsage();
	return {
		heapUsedMB: mu.heapUsed / 1024 / 1024,
		heapTotalMB: mu.heapTotal / 1024 / 1024,
		rssMB: mu.rss / 1024 / 1024,
		externalMB: mu.external / 1024 / 1024,
		arrayBuffersMB: (mu.arrayBuffers ?? 0) / 1024 / 1024,
	};
}

function triggerGC(): void {
	if (typeof global.gc === "function") {
		global.gc();
	}
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

describe("Memory profiling — large channel imports", () => {
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
		defaultSettings.imageHandling = "download";
		defaultSettings.attachmentHandling = "download";
	});

	afterEach(() => {
		mockVault.clear();
	});

	async function runSync(mapping: ChannelMapping, options?: { dryRun?: boolean }) {
		const engine = new SyncEngine(mockApp, mockApi, defaultSettings);
		return engine.syncChannel(mapping, options);
	}

	it("profiles memory usage for a 1000-block channel import", async () => {
		const BLOCK_COUNT = 1000;
		const channel = makeChannel(1, "mem-1000", "Mem 1000", { length: BLOCK_COUNT });
		const blocks = makePaginatedChannelBlocks(BLOCK_COUNT);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		// Baseline memory
		triggerGC();
		const baseline = getMemorySnapshot();

		const mapping = makeMapping("mem-1000");
		const result = await runSync(mapping);

		expect(result.created).toBe(BLOCK_COUNT);

		// Peak memory (immediately after import, before GC)
		const peak = getMemorySnapshot();

		// After explicit GC
		triggerGC();
		const afterGC = getMemorySnapshot();

		const heapGrowthMB = peak.heapUsedMB - baseline.heapUsedMB;
		const retainedMB = afterGC.heapUsedMB - baseline.heapUsedMB;
		const bytesPerBlock = (heapGrowthMB * 1024 * 1024) / BLOCK_COUNT;
		const retainedPerBlock = (retainedMB * 1024 * 1024) / BLOCK_COUNT;

		console.log("\n=== MEMORY PROFILE (1000 blocks) ===");
		console.log(`Baseline heap used:  ${baseline.heapUsedMB.toFixed(2)} MB`);
		console.log(`Peak heap used:      ${peak.heapUsedMB.toFixed(2)} MB`);
		console.log(`After GC heap used:  ${afterGC.heapUsedMB.toFixed(2)} MB`);
		console.log(`Heap growth:         ${heapGrowthMB.toFixed(2)} MB`);
		console.log(`Retained after GC:   ${retainedMB.toFixed(2)} MB`);
		console.log(`Bytes per block:     ${bytesPerBlock.toFixed(1)}`);
		console.log(`Retained per block:  ${retainedPerBlock.toFixed(1)}`);
		console.log(`RSS at peak:         ${peak.rssMB.toFixed(2)} MB`);
		console.log("=====================================\n");

		// Sanity checks: importing 1000 blocks should not consume > 200 MB peak
		expect(heapGrowthMB).toBeLessThan(200);
		// After GC, retained memory should be modest (< 50 MB)
		expect(retainedMB).toBeLessThan(50);
	});

	it("detects memory leaks across repeated imports of the same channel", async () => {
		const BLOCK_COUNT = 500;
		const channel = makeChannel(2, "mem-leak", "Mem Leak", { length: BLOCK_COUNT });
		const blocks = makePaginatedChannelBlocks(BLOCK_COUNT);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		const mapping = makeMapping("mem-leak");
		const readings: number[] = [];

		for (let i = 0; i < 5; i++) {
			triggerGC();
			const before = getMemorySnapshot();

			await runSync(mapping);

			triggerGC();
			const after = getMemorySnapshot();
			readings.push(after.heapUsedMB - before.heapUsedMB);
		}

		console.log("\n=== MEMORY LEAK DETECTION (5 iterations, 500 blocks) ===");
		for (let i = 0; i < readings.length; i++) {
			console.log(`Iteration ${i + 1} retained growth: ${readings[i].toFixed(2)} MB`);
		}
		console.log("=========================================================\n");

		// If there's no leak, the retained growth should not trend upward.
		// Allow some variance; the last iteration should not be dramatically
		// larger than the first.
		const first = readings[0];
		const last = readings[readings.length - 1];
		// Last should be within 2x of first (generous to avoid flaky failures)
		expect(last).toBeLessThan(Math.max(first * 2, 10));
	});

	it("profiles memory for a 2000-block stress test", async () => {
		const BLOCK_COUNT = 2000;
		const channel = makeChannel(3, "mem-2000", "Mem 2000", { length: BLOCK_COUNT });
		const blocks = makePaginatedChannelBlocks(BLOCK_COUNT);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		triggerGC();
		const baseline = getMemorySnapshot();

		const mapping = makeMapping("mem-2000");
		const result = await runSync(mapping);

		expect(result.created).toBe(BLOCK_COUNT);

		const peak = getMemorySnapshot();
		triggerGC();
		const afterGC = getMemorySnapshot();

		const heapGrowthMB = peak.heapUsedMB - baseline.heapUsedMB;
		const retainedMB = afterGC.heapUsedMB - baseline.heapUsedMB;
		const bytesPerBlock = (heapGrowthMB * 1024 * 1024) / BLOCK_COUNT;

		console.log("\n=== MEMORY PROFILE (2000 blocks) ===");
		console.log(`Baseline heap used:  ${baseline.heapUsedMB.toFixed(2)} MB`);
		console.log(`Peak heap used:      ${peak.heapUsedMB.toFixed(2)} MB`);
		console.log(`After GC heap used:  ${afterGC.heapUsedMB.toFixed(2)} MB`);
		console.log(`Heap growth:         ${heapGrowthMB.toFixed(2)} MB`);
		console.log(`Retained after GC:   ${retainedMB.toFixed(2)} MB`);
		console.log(`Bytes per block:     ${bytesPerBlock.toFixed(1)}`);
		console.log("=====================================\n");

		// Stress test: 2000 blocks should still not exceed 400 MB peak
		expect(heapGrowthMB).toBeLessThan(400);
		expect(retainedMB).toBeLessThan(100);
	});
});
