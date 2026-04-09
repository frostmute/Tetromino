import { App, Vault } from "obsidian";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS, ArenaChannel } from "../types";

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
				},
				{
					channelSlug: "enabled-channel",
					enabled: true,
					folderPrefix: "",
				},
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
			const updateMasterOverviewSpy = jest.spyOn(engine as unknown as Record<string, unknown>, "updateMasterOverview").mockResolvedValue(undefined);

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
				},
			];

			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const syncChannelSpy = jest.spyOn(engine, "syncChannel").mockRejectedValue(new Error("API failure"));
			const updateMasterOverviewSpy = jest.spyOn(engine as unknown as Record<string, unknown>, "updateMasterOverview").mockResolvedValue(undefined);

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
	});

	describe("syncChannel", () => {
		it("should fetch channel and call pull", async () => {
			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const channel: ArenaChannel = {
				id: 123,
				title: "Test Channel",
				slug: "test-channel",
				length: 1,
				published: true,
				created_at: "2026-01-01T00:00:00.000Z",
				updated_at: "2026-01-01T00:00:00.000Z",
				status: "public",
				open: false,
				collaboration: false,
				collaborators: [],
				follower_count: 0,
				total_connections: 1,
				user: {
					id: 1,
					slug: "tester",
					username: "tester",
					first_name: "Test",
					last_name: "User",
					avatar: "",
					channel_count: 1,
				},
				metadata: null,
			};

			mockApi.getChannel.mockResolvedValue(channel);

			const pullSpy = jest.spyOn(engine as unknown as Record<string, unknown>, "pull").mockResolvedValue(undefined);

			const mapping = {
				channelSlug: "test-channel",
				enabled: true,
				folderPrefix: "",
			};

			await engine.syncChannel(mapping, { dryRun: false });

			expect(mockApi.getChannel).toHaveBeenCalledWith("test-channel");
			expect(pullSpy).toHaveBeenCalledWith(mapping, channel, expect.any(Object), false);
			expect(mapping.channelId).toBe(123);
			expect(mapping.channelTitle).toBe("Test Channel");

			pullSpy.mockRestore();
		});

		it("should not update mapping state if dryRun is true", async () => {
			const engine = new SyncEngine(mockApp, mockApi, defaultSettings);

			const channel: ArenaChannel = {
				id: 123,
				title: "Test Channel",
				slug: "test-channel",
				length: 1,
				published: true,
				created_at: "2026-01-01T00:00:00.000Z",
				updated_at: "2026-01-01T00:00:00.000Z",
				status: "public",
				open: false,
				collaboration: false,
				collaborators: [],
				follower_count: 0,
				total_connections: 1,
				user: {
					id: 1,
					slug: "tester",
					username: "tester",
					first_name: "Test",
					last_name: "User",
					avatar: "",
					channel_count: 1,
				},
				metadata: null,
			};

			mockApi.getChannel.mockResolvedValue(channel);
			const pullSpy = jest.spyOn(engine as unknown as Record<string, unknown>, "pull").mockResolvedValue(undefined);

			const mapping = {
				channelSlug: "test-channel",
				enabled: true,
				folderPrefix: "",
			};

			await engine.syncChannel(mapping, { dryRun: true });

			expect(pullSpy).toHaveBeenCalledWith(mapping, channel, expect.any(Object), true);
			expect(mapping).not.toHaveProperty("channelId");
			expect(mapping).not.toHaveProperty("lastSyncedAt");

			pullSpy.mockRestore();
		});
	});
});
