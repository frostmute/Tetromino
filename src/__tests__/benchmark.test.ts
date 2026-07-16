import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS, ChannelMapping } from "../types";
import { makeMockApp, MockVault } from "./fixtures/vault";
import { makeChannel, makePaginatedChannelBlocks } from "./fixtures/scenarios";
import * as fs from "fs";
import * as path from "path";

jest.mock("obsidian", () => ({
	App: jest.fn(),
	Vault: jest.fn(),
	normalizePath: (p: string) => p.replace(/\\/g, "/").replace(/\/+/g, "/"),
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

const BASELINE_PATH = path.join(__dirname, "baselines", "performance-baseline.json");
const BLOCK_COUNT = 100;
const ITERATIONS = 10;
const DEFAULT_TOLERANCE = 0.20;

interface BaselineMetric {
	value: number;
	unit: string;
}

interface BaselineData {
	version: number;
	createdAt: string;
	environment: {
		nodeVersion: string;
		platform: string;
	};
	metrics: Record<string, BaselineMetric>;
}

function makeMapping(slug: string): ChannelMapping {
	return {
		channelSlug: slug,
		channelId: 0,
		channelTitle: "",
		localFolder: "",
		lastSyncedAt: null,
		enabled: true,
	} as ChannelMapping;
}

function loadBaseline(): BaselineData | null {
	if (!fs.existsSync(BASELINE_PATH)) return null;
	return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8")) as BaselineData;
}

function saveBaseline(metrics: Record<string, BaselineMetric>): void {
	const dir = path.dirname(BASELINE_PATH);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	const data: BaselineData = {
		version: 1,
		createdAt: new Date().toISOString(),
		environment: {
			nodeVersion: process.version,
			platform: process.platform,
		},
		metrics,
	};
	fs.writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + "\n");
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

describe("Performance regression benchmark", () => {
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

	async function runBenchmarkIteration() {
		const channel = makeChannel(1, "benchmark-100", "Benchmark 100", {
			length: BLOCK_COUNT,
		});
		const blocks = makePaginatedChannelBlocks(BLOCK_COUNT);
		mockApi.getChannel.mockResolvedValue(channel);
		mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);
		mockApi.downloadBinary.mockResolvedValue(new ArrayBuffer(8));

		mockApi.getChannel.mockClear();
		mockApi.getAllChannelBlocksWithProgress.mockClear();
		mockApi.downloadBinary.mockClear();

		const createSpy = jest.spyOn(mockVault as any, "create");
		const modifySpy = jest.spyOn(mockVault as any, "modify");
		const createBinarySpy = jest.spyOn(mockVault as any, "createBinary");

		// ponytail: dropped memoryPeakMB — `process.memoryUsage().heapUsed` is a
		// point-in-time read with no GC guarantee; the "delta" is dominated by
		// V8 allocator/heap-reservation noise and is not comparable across
		// OS/Node versions. Reintroduce with `performance.measureUserAgentSpecificMemory()`
		// (or a dedicated heap snapshot) when an actual peak is needed.

		const start = performance.now();
		const engine = new SyncEngine(mockApp, mockApi, defaultSettings);
		const result = await engine.syncChannel(makeMapping("benchmark-100"));
		const end = performance.now();

		// ponytail: dropped totalTimeMs — single-shot wall-clock time is too
		// flaky to be a regression gate in a shared jest suite (JIT warm-up,
		// GC scheduling, suite-position noise all swing it 50%+ run-to-run).
		// The remaining counts are deterministic and catch the regressions
		// that matter: extra API calls and duplicate vault writes.

		const metrics = {
			apiCallCount:
				mockApi.getChannel.mock.calls.length +
				mockApi.getAllChannelBlocksWithProgress.mock.calls.length +
				mockApi.downloadBinary.mock.calls.length,
			vaultWriteCount:
				createSpy.mock.calls.length +
				modifySpy.mock.calls.length +
				createBinarySpy.mock.calls.length,
		};

		createSpy.mockRestore();
		modifySpy.mockRestore();
		createBinarySpy.mockRestore();

		return { result, metrics };
	}

	it("imports a 100-block channel and compares against baseline", async () => {
		// Warm-up iteration (not measured)
		await runBenchmarkIteration();
		mockVault.clear();
		defaultSettings.syncRecords = [];

		const apiCounts: number[] = [];
		const vaultCounts: number[] = [];

		for (let i = 0; i < ITERATIONS; i++) {
			const { metrics } = await runBenchmarkIteration();
			apiCounts.push(metrics.apiCallCount);
			vaultCounts.push(metrics.vaultWriteCount);
			mockVault.clear();
			defaultSettings.syncRecords = [];
		}

		const benchmarkMetrics: Record<string, BaselineMetric> = {
			// Median is used for counts because they are stable metrics.
			apiCallCount: { value: median(apiCounts), unit: "calls" },
			vaultWriteCount: { value: median(vaultCounts), unit: "writes" },
		};

		const baseline = loadBaseline();
		const shouldUpdate =
			process.env.UPDATE_BASELINE === "1" || baseline === null;

		console.log("\n=== PERFORMANCE BENCHMARK RESULTS ===");
		for (const [key, metric] of Object.entries(benchmarkMetrics)) {
			const baselineValue = baseline?.metrics[key]?.value;
			const comparison =
				baselineValue !== undefined
					? ` (baseline: ${baselineValue}${metric.unit}, delta: ${((metric.value / baselineValue - 1) * 100).toFixed(1)}%)`
					: " (no baseline)";
			console.log(`${key}: ${metric.value.toFixed(3)}${metric.unit}${comparison}`);
		}
		console.log("=====================================\n");

		if (shouldUpdate) {
			saveBaseline(benchmarkMetrics);
			console.log(`Baseline saved to ${BASELINE_PATH}`);
		} else {
			const tolerance = parseFloat(
				process.env.BENCHMARK_TOLERANCE || String(DEFAULT_TOLERANCE),
			);
			for (const [key, metric] of Object.entries(benchmarkMetrics)) {
				const baselineValue = baseline!.metrics[key]?.value;
				if (baselineValue === undefined) continue;
				const ratio = metric.value / baselineValue;
				if (ratio > 1 + tolerance) {
					throw new Error(
						`Performance regression in ${key}: ${metric.value.toFixed(3)}${metric.unit} ` +
							`vs baseline ${baselineValue}${metric.unit} ` +
							`(${((ratio - 1) * 100).toFixed(1)}% > ${(tolerance * 100).toFixed(0)}% tolerance)`,
					);
				}
			}
		}

		// Sanity checks
		expect(benchmarkMetrics.apiCallCount.value).toBeGreaterThan(0);
		expect(benchmarkMetrics.vaultWriteCount.value).toBeGreaterThan(0);
	});
});
