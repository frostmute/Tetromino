import { App, TFile, Vault } from "obsidian";
import ArenaSyncPlugin from "../main";
import { ChannelMapping, SyncResult } from "../types";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";

jest.mock("../migration", () => ({
	buildMigrationPlan: jest.fn(),
	computeCurrentAttachmentBase: jest.fn(() => "attachments"),
	executeMigration: jest.fn(),
}));

function makeTFile(path: string): TFile {
	const f = new TFile();
	f.path = path;
	f.name = path.split("/").pop() || "";
	f.basename = f.name.replace(/\.[^.]+$/, "");
	f.extension = f.name.split(".").pop() || "";
	return f;
}

function makeMapping(overrides?: Partial<ChannelMapping>): ChannelMapping {
	return {
		channelSlug: "test-channel",
		channelId: 1,
		channelTitle: "Test Channel",
		localFolder: "",
		lastSyncedAt: null,
		enabled: true,
		attachmentStorageOverride: null,
		customAttachmentFolderOverride: "",
		lastAttachmentBase: null,
		...overrides,
	};
}

function makeSyncResult(overrides?: Partial<SyncResult>): SyncResult {
	return {
		created: 0,
		updated: 0,
		moved: 0,
		deleted: 0,
		skipped: 0,
		downloaded: 0,
		errors: [],
		actions: [],
		fileDiffs: [],
		duration: 1000,
		dryRun: false,
		...overrides,
	};
}

describe("ArenaSyncPlugin", () => {
	let plugin: ArenaSyncPlugin;
	let mockFiles: TFile[];
	let mockFileContents: Record<string, string>;
	let readMock: jest.Mock;
	let getAbstractFileByPathMock: jest.Mock;
	let getFilesMock: jest.Mock;
	let createMock: jest.Mock;
	let modifyMock: jest.Mock;
	let createFolderMock: jest.Mock;
	let saveDataMock: jest.Mock;
	let loadDataMock: jest.Mock;

	beforeEach(() => {
		const { buildMigrationPlan } = jest.requireMock("../migration");
		buildMigrationPlan.mockResolvedValue({ channels: [] });

		mockFiles = [];
		mockFileContents = {};

		readMock = jest.fn(async (file: TFile) => mockFileContents[file.path] || "");
		getAbstractFileByPathMock = jest.fn((path: string) =>
			mockFiles.find((f) => f.path === path),
		);
		getFilesMock = jest.fn(() => mockFiles);
		createMock = jest.fn(async (path: string, content: string) => {
			const file = makeTFile(path);
			mockFiles.push(file);
			mockFileContents[path] = content;
			return file;
		});
		modifyMock = jest.fn(async (file: TFile, content: string) => {
			mockFileContents[file.path] = content;
		});
		createFolderMock = jest.fn(async () => {});
		saveDataMock = jest.fn(async () => {});
		loadDataMock = jest.fn(async () => ({}));

		const app = {
			vault: {
				getFiles: getFilesMock,
				read: readMock,
				getAbstractFileByPath: getAbstractFileByPathMock,
				create: createMock,
				modify: modifyMock,
				createFolder: createFolderMock,
			} as unknown as Vault,
			workspace: {
				onLayoutReady: jest.fn((cb: () => void) => cb()),
				getActiveFile: () => null,
			},
		} as App;

		plugin = new ArenaSyncPlugin(app, { id: "test", name: "Test" });
		plugin.saveData = saveDataMock;
		plugin.loadData = loadDataMock;
		plugin.addStatusBarItem = jest.fn(() => {
			const el = document.createElement("div");
			(el as HTMLElement & { setText: (text: string) => void }).setText = (text: string) => {
				el.textContent = text;
			};
			return el;
		});
	});

	/* ---------------------------------------------------------------- */
	/*  loadSettings                                                    */
	/* ---------------------------------------------------------------- */

	describe("loadSettings", () => {
		it("merges saved data with defaults", async () => {
			loadDataMock.mockResolvedValue({ apiToken: "secret" });
			await plugin.loadSettings();
			expect(plugin.settings.apiToken).toBe("secret");
			expect(plugin.settings.channelMappings).toEqual([]);
		});

		it("normalizes legacy mappings", async () => {
			loadDataMock.mockResolvedValue({
				channelMappings: [
					{ channelSlug: "legacy", channelId: 1, channelTitle: "Legacy" },
				],
			});
			await plugin.loadSettings();
			expect(plugin.settings.channelMappings[0].attachmentStorageOverride).toBeNull();
			expect(plugin.settings.channelMappings[0].customAttachmentFolderOverride).toBe("");
			expect(plugin.settings.channelMappings[0].lastAttachmentBase).toBe("attachments");
		});

		it("saves settings when normalization changes data", async () => {
			loadDataMock.mockResolvedValue({
				channelMappings: [
					{
						channelSlug: "legacy",
						channelId: 1,
						channelTitle: "Legacy",
						attachmentStorageOverride: undefined,
					},
				],
			});
			await plugin.loadSettings();
			expect(saveDataMock).toHaveBeenCalled();
		});
	});

	/* ---------------------------------------------------------------- */
	/*  saveSettings                                                    */
	/* ---------------------------------------------------------------- */

	describe("saveSettings", () => {
		it("recreates api and engine", async () => {
			plugin.settings.apiToken = "new-token";
			plugin.settings.debugLogging = true;
			await plugin.saveSettings();
			expect(plugin.api).toBeInstanceOf(ArenaApi);
			expect(plugin.engine).toBeInstanceOf(SyncEngine);
		});

		it("calls saveData", async () => {
			await plugin.saveSettings();
			expect(saveDataMock).toHaveBeenCalledWith(plugin.settings);
		});
	});

	/* ---------------------------------------------------------------- */
	/*  runSync                                                         */
	/* ---------------------------------------------------------------- */

	describe("runSync", () => {
		beforeEach(() => {
			plugin.settings.apiToken = "token";
			plugin.settings.channelMappings = [makeMapping()];
		});

		it("returns early if already syncing", async () => {
			plugin.isSyncing = true;
			const result = await plugin.runSync(false);
			expect(result).toBeUndefined();
		});

		it("returns early if migration is running", async () => {
			plugin.isMigrating = true;
			const result = await plugin.runSync(false);
			expect(result).toBeUndefined();
		});

		it("returns early if no API token", async () => {
			plugin.settings.apiToken = "";
			const result = await plugin.runSync(false);
			expect(result).toBeUndefined();
		});

		it("returns early if no valid mappings", async () => {
			plugin.settings.channelMappings = [];
			const result = await plugin.runSync(false);
			expect(result).toBeUndefined();
		});

		it("returns early if all mappings are disabled", async () => {
			plugin.settings.channelMappings = [makeMapping({ enabled: false })];
			const result = await plugin.runSync(false);
			expect(result).toBeUndefined();
		});

		it("returns early if mapping has empty slug", async () => {
			plugin.settings.channelMappings = [makeMapping({ channelSlug: "  " })];
			const result = await plugin.runSync(false);
			expect(result).toBeUndefined();
		});

		it("runs syncAll and writes report on success", async () => {
			const syncResult = makeSyncResult({ created: 2 });
			const syncAllMock = jest.fn().mockResolvedValue(syncResult);
			plugin.engine = { syncAll: syncAllMock } as unknown as SyncEngine;

			await plugin.runSync(false);

			expect(syncAllMock).toHaveBeenCalledWith({ dryRun: false });
			expect(saveDataMock).toHaveBeenCalled();
			expect(createMock).toHaveBeenCalledWith(
				"Are.na/import-history.md",
				expect.stringContaining("created: 2"),
			);
		});

		it("does not write report or save settings in dry-run", async () => {
			const syncResult = makeSyncResult({ created: 1, dryRun: true });
			const syncAllMock = jest.fn().mockResolvedValue(syncResult);
			plugin.engine = { syncAll: syncAllMock } as unknown as SyncEngine;

			await plugin.runSync(true);

			expect(syncAllMock).toHaveBeenCalledWith({ dryRun: true });
			expect(saveDataMock).not.toHaveBeenCalled();
			expect(createMock).not.toHaveBeenCalledWith(
				"Are.na/import-history.md",
				expect.anything(),
			);
		});

		it("shows notice on error", async () => {
			const syncAllMock = jest.fn().mockRejectedValue(new Error("boom"));
			plugin.engine = { syncAll: syncAllMock } as unknown as SyncEngine;

			await plugin.runSync(false);
			expect(plugin.isSyncing).toBe(false);
		});
	});

	/* ---------------------------------------------------------------- */
	/*  runChannelSync                                                  */
	/* ---------------------------------------------------------------- */

	describe("runChannelSync", () => {
		beforeEach(() => {
			plugin.settings.apiToken = "token";
			plugin.settings.channelMappings = [makeMapping()];
		});

		it("returns early if already syncing", async () => {
			plugin.isSyncing = true;
			await plugin.runChannelSync("test-channel", false);
			expect(plugin.isSyncing).toBe(true);
		});

		it("returns early if migration is running", async () => {
			plugin.isMigrating = true;
			await plugin.runChannelSync("test-channel", false);
			expect(plugin.isMigrating).toBe(true);
		});

		it("returns early if mapping not found", async () => {
			await plugin.runChannelSync("missing", false);
			expect(plugin.isSyncing).toBe(false);
		});

		it("returns early if mapping is disabled", async () => {
			plugin.settings.channelMappings = [makeMapping({ enabled: false })];
			await plugin.runChannelSync("test-channel", false);
			expect(plugin.isSyncing).toBe(false);
		});

		it("returns early if slug is empty", async () => {
			plugin.settings.channelMappings = [makeMapping({ channelSlug: "  " })];
			await plugin.runChannelSync("  ", false);
			expect(plugin.isSyncing).toBe(false);
		});

		it("syncs channel and writes report", async () => {
			const syncResult = makeSyncResult({ updated: 3 });
			const syncChannelMock = jest.fn().mockResolvedValue(syncResult);
			plugin.engine = { syncChannel: syncChannelMock } as unknown as SyncEngine;

			await plugin.runChannelSync("test-channel", false);

			expect(syncChannelMock).toHaveBeenCalledWith(
				expect.objectContaining({ channelSlug: "test-channel" }),
				{ dryRun: false },
			);
			expect(saveDataMock).toHaveBeenCalled();
			expect(createMock).toHaveBeenCalledWith(
				"Are.na/import-history.md",
				expect.stringContaining("updated: 3"),
			);
		});

		it("does not write report in dry-run", async () => {
			const syncResult = makeSyncResult({ dryRun: true });
			const syncChannelMock = jest.fn().mockResolvedValue(syncResult);
			plugin.engine = { syncChannel: syncChannelMock } as unknown as SyncEngine;

			await plugin.runChannelSync("test-channel", true);
			expect(saveDataMock).not.toHaveBeenCalled();
		});
	});

	/* ---------------------------------------------------------------- */
	/*  updateStatusBar / updateProgressStatus                          */
	/* ---------------------------------------------------------------- */

	describe("updateStatusBar", () => {
		it("sets syncing text", async () => {
			await plugin.onload();
			plugin["updateStatusBar"]("syncing", "working...");
			expect(plugin["statusBarItem"].textContent).toBe("working...");
		});

		it("clears text when idle", async () => {
			await plugin.onload();
			plugin["updateStatusBar"]("idle");
			expect(plugin["statusBarItem"].textContent).toBe("");
		});
	});

	describe("updateProgressStatus", () => {
		it("updates status bar with page progress", async () => {
			await plugin.onload();
			plugin.isSyncing = true;
			plugin["updateProgressStatus"]({
				channelSlug: "chan",
				phase: "pages",
				current: 2,
				total: 5,
			});
			expect(plugin["statusBarItem"].textContent).toContain("chan");
			expect(plugin["statusBarItem"].textContent).toContain("pages 2/5");
		});

		it("updates status bar with block progress", async () => {
			await plugin.onload();
			plugin.isSyncing = true;
			plugin["updateProgressStatus"]({
				channelSlug: "chan",
				phase: "blocks",
				current: 10,
				total: 20,
			});
			expect(plugin["statusBarItem"].textContent).toContain("blocks 10/20");
		});

		it("does nothing when not syncing", async () => {
			await plugin.onload();
			plugin.isSyncing = false;
			plugin["updateProgressStatus"]({
				channelSlug: "chan",
				phase: "pages",
				current: 1,
				total: 1,
			});
			expect(plugin["statusBarItem"].textContent).toBe("");
		});
	});

	/* ---------------------------------------------------------------- */
	/*  notifySyncResult                                                */
	/* ---------------------------------------------------------------- */

	describe("notifySyncResult", () => {
		it("shows notice with all fields", () => {
			plugin.settings.notifyOnSync = true;
			const result = makeSyncResult({
				created: 1,
				updated: 2,
				moved: 3,
				deleted: 4,
				downloaded: 5,
				skipped: 6,
				errors: ["err"],
			});
			plugin["notifySyncResult"](result);
			// Should not throw; Notice constructor stores message
		});

		it("shows preview prefix in dry-run", () => {
			plugin.settings.notifyOnSync = true;
			const result = makeSyncResult({ dryRun: true, created: 1 });
			plugin["notifySyncResult"](result);
		});

		it("shows 'no changes' when all counts are zero", () => {
			plugin.settings.notifyOnSync = true;
			const result = makeSyncResult();
			plugin["notifySyncResult"](result);
		});

		it("does nothing when notifications are disabled", () => {
			plugin.settings.notifyOnSync = false;
			const result = makeSyncResult({ created: 1 });
			plugin["notifySyncResult"](result);
		});
	});

	/* ---------------------------------------------------------------- */
	/*  writeImportReport                                               */
	/* ---------------------------------------------------------------- */

	describe("writeImportReport", () => {
		it("creates report file if it does not exist", async () => {
			const result = makeSyncResult({ created: 5 });
			await plugin["writeImportReport"](result, "all");
			expect(createMock).toHaveBeenCalledWith(
				"Are.na/import-history.md",
				expect.stringContaining("created: 5"),
			);
		});

		it("appends to existing report file", async () => {
			const file = makeTFile("Are.na/import-history.md");
			mockFiles.push(file);
			mockFileContents[file.path] = "# Existing\n";
			const result = makeSyncResult({ updated: 3 });
			await plugin["writeImportReport"](result, "all");
			expect(modifyMock).toHaveBeenCalledWith(
				file,
				expect.stringContaining("updated: 3"),
			);
		});

		it("creates folder if missing", async () => {
			await plugin["writeImportReport"](makeSyncResult(), "all");
			expect(createFolderMock).toHaveBeenCalledWith("Are.na");
		});
	});

	/* ---------------------------------------------------------------- */
	/*  importMyChannelsMappings                                        */
	/* ---------------------------------------------------------------- */

	describe("importMyChannelsMappings", () => {
		it("throws if no API token", async () => {
			plugin.settings.apiToken = "";
			await expect(plugin.importMyChannelsMappings()).rejects.toThrow(
				"Please set your API token first.",
			);
		});

		it("creates new mappings and updates existing ones", async () => {
			plugin.settings.apiToken = "token";
			plugin.settings.channelMappings = [
				makeMapping({ channelSlug: "existing", channelId: 1, channelTitle: "Old" }),
			];
			plugin.api = {
				listAllMyChannels: jest.fn().mockResolvedValue([
					{ slug: "existing", id: 2, title: "New" },
					{ slug: "new-channel", id: 3, title: "New Channel" },
				]),
			} as unknown as ArenaApi;

			const result = await plugin.importMyChannelsMappings();

			expect(result.created).toBe(1);
			expect(result.updated).toBe(1);
			expect(result.totalRemote).toBe(2);
			expect(plugin.settings.channelMappings).toHaveLength(2);
			expect(plugin.settings.channelMappings[0].channelId).toBe(2);
			expect(plugin.settings.channelMappings[0].channelTitle).toBe("New");
		});
	});

	/* ---------------------------------------------------------------- */
	/*  resetChannelMappings                                            */
	/* ---------------------------------------------------------------- */

	describe("resetChannelMappings", () => {
		it("clears all mappings and saves", async () => {
			plugin.settings.channelMappings = [makeMapping()];
			await plugin.resetChannelMappings();
			expect(plugin.settings.channelMappings).toEqual([]);
			expect(saveDataMock).toHaveBeenCalled();
		});
	});

	/* ---------------------------------------------------------------- */
	/*  backupChannelMappings                                           */
	/* ---------------------------------------------------------------- */

	describe("backupChannelMappings", () => {
		it("creates a backup file with current mappings", async () => {
			plugin.settings.channelMappings = [makeMapping()];
			const path = await plugin.backupChannelMappings();
			expect(path).toContain("Are.na/channel-mapping-backups/mappings-");
			expect(createMock).toHaveBeenCalledWith(
				path,
				expect.stringContaining("test-channel"),
			);
		});
	});

	/* ---------------------------------------------------------------- */
	/*  normalizeMappings                                               */
	/* ---------------------------------------------------------------- */

	describe("normalizeMappings", () => {
		it("adds missing fields to legacy mappings", () => {
			plugin.settings.channelMappings = [
				{ channelSlug: "x", channelId: 1, channelTitle: "X" } as ChannelMapping,
			];
			const changed = plugin["normalizeMappings"]();
			expect(changed).toBe(true);
			const m = plugin.settings.channelMappings[0];
			expect(m.attachmentStorageOverride).toBeNull();
			expect(m.customAttachmentFolderOverride).toBe("");
			expect(m.lastAttachmentBase).toBeNull();
		});

		it("returns false when nothing changes", () => {
			plugin.settings.channelMappings = [makeMapping()];
			const changed = plugin["normalizeMappings"]();
			expect(changed).toBe(false);
		});
	});

	/* ---------------------------------------------------------------- */
	/*  ensureAttachmentBaseSnapshots                                   */
	/* ---------------------------------------------------------------- */

	describe("ensureAttachmentBaseSnapshots", () => {
		it("sets lastAttachmentBase when missing", () => {
			plugin.settings.channelMappings = [makeMapping({ lastAttachmentBase: null })];
			const changed = plugin["ensureAttachmentBaseSnapshots"]();
			expect(changed).toBe(true);
			expect(plugin.settings.channelMappings[0].lastAttachmentBase).toBe("attachments");
		});

		it("returns false when base already exists", () => {
			plugin.settings.channelMappings = [
				makeMapping({ lastAttachmentBase: "existing" }),
			];
			const changed = plugin["ensureAttachmentBaseSnapshots"]();
			expect(changed).toBe(false);
		});
	});

	/* ---------------------------------------------------------------- */
	/*  createMappingFromChannel                                        */
	/* ---------------------------------------------------------------- */

	describe("createMappingFromChannel", () => {
		it("creates a mapping with autoEnableImportedChannels", () => {
			plugin.settings.autoEnableImportedChannels = true;
			const mapping = plugin["createMappingFromChannel"]({
				slug: "chan",
				id: 1,
				title: "Chan",
			});
			expect(mapping.channelSlug).toBe("chan");
			expect(mapping.enabled).toBe(true);
			expect(mapping.localFolder).toBe("");
		});
	});

	/* ---------------------------------------------------------------- */
	/*  ensureFolder                                                    */
	/* ---------------------------------------------------------------- */

	describe("ensureFolder", () => {
		it("creates nested folders", async () => {
			await plugin["ensureFolder"]("a/b/c");
			expect(createFolderMock).toHaveBeenCalledWith("a");
			expect(createFolderMock).toHaveBeenCalledWith("a/b");
			expect(createFolderMock).toHaveBeenCalledWith("a/b/c");
		});

		it("skips existing folders", async () => {
			mockFiles.push(makeTFile("a"));
			await plugin["ensureFolder"]("a/b");
			expect(createFolderMock).not.toHaveBeenCalledWith("a");
			expect(createFolderMock).toHaveBeenCalledWith("a/b");
		});
	});

	/* ---------------------------------------------------------------- */
	/*  runMigration                                                    */
	/* ---------------------------------------------------------------- */

	describe("runMigration", () => {
		it("returns early if already migrating", async () => {
			plugin.isMigrating = true;
			await plugin.runMigration();
			expect(plugin.isMigrating).toBe(true);
		});

		it("returns early if plan has no channels", async () => {
			const { buildMigrationPlan } = jest.requireMock("../migration");
			buildMigrationPlan.mockResolvedValue({ channels: [] });
			await plugin.runMigration();
			expect(plugin.isMigrating).toBe(false);
		});

		it("runs migration and writes report", async () => {
			const { buildMigrationPlan, executeMigration } = jest.requireMock("../migration");
			buildMigrationPlan.mockResolvedValue({
				channels: [{ channelSlug: "test-channel", toBase: "new-base" }],
			});
			executeMigration.mockResolvedValue({
				moved: 5,
				updated: 3,
				skipped: 1,
				errors: [],
				duration: 1000,
			});
			plugin.settings.channelMappings = [makeMapping()];

			await plugin.runMigration();

			expect(plugin.settings.channelMappings[0].lastAttachmentBase).toBe("new-base");
			expect(saveDataMock).toHaveBeenCalled();
			expect(createMock).toHaveBeenCalledWith(
				"Are.na/migration-history.md",
				expect.stringContaining("moved: 5"),
			);
		});
	});

	/* ---------------------------------------------------------------- */
	/*  writeMigrationReport                                            */
	/* ---------------------------------------------------------------- */

	describe("writeMigrationReport", () => {
		it("creates migration report file", async () => {
			const report = {
				moved: 2,
				updated: 1,
				skipped: 0,
				errors: ["err1"],
				duration: 500,
			};
			await plugin["writeMigrationReport"](report);
			expect(createMock).toHaveBeenCalledWith(
				"Are.na/migration-history.md",
				expect.stringContaining("err1"),
			);
		});

		it("appends to existing migration report", async () => {
			const file = makeTFile("Are.na/migration-history.md");
			mockFiles.push(file);
			mockFileContents[file.path] = "# Existing\n";
			const report = { moved: 1, updated: 0, skipped: 0, errors: [], duration: 100 };
			await plugin["writeMigrationReport"](report);
			expect(modifyMock).toHaveBeenCalled();
		});
	});

	/* ---------------------------------------------------------------- */
	/*  rescheduleInterval                                              */
	/* ---------------------------------------------------------------- */

	describe("rescheduleInterval", () => {
		it("sets interval when syncInterval > 0", () => {
			plugin.settings.syncInterval = 1;
			const setIntervalSpy = jest.spyOn(window, "setInterval").mockReturnValue(123 as unknown as NodeJS.Timeout);
			const clearIntervalSpy = jest.spyOn(window, "clearInterval").mockImplementation(() => {});

			plugin["rescheduleInterval"]();

			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				60000,
			);
			expect(plugin["syncIntervalId"]).toBe(123);

			setIntervalSpy.mockRestore();
			clearIntervalSpy.mockRestore();
		});

		it("clears existing interval before setting new one", () => {
			plugin.settings.syncInterval = 1;
			plugin["syncIntervalId"] = 99 as unknown as number;
			const clearIntervalSpy = jest.spyOn(window, "clearInterval").mockImplementation(() => {});
			const setIntervalSpy = jest.spyOn(window, "setInterval").mockReturnValue(123 as unknown as NodeJS.Timeout);

			plugin["rescheduleInterval"]();

			expect(clearIntervalSpy).toHaveBeenCalledWith(99);

			setIntervalSpy.mockRestore();
			clearIntervalSpy.mockRestore();
		});

		it("does nothing when syncInterval is 0", () => {
			plugin.settings.syncInterval = 0;
			const setIntervalSpy = jest.spyOn(window, "setInterval");
			plugin["rescheduleInterval"]();
			expect(setIntervalSpy).not.toHaveBeenCalled();
			setIntervalSpy.mockRestore();
		});
	});
});
