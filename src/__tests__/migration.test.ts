import { App, TFile, Vault } from "obsidian";
import {
	buildMigrationPlan,
	executeMigration,
	computeCurrentAttachmentBase,
} from "../migration";
import { DEFAULT_SETTINGS } from "../types";

// Since the module uses "file instanceof TFile", we have to patch the mock to actually be instances of something
// The tests for obsidian mocks often just use prototype overriding or a dummy class.
class MockTFile {
	path: string;
	extension: string;
	basename: string;
	constructor(path: string, basename: string, extension: string) {
		this.path = path;
		this.basename = basename;
		this.extension = extension;
	}
}

describe("migration", () => {
	let app: App;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockFiles: any[];
	let mockFileContents: Record<string, string>;
	let readMock: jest.Mock;
	let getAbstractFileByPathMock: jest.Mock;
	let renameMock: jest.Mock;
	let modifyMock: jest.Mock;
	let createFolderMock: jest.Mock;

	beforeEach(() => {
		// Reset state
		mockFiles = [];
		mockFileContents = {};

		readMock = jest.fn(async (file) => mockFileContents[file.path] || "");
		getAbstractFileByPathMock = jest.fn((path) => mockFiles.find((f) => f.path === path));
		renameMock = jest.fn(async () => {});
		modifyMock = jest.fn(async () => {});
		createFolderMock = jest.fn(async () => {});

		app = {
			vault: {
				getFiles: () => mockFiles,
				read: readMock,
				getAbstractFileByPath: getAbstractFileByPathMock,
				rename: renameMock,
				modify: modifyMock,
				createFolder: createFolderMock,
			} as unknown as Vault,
		} as App;
	});

	describe("computeCurrentAttachmentBase", () => {
		it("returns the correct attachment base for a mapping", () => {
			const settings = { ...DEFAULT_SETTINGS, attachmentStorage: "custom" as const, customAttachmentFolder: "Custom/Assets" };
			const mapping = {
				channelSlug: "test",
				channelId: 1,
				channelTitle: "Test",
				localFolder: "",
				lastSyncedAt: null,
				enabled: true,
			};
			expect(computeCurrentAttachmentBase(settings, mapping)).toBe("Custom/Assets");
		});
	});

	describe("buildMigrationPlan", () => {
		it("skips disabled mappings", async () => {
			const settings = {
				...DEFAULT_SETTINGS,
				channelMappings: [
					{
						channelSlug: "test",
						channelId: 1,
						channelTitle: "Test",
						localFolder: "",
						lastSyncedAt: null,
						enabled: false,
						lastAttachmentBase: "Old/Path",
					},
				],
			};

			const plan = await buildMigrationPlan(app, settings);
			expect(plan.channels).toHaveLength(0);
		});

		it("skips if fromBase and toBase are the same", async () => {
			const settings = {
				...DEFAULT_SETTINGS,
				attachmentStorage: "global" as const,
				globalAttachmentFolder: "Are.na/Attachments",
				channelMappings: [
					{
						channelSlug: "test",
						channelId: 1,
						channelTitle: "Test",
						localFolder: "",
						lastSyncedAt: null,
						enabled: true,
						lastAttachmentBase: "Are.na/Attachments",
					},
				],
			};

			const plan = await buildMigrationPlan(app, settings);
			expect(plan.channels).toHaveLength(0);
		});

		it("detects updates and moves when attachment base changes", async () => {
			// Mock global TFile so `file instanceof TFile` works in `executeMigration` if needed,
			// though buildMigrationPlan doesn't use instanceof.
			const note = new MockTFile("Are.na/test/note.md", "note", "md");
			mockFiles.push(note);
			mockFileContents[note.path] = "Hello ![Old/Path/img.png] And [[Old/Path/img.png|Alias]]";

			const settings = {
				...DEFAULT_SETTINGS,
				attachmentStorage: "global" as const,
				globalAttachmentFolder: "New/Path", // The toBase
				channelMappings: [
					{
						channelSlug: "test",
						channelId: 1,
						channelTitle: "Test",
						localFolder: "",
						lastSyncedAt: null,
						enabled: true,
						lastAttachmentBase: "Old/Path", // The fromBase
					},
				],
			};

			const plan = await buildMigrationPlan(app, settings);

			expect(plan.channels).toHaveLength(1);
			expect(plan.totalMoves).toBe(1);
			expect(plan.totalUpdates).toBe(1);

			const channelPlan = plan.channels[0];
			expect(channelPlan.fromBase).toBe("Old/Path");
			expect(channelPlan.toBase).toBe("New/Path");

			expect(channelPlan.updates[0].path).toBe("Are.na/test/note.md");
			expect(channelPlan.updates[0].after).toBe("Hello ![New/Path/img.png] And [[New/Path/img.png|Alias]]");

			expect(channelPlan.moves[0].from).toBe("Old/Path/img.png");
			expect(channelPlan.moves[0].to).toBe("New/Path/img.png");
		});

		it("ignores files not in channel folder or not markdown", async () => {
			const note1 = new MockTFile("Other/Folder/note.md", "note", "md");
			const note2 = new MockTFile("Are.na/test/image.png", "image", "png");
			mockFiles.push(note1, note2);
			mockFileContents[note1.path] = "![Old/Path/img.png]";
			mockFileContents[note2.path] = "![Old/Path/img.png]";

			const settings = {
				...DEFAULT_SETTINGS,
				attachmentStorage: "global" as const,
				globalAttachmentFolder: "New/Path",
				channelMappings: [
					{
						channelSlug: "test",
						channelId: 1,
						channelTitle: "Test",
						localFolder: "",
						lastSyncedAt: null,
						enabled: true,
						lastAttachmentBase: "Old/Path",
					},
				],
			};

			const plan = await buildMigrationPlan(app, settings);
			expect(plan.channels).toHaveLength(0);
		});
	});

	describe("executeMigration", () => {
		it("creates folders, moves files, and updates contents", async () => {
			// To avoid instanceof TFile issues in tests where we can't easily patch the imported class,
			// let's pass a mock that might pass or modify our mock logic in obsidian.ts later.
			// Actually, since `file instanceof TFile` will fail if TFile is not exported from mock,
			// let's just make sure it passes.

			const plan = {
				channels: [
					{
						channelSlug: "test",
						fromBase: "Old/Path",
						toBase: "New/Path",
						moves: [
							{ from: "Old/Path/img.png", to: "New/Path/img.png" }
						],
						updates: [
							{ path: "note.md", before: "old", after: "new", diff: "" }
						]
					}
				],
				totalMoves: 1,
				totalUpdates: 1
			};

			const imgFile = Object.create(TFile.prototype);
			imgFile.path = "Old/Path/img.png";

			const noteFile = Object.create(TFile.prototype);
			noteFile.path = "note.md";

			mockFiles.push(imgFile, noteFile);

			getAbstractFileByPathMock.mockImplementation((path) => {
				if (path === "Old/Path/img.png") return imgFile;
				if (path === "note.md") return noteFile;
				// simulating existence of target file? No, it shouldn't exist
				return null;
			});

			const report = await executeMigration(app, plan);

			expect(createFolderMock).toHaveBeenCalledWith("New");
			expect(createFolderMock).toHaveBeenCalledWith("New/Path");
			expect(renameMock).toHaveBeenCalledWith(imgFile, "New/Path/img.png");
			expect(modifyMock).toHaveBeenCalledWith(noteFile, "new");
			expect(report.moved).toBe(1);
			expect(report.updated).toBe(1);
			expect(report.skipped).toBe(0);
			expect(report.errors).toHaveLength(0);
		});

		it("handles errors during move or update", async () => {
			const plan = {
				channels: [
					{
						channelSlug: "test",
						fromBase: "Old/Path",
						toBase: "New/Path",
						moves: [
							{ from: "Old/Path/img.png", to: "New/Path/img.png" }
						],
						updates: [
							{ path: "note.md", before: "old", after: "new", diff: "" }
						]
					}
				],
				totalMoves: 1,
				totalUpdates: 1
			};

			const imgFile = Object.create(TFile.prototype);
			const noteFile = Object.create(TFile.prototype);

			getAbstractFileByPathMock.mockImplementation((path) => {
				if (path === "Old/Path/img.png") return imgFile;
				if (path === "note.md") return noteFile;
				return null;
			});

			renameMock.mockRejectedValueOnce(new Error("Move failed"));
			modifyMock.mockRejectedValueOnce(new Error("Update failed"));

			const report = await executeMigration(app, plan);

			expect(report.moved).toBe(0);
			expect(report.updated).toBe(0);
			expect(report.errors).toHaveLength(2);
			expect(report.errors[0]).toContain("Move failed");
			expect(report.errors[1]).toContain("Update failed");
		});

		it("skips non-TFile instances or if target already exists", async () => {
			const plan = {
				channels: [
					{
						channelSlug: "test",
						fromBase: "Old/Path",
						toBase: "New/Path",
						moves: [
							{ from: "Old/Path/img.png", to: "New/Path/img.png" }
						],
						updates: [
							{ path: "note.md", before: "old", after: "new", diff: "" }
						]
					}
				],
				totalMoves: 1,
				totalUpdates: 1
			};

			// Not a TFile
			const imgFile = { path: "Old/Path/img.png" };
			const noteFile = { path: "note.md" };

			getAbstractFileByPathMock.mockImplementation((path) => {
				if (path === "Old/Path/img.png") return imgFile;
				if (path === "note.md") return noteFile;
				return null;
			});

			const report = await executeMigration(app, plan);

			expect(report.skipped).toBe(2);
			expect(report.moved).toBe(0);
			expect(report.updated).toBe(0);
		});
	});
});
