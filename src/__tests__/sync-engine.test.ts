import { App, Vault } from "obsidian";
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

describe("SyncEngine", () => {
	let mockApp: App;
	let mockApi: jest.Mocked<ArenaApi>;
	let mockVault: jest.Mocked<Vault>;
	let defaultSettings: typeof DEFAULT_SETTINGS;

	beforeEach(() => {
		mockVault = {
			getAbstractFileByPath: jest.fn(),
			read: jest.fn(),
			create: jest.fn(),
			modify: jest.fn(),
			createFolder: jest.fn(),
			delete: jest.fn(),
		} as unknown as jest.Mocked<Vault>;

		mockApp = {
			vault: mockVault,
		} as unknown as App;

		mockApi = new ArenaApi("test-token") as jest.Mocked<ArenaApi>;
		mockApi.getChannel = jest.fn();
		mockApi.getAllChannelBlocksWithProgress = jest.fn();
		mockApi.getBlock = jest.fn();
		mockApi.getChannelContents = jest.fn();

		defaultSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
	});

	it("should initialize correctly", () => {
		const engine = new SyncEngine(mockApp, mockApi, defaultSettings);
		expect(engine).toBeInstanceOf(SyncEngine);
	});

	describe("syncAll", () => {
		it("should skip disabled channels", async () => {
			defaultSettings.channelMappings = [
				{
					channelSlug: "disabled-channel",
					enabled: false,
					folderPrefix: "",
				} as ChannelMapping,
				{
					channelSlug: "enabled-channel",
					enabled: true,
					folderPrefix: "",
				} as ChannelMapping,
			];

			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			// Mock syncChannel to avoid actual processing
			const syncChannelSpy = jest.spyOn(engine, "syncChannel").mockResolvedValue({
				created: 1,
				updated: 0,
				deleted: 0,
				moved: 0,
				skipped: 0,
				downloaded: 0,
				dryRun: false,
				actions: ["create Something"],
				moves: [],
				fileDiffs: [],
				missingPaths: [],
				errors: [],
				duration: 10,
			});

			// Mock updateMasterOverview since we just want to test syncAll logic
			const updateMasterOverviewSpy = jest.spyOn(engine as any, "updateMasterOverview").mockResolvedValue(undefined);

			const result = await engine.syncAll();

			expect(syncChannelSpy).toHaveBeenCalledTimes(1);
			expect(syncChannelSpy).toHaveBeenCalledWith(
				expect.objectContaining({ channelSlug: "enabled-channel" }),
				expect.any(Object)
			);

			expect(result.created).toBe(1);
			expect(result.actions).toContain("create Something");

			syncChannelSpy.mockRestore();
			updateMasterOverviewSpy.mockRestore();
		});

		it("should collect errors and not throw if a channel fails", async () => {
			defaultSettings.channelMappings = [
				{
					channelSlug: "error-channel",
					enabled: true,
					folderPrefix: "",
				} as ChannelMapping,
			];

			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const syncChannelSpy = jest.spyOn(engine, "syncChannel").mockRejectedValue(new Error("API failure"));
			const updateMasterOverviewSpy = jest.spyOn(engine as any, "updateMasterOverview").mockResolvedValue(undefined);

			const result = await engine.syncAll();

			expect(syncChannelSpy).toHaveBeenCalledTimes(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toEqual({
				blockId: null,
				channelSlug: "error-channel",
				message: "API failure",
				recoverable: false,
			});

			syncChannelSpy.mockRestore();
			updateMasterOverviewSpy.mockRestore();
		});

		it("should handle multiple channels and aggregate results and errors", async () => {
			defaultSettings.channelMappings = [
				{
					channelSlug: "success-channel",
					enabled: true,
					folderPrefix: "",
				},
				{
					channelSlug: "fail-channel",
					enabled: true,
					folderPrefix: "",
				},
				{
					channelSlug: "another-success-channel",
					enabled: true,
					folderPrefix: "",
				},
			];

			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const syncChannelSpy = jest.spyOn(engine, "syncChannel");
			syncChannelSpy
				.mockResolvedValueOnce({
					created: 1, updated: 0, deleted: 0, moved: 0, skipped: 0, downloaded: 0,
					dryRun: false, actions: ["success 1"], moves: [], fileDiffs: [], missingPaths: [], errors: [], duration: 5
				})
				.mockRejectedValueOnce(new Error("Channel failure"))
				.mockResolvedValueOnce({
					created: 2, updated: 0, deleted: 0, moved: 0, skipped: 0, downloaded: 0,
					dryRun: false, actions: ["success 2"], moves: [], fileDiffs: [], missingPaths: [], errors: [], duration: 5
				});

			const updateMasterOverviewSpy = jest.spyOn(engine as unknown as Record<string, unknown>, "updateMasterOverview").mockResolvedValue(undefined);

			const result = await engine.syncAll();

			expect(syncChannelSpy).toHaveBeenCalledTimes(3);
			expect(result.created).toBe(3); // 1 + 2
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].channelSlug).toBe("fail-channel");
			expect(result.errors[0].message).toBe("Channel failure");
			expect(result.actions).toContain("success 1");
			expect(result.actions).toContain("success 2");

			expect(updateMasterOverviewSpy).toHaveBeenCalled();

			syncChannelSpy.mockRestore();
			updateMasterOverviewSpy.mockRestore();
		});

		it("should handle non-Error exceptions gracefully", async () => {
			defaultSettings.channelMappings = [
				{
					channelSlug: "string-error-channel",
					enabled: true,
					folderPrefix: "",
				},
			];

			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			// Mock syncChannel to throw a string instead of an Error object
			const syncChannelSpy = jest.spyOn(engine, "syncChannel").mockRejectedValue("Literal string error");
			const updateMasterOverviewSpy = jest.spyOn(engine as unknown as Record<string, unknown>, "updateMasterOverview").mockResolvedValue(undefined);

			const result = await engine.syncAll();

			expect(result.errors).toHaveLength(1);
			// Currently, it handles it via (err as Error).message which might be undefined for strings
			// We expect it to be handled better in the next step of the plan
			expect(result.errors[0].channelSlug).toBe("string-error-channel");
			expect(result.errors[0].message).toBe("Literal string error");

			syncChannelSpy.mockRestore();
			updateMasterOverviewSpy.mockRestore();
		});

		it("should aggregate errors returned from syncChannel (non-throwing)", async () => {
			defaultSettings.channelMappings = [
				{
					channelSlug: "partial-error-channel",
					enabled: true,
					folderPrefix: "",
				},
			];

			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const syncChannelSpy = jest.spyOn(engine, "syncChannel").mockResolvedValue({
				created: 0, updated: 0, deleted: 0, moved: 0, skipped: 0, downloaded: 0,
				dryRun: false, actions: [], moves: [], fileDiffs: [], missingPaths: [],
				errors: [
					{
						blockId: 123,
						channelSlug: "partial-error-channel",
						message: "Block failed",
						recoverable: true,
					}
				],
				duration: 5
			});
			const updateMasterOverviewSpy = jest.spyOn(engine as unknown as Record<string, unknown>, "updateMasterOverview").mockResolvedValue(undefined);

			const result = await engine.syncAll();

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].blockId).toBe(123);
			expect(result.errors[0].message).toBe("Block failed");

			syncChannelSpy.mockRestore();
			updateMasterOverviewSpy.mockRestore();
		});
	});

	describe("syncChannel", () => {
		it("should fetch channel and call pull", async () => {
			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const channel = makeChannel(123, "test-channel", "Test Channel") as ArenaChannel;

			mockApi.getChannel.mockResolvedValue(channel);

			const pullSpy = jest.spyOn(engine as any, "pull").mockResolvedValue(undefined);

			const mapping = {
				channelSlug: "test-channel",
				enabled: true,
				folderPrefix: "",
			} as ChannelMapping;

			await engine.syncChannel(mapping, { dryRun: false });

			expect(mockApi.getChannel).toHaveBeenCalledWith("test-channel");
			expect(pullSpy).toHaveBeenCalledWith(mapping, channel, expect.any(Object), false);
			expect(mapping.channelId).toBe(123);
			expect(mapping.channelTitle).toBe("Test Channel");

			pullSpy.mockRestore();
		});

		it("should not update mapping state if dryRun is true", async () => {
			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const channel = makeChannel(123, "test-channel", "Test Channel") as ArenaChannel;

			mockApi.getChannel.mockResolvedValue(channel);
			const pullSpy = jest.spyOn(engine as any, "pull").mockResolvedValue(undefined);

			const mapping = {
				channelSlug: "test-channel",
				enabled: true,
				folderPrefix: "",
			} as ChannelMapping;

			await engine.syncChannel(mapping, { dryRun: true });

			expect(pullSpy).toHaveBeenCalledWith(mapping, channel, expect.any(Object), true);
			expect(mapping).not.toHaveProperty("channelId");
			expect(mapping).not.toHaveProperty("lastSyncedAt");

			pullSpy.mockRestore();
		});

		it("should capture recoverable errors when pullBlock fails", async () => {
			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const channel = makeChannel(123, "test-channel", "Test Channel") as ArenaChannel;

			const blocks = [
				makeBlock(1),
				makeBlock(2),
			] as ArenaBlock[];

			mockApi.getChannel.mockResolvedValue(channel);
			mockApi.getAllChannelBlocksWithProgress.mockResolvedValue(blocks);

			const pullBlockSpy = jest.spyOn(engine as any, "pullBlock");
			pullBlockSpy.mockImplementation(async (block: ArenaBlock) => {
				if (block.id === 1) {
					throw new Error("Failed to pull block 1");
				}
				return "path/to/block2";
			});

			// Mock other private methods that might be called
			const updateChannelIndexSpy = jest.spyOn(engine as any, "updateChannelIndex").mockResolvedValue(undefined);
			const markMissingSpy = jest.spyOn(engine as any, "markMissing").mockImplementation(() => {});
			const ensureFolderSpy = jest.spyOn(engine as any, "ensureFolder").mockResolvedValue(undefined);

			const mapping = {
				channelSlug: "test-channel",
				enabled: true,
				folderPrefix: "",
			} as ChannelMapping;

			const result = await engine.syncChannel(mapping);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toEqual({
				blockId: 1,
				channelSlug: "test-channel",
				message: "Failed to pull block 1",
				recoverable: true,
			});

			pullBlockSpy.mockRestore();
			updateChannelIndexSpy.mockRestore();
			markMissingSpy.mockRestore();
			ensureFolderSpy.mockRestore();
		});
	});
});
