import { App, TFile, Vault } from "obsidian";
import ArenaSyncPlugin from "../main";
import { DEFAULT_SETTINGS, ChannelMapping } from "../types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeTFile(path: string): TFile {
	const f = new TFile();
	f.path = path;
	f.name = path.split("/").pop() || "";
	f.basename = f.name.replace(/\.[^.]+$/, "");
	f.extension = f.name.split(".").pop() || "";
	return f;
}

function makeBackupData(mappings: ChannelMapping[]): Record<string, unknown> {
	return {
		createdAt: new Date().toISOString(),
		mappingCount: mappings.length,
		channelMappings: mappings,
	};
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("ArenaSyncPlugin backup restore", () => {
	let plugin: ArenaSyncPlugin;
	let mockFiles: TFile[];
	let mockFileContents: Record<string, string>;
	let readMock: jest.Mock;
	let getAbstractFileByPathMock: jest.Mock;
	let getFilesMock: jest.Mock;
	let createMock: jest.Mock;
	let createFolderMock: jest.Mock;
	let saveDataMock: jest.Mock;

	beforeEach(() => {
		mockFiles = [];
		mockFileContents = {};

		readMock = jest.fn(async (file: TFile) => mockFileContents[file.path] || "");
		getAbstractFileByPathMock = jest.fn((path: string) =>
			mockFiles.find((f) => f.path === path),
		);
		getFilesMock = jest.fn(() => mockFiles);
		createMock = jest.fn(async () => {});
		createFolderMock = jest.fn(async () => {});
		saveDataMock = jest.fn(async () => {});

		const app = {
			vault: {
				getFiles: getFilesMock,
				read: readMock,
				getAbstractFileByPath: getAbstractFileByPathMock,
				create: createMock,
				createFolder: createFolderMock,
			} as unknown as Vault,
			workspace: {
				onLayoutReady: () => {},
				getActiveFile: () => null,
			},
		} as App;

		plugin = new ArenaSyncPlugin(app, { id: "test", name: "Test" });
		plugin.settings = { ...DEFAULT_SETTINGS };
		plugin.saveData = saveDataMock;
	});

	/* ---------------------------------------------------------------- */
	/*  restoreChannelMappingsFromFile                                  */
	/* ---------------------------------------------------------------- */

	describe("restoreChannelMappingsFromFile", () => {
		it("restores mappings from a valid backup file", async () => {
			const mappings: ChannelMapping[] = [
				{
					channelSlug: "test-channel",
					channelId: 123,
					channelTitle: "Test Channel",
					localFolder: "Custom/Folder",
					lastSyncedAt: "2026-01-01T00:00:00.000Z",
					enabled: true,
					attachmentStorageOverride: null,
					customAttachmentFolderOverride: "",
					lastAttachmentBase: null,
				},
			];
			const file = makeTFile("Are.na/channel-mapping-backups/mappings-2026-01-01.json");
			mockFiles.push(file);
			mockFileContents[file.path] = JSON.stringify(makeBackupData(mappings));

			await plugin.restoreChannelMappingsFromFile(file.path);

			expect(plugin.settings.channelMappings).toHaveLength(1);
			expect(plugin.settings.channelMappings[0].channelSlug).toBe("test-channel");
			expect(plugin.settings.channelMappings[0].localFolder).toBe("Custom/Folder");
			expect(saveDataMock).toHaveBeenCalled();
		});

		it("throws when the file does not exist", async () => {
			await expect(
				plugin.restoreChannelMappingsFromFile("nonexistent.json"),
			).rejects.toThrow("File not found");
		});

		it("throws when the path is not a TFile", async () => {
			getAbstractFileByPathMock.mockReturnValue({ path: "folder" });
			await expect(
				plugin.restoreChannelMappingsFromFile("folder"),
			).rejects.toThrow("File not found");
		});

		it("throws when the file contains invalid JSON", async () => {
			const file = makeTFile("bad.json");
			mockFiles.push(file);
			mockFileContents[file.path] = "not json";

			await expect(
				plugin.restoreChannelMappingsFromFile(file.path),
			).rejects.toThrow();
		});

		it("throws when channelMappings is missing", async () => {
			const file = makeTFile("bad.json");
			mockFiles.push(file);
			mockFileContents[file.path] = JSON.stringify({ createdAt: "2026-01-01" });

			await expect(
				plugin.restoreChannelMappingsFromFile(file.path),
			).rejects.toThrow("invalid");
		});

		it("throws when channelMappings is not an array", async () => {
			const file = makeTFile("bad.json");
			mockFiles.push(file);
			mockFileContents[file.path] = JSON.stringify({ channelMappings: "nope" });

			await expect(
				plugin.restoreChannelMappingsFromFile(file.path),
			).rejects.toThrow("invalid");
		});

		it("normalizes mappings after restore", async () => {
			const mappings: ChannelMapping[] = [
				{
					channelSlug: "legacy",
					channelId: 1,
					channelTitle: "Legacy",
					localFolder: "",
					lastSyncedAt: null,
					enabled: true,
					// intentionally omitting newer fields to test normalization
				} as unknown as ChannelMapping,
			];
			const file = makeTFile("backup.json");
			mockFiles.push(file);
			mockFileContents[file.path] = JSON.stringify(makeBackupData(mappings));

			await plugin.restoreChannelMappingsFromFile(file.path);

			const restored = plugin.settings.channelMappings[0];
			expect(restored.attachmentStorageOverride).toBeNull();
			expect(restored.customAttachmentFolderOverride).toBe("");
			expect(restored.lastAttachmentBase).toBeNull();
		});
	});

	/* ---------------------------------------------------------------- */
	/*  restoreLatestChannelMappingsBackup (regression)                 */
	/* ---------------------------------------------------------------- */

	describe("restoreLatestChannelMappingsBackup", () => {
		it("restores from the most recent backup in the default folder", async () => {
			const oldMapping: ChannelMapping = {
				channelSlug: "old",
				channelId: 1,
				channelTitle: "Old",
				localFolder: "",
				lastSyncedAt: null,
				enabled: true,
				attachmentStorageOverride: null,
				customAttachmentFolderOverride: "",
				lastAttachmentBase: null,
			};
			const newMapping: ChannelMapping = {
				channelSlug: "new",
				channelId: 2,
				channelTitle: "New",
				localFolder: "",
				lastSyncedAt: null,
				enabled: true,
				attachmentStorageOverride: null,
				customAttachmentFolderOverride: "",
				lastAttachmentBase: null,
			};

			const oldFile = makeTFile("Are.na/channel-mapping-backups/mappings-2026-01-01_00-00-00.json");
			const newFile = makeTFile("Are.na/channel-mapping-backups/mappings-2026-01-02_00-00-00.json");
			mockFiles.push(oldFile, newFile);
			mockFileContents[oldFile.path] = JSON.stringify(makeBackupData([oldMapping]));
			mockFileContents[newFile.path] = JSON.stringify(makeBackupData([newMapping]));

			const path = await plugin.restoreLatestChannelMappingsBackup();

			expect(path).toBe(newFile.path);
			expect(plugin.settings.channelMappings).toHaveLength(1);
			expect(plugin.settings.channelMappings[0].channelSlug).toBe("new");
		});

		it("throws when no backups exist", async () => {
			await expect(plugin.restoreLatestChannelMappingsBackup()).rejects.toThrow(
				"No channel mapping backups found",
			);
		});

		it("throws when the latest backup is invalid", async () => {
			const file = makeTFile("Are.na/channel-mapping-backups/mappings-2026-01-01.json");
			mockFiles.push(file);
			mockFileContents[file.path] = JSON.stringify({});

			await expect(plugin.restoreLatestChannelMappingsBackup()).rejects.toThrow(
				"invalid",
			);
		});
	});
});
