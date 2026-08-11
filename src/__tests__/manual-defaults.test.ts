/**
 * Regression tests for the "manual by default" change (commit a1acdb9):
 * - DEFAULT_SETTINGS.syncInterval is 0 and syncOnStartup is false.
 * - onload() never starts a background interval, never runs a sync on
 *   layout-ready, and never prompts for attachment migration.
 * - saveSettings() never prompts for attachment migration.
 * - Opt-in behavior still works: a saved syncInterval > 0 schedules a
 *   timer, a saved syncOnStartup: true triggers a sync on layout ready,
 *   and the user-triggered migration command still builds a plan.
 */
import { App, Vault } from "obsidian";
import {
	Notice as MockNotice,
	Setting as MockSetting,
	TextComponentLike,
} from "../__mocks__/obsidian";
import ArenaSyncPlugin from "../main";
import { SettingsTab } from "../settings-tab";
import { DEFAULT_SETTINGS, parseSyncIntervalInput } from "../types";

jest.mock("../migration", () => ({
	buildMigrationPlan: jest.fn(),
	computeCurrentAttachmentBase: jest.fn(() => "attachments"),
	executeMigration: jest.fn(),
}));

jest.mock("../modals", () => {
	class MockModal {
		open(): void {}
		close(): void {}
	}
	return {
		SyncSummaryModal: MockModal,
		MigrationPreviewModal: MockModal,
	};
});

function makeApp(overrides?: {
	onLayoutReady?: (cb: () => void) => void;
}): { app: App; onLayoutReadyMock: jest.Mock; saveDataMock: jest.Mock } {
	const onLayoutReadyMock = jest.fn(
		overrides?.onLayoutReady ?? ((cb: () => void) => cb()),
	);
	const saveDataMock = jest.fn(async () => {});
	const app = {
		vault: {
			getFiles: jest.fn(() => []),
			read: jest.fn(async () => ""),
			getAbstractFileByPath: jest.fn(() => undefined),
			create: jest.fn(async () => ({})),
			modify: jest.fn(async () => {}),
			createFolder: jest.fn(async () => {}),
		} as unknown as Vault,
		workspace: {
			onLayoutReady: onLayoutReadyMock,
			getActiveFile: () => null,
		},
	} as App;
	return { app, onLayoutReadyMock, saveDataMock };
}

function stubStatusBar(plugin: ArenaSyncPlugin): void {
	plugin.addStatusBarItem = jest.fn(() => {
		const el = document.createElement("div");
		(
			el as HTMLElement & { setText: (text: string) => void }
		).setText = (text: string) => {
			el.textContent = text;
		};
		return el;
	});
}

async function makeLoadedPlugin(loadData: unknown): Promise<{
	plugin: ArenaSyncPlugin;
	onLayoutReadyMock: jest.Mock;
	saveDataMock: jest.Mock;
}> {
	const { app, onLayoutReadyMock, saveDataMock } = makeApp();
	const plugin = new ArenaSyncPlugin(app, {
		id: "test",
		name: "Test",
		version: "0.0.0",
		minAppVersion: "1.0.0",
	});
	plugin.loadData = jest.fn(async () => loadData);
	plugin.saveData = saveDataMock;
	stubStatusBar(plugin);
	await plugin.onload();
	return { plugin, onLayoutReadyMock, saveDataMock };
}

describe("manual-by-default behavior (a1acdb9)", () => {
	describe("DEFAULT_SETTINGS", () => {
		it("disables background sync by default", () => {
			expect(DEFAULT_SETTINGS.syncInterval).toBe(0);
			expect(DEFAULT_SETTINGS.syncOnStartup).toBe(false);
		});
	});

	describe("onload with fresh (empty) saved data", () => {
		it("does not start a background interval timer", async () => {
			const setIntervalSpy = jest.spyOn(window, "setInterval");
			try {
				const { plugin } = await makeLoadedPlugin({});
				expect(setIntervalSpy).not.toHaveBeenCalled();
				expect(plugin["syncIntervalId"]).toBeNull();
			} finally {
				setIntervalSpy.mockRestore();
			}
		});

		it("does not sync on layout ready", async () => {
			const { onLayoutReadyMock } = await makeLoadedPlugin({});
			expect(onLayoutReadyMock).not.toHaveBeenCalled();
		});

		it("does not build a migration plan (no auto migration prompt)", async () => {
			const { buildMigrationPlan } = jest.requireMock("../migration");
			buildMigrationPlan.mockClear();
			await makeLoadedPlugin({});
			expect(buildMigrationPlan).not.toHaveBeenCalled();
		});
	});

	describe("onload with opted-in settings", () => {
		it("schedules an interval when saved syncInterval > 0", async () => {
			const setIntervalSpy = jest.spyOn(window, "setInterval");
			try {
				const { plugin } = await makeLoadedPlugin({ syncInterval: 30 });
				expect(setIntervalSpy).toHaveBeenCalledWith(
					expect.any(Function),
					30 * 60 * 1000,
				);
				expect(plugin["syncIntervalId"]).not.toBeNull();
			} finally {
				setIntervalSpy.mockRestore();
			}
		});

		it("fires a real sync when the scheduled interval ticks", async () => {
			let tick: (() => void) | null = null;
			const setIntervalSpy = jest
				.spyOn(window, "setInterval")
				.mockImplementation((cb: () => void) => {
					tick = cb;
					return 42 as unknown as number;
				});
			try {
				const { app } = makeApp();
				const plugin = new ArenaSyncPlugin(app, {
					id: "test",
					name: "Test",
					version: "0.0.0",
					minAppVersion: "1.0.0",
				});
				plugin.loadData = jest.fn(async () => ({ syncInterval: 30 }));
				plugin.saveData = jest.fn(async () => {});
				stubStatusBar(plugin);
				const runSyncSpy = jest
					.spyOn(plugin, "runSync")
					.mockResolvedValue(undefined);

				await plugin.onload();
				expect(tick).not.toBeNull();
				tick!();
				expect(runSyncSpy).toHaveBeenCalledWith(false);
			} finally {
				setIntervalSpy.mockRestore();
			}
		});

		it("runs a sync on layout ready when syncOnStartup is true", async () => {
			let layoutCb: (() => void) | null = null;
			const { app } = makeApp({
				onLayoutReady: (cb) => {
					layoutCb = cb;
				},
			});
			const plugin = new ArenaSyncPlugin(app, {
				id: "test",
				name: "Test",
				version: "0.0.0",
				minAppVersion: "1.0.0",
			});
			plugin.loadData = jest.fn(async () => ({ syncOnStartup: true }));
			plugin.saveData = jest.fn(async () => {});
			stubStatusBar(plugin);
			const runSyncSpy = jest.spyOn(plugin, "runSync").mockResolvedValue(undefined);

			await plugin.onload();
			// With syncOnStartup the callback is registered; without a token it
			// must still bail out safely when actually fired.
			expect(layoutCb).not.toBeNull();
			expect(runSyncSpy).not.toHaveBeenCalled();
			layoutCb!();
			expect(runSyncSpy).toHaveBeenCalledWith(false);
		});
	});

	describe("saveSettings", () => {
		it("does not prompt for migration after saving settings", async () => {
			const { buildMigrationPlan } = jest.requireMock("../migration");
			buildMigrationPlan.mockClear();
			const { plugin } = await makeLoadedPlugin({});
			await plugin.saveSettings();
			expect(buildMigrationPlan).not.toHaveBeenCalled();
		});

		it("reschedules the interval from saved settings", async () => {
			const setIntervalSpy = jest.spyOn(window, "setInterval");
			try {
				const { plugin } = await makeLoadedPlugin({ syncInterval: 15 });
				setIntervalSpy.mockClear();
				await plugin.saveSettings();
				expect(setIntervalSpy).toHaveBeenCalledWith(
					expect.any(Function),
					15 * 60 * 1000,
				);
			} finally {
				setIntervalSpy.mockRestore();
			}
		});
	});

	describe("syncInterval validation", () => {
		it.each([
			[-5],
			[NaN],
			[Infinity],
			["abc"],
			["30"],
			[null],
		])("rejects %p and falls back to 0 when saving settings", async (bad) => {
			const { plugin, saveDataMock } = await makeLoadedPlugin({
				syncInterval: 30,
			});
			plugin.settings.syncInterval = bad as unknown as number;
			await plugin.saveSettings();
			expect(plugin.settings.syncInterval).toBe(0);
			expect(saveDataMock).toHaveBeenCalledWith(
				expect.objectContaining({ syncInterval: 0 }),
			);
		});

		it.each([[-1], [NaN], ["abc"], ["30"]])(
			"repairs invalid %p from saved data on load and persists it",
			async (bad) => {
				const { plugin, saveDataMock } = await makeLoadedPlugin({
					syncInterval: bad as unknown as number,
				});
				expect(plugin.settings.syncInterval).toBe(0);
				expect(saveDataMock).toHaveBeenCalledWith(
					expect.objectContaining({ syncInterval: 0 }),
				);
			},
		);

		it("preserves a valid positive syncInterval through save", async () => {
			const { plugin, saveDataMock } = await makeLoadedPlugin({
				syncInterval: 15,
			});
			saveDataMock.mockClear();
			await plugin.saveSettings();
			expect(plugin.settings.syncInterval).toBe(15);
			expect(saveDataMock).toHaveBeenCalledWith(
				expect.objectContaining({ syncInterval: 15 }),
			);
		});

		it("never schedules an interval for invalid syncInterval values", async () => {
			const setIntervalSpy = jest.spyOn(window, "setInterval");
			try {
				const { plugin } = await makeLoadedPlugin({ syncInterval: 30 });
				setIntervalSpy.mockClear();
				for (const bad of [-1, NaN, Infinity, "30"]) {
					plugin.settings.syncInterval = bad as unknown as number;
					plugin["rescheduleInterval"]();
				}
				expect(setIntervalSpy).not.toHaveBeenCalled();
			} finally {
				setIntervalSpy.mockRestore();
			}
		});
	});

	describe("parseSyncIntervalInput", () => {
		it.each([
			["0", 0],
			["30", 30],
			["0.5", 0.5],
			[" 45 ", 45],
			["", 0],
			["   ", 0],
		])("accepts %p as %p", (input, expected) => {
			expect(parseSyncIntervalInput(input)).toBe(expected);
		});

		it.each([["abc"], ["-5"], ["30abc"], ["1.5x"], ["Infinity"], ["0x10"], ["1e3"]])(
			"rejects %p",
			(input) => {					expect(parseSyncIntervalInput(input)).toBeNull();
				},
			);
		});

		describe("sync interval settings tab input", () => {


		function stubDomExtensions(el: HTMLElement): void {
			const ext = el as unknown as {
				empty(): void;
				addClass(c: string): void;
				createEl(
					tag: string,
					opts?: { text?: string; cls?: string },
				): HTMLElement;
				createDiv(opts?: { text?: string; cls?: string }): HTMLElement;
			};
			ext.empty = () => {
				while (el.firstChild) el.removeChild(el.firstChild);
			};
			ext.addClass = (c: string) => {
				el.classList.add(c);
			};
			ext.createEl = (tag, opts) => {
				const child = document.createElement(tag);
				if (opts?.text) child.textContent = opts.text;
				if (opts?.cls) child.className = opts.cls;
				el.appendChild(child);
				return child;
			};
			ext.createDiv = (opts) => ext.createEl("div", opts);
		}

		function renderTab(plugin: ArenaSyncPlugin): TextComponentLike {
			const tab = new SettingsTab(plugin.app, plugin);
			stubDomExtensions(tab.containerEl);
			tab.display();
			const field = MockSetting.textComponents.find(
				(c) => c.placeholder === "0",
			);
			expect(field).toBeDefined();
			return field!;
		}

		it("rejects invalid input with a Notice, keeps the previous value, and does not save", async () => {
			const { plugin, saveDataMock } = await makeLoadedPlugin({
				syncInterval: 30,
			});
			saveDataMock.mockClear();
			MockNotice.instances.length = 0;
			MockSetting.textComponents.length = 0;

			const field = renderTab(plugin);
			expect(field.value).toBe("30");

			await field.onChangeFn!("abc");
			expect(plugin.settings.syncInterval).toBe(30);
			expect(saveDataMock).not.toHaveBeenCalled();
			expect(field.value).toBe("30");
			expect(
				MockNotice.instances.some((n) =>
						n.message.includes("Sync interval must be"),
					),
				).toBe(true);

			await field.onChangeFn!("-5");
			expect(plugin.settings.syncInterval).toBe(30);
			expect(saveDataMock).not.toHaveBeenCalled();

			await field.onChangeFn!("45");
			expect(plugin.settings.syncInterval).toBe(45);
			expect(saveDataMock).toHaveBeenCalledWith(
				expect.objectContaining({ syncInterval: 45 }),
			);
		});

		it("treats empty input as disabled (0)", async () => {
			const { plugin, saveDataMock } = await makeLoadedPlugin({
				syncInterval: 30,
			});
			saveDataMock.mockClear();
			MockSetting.textComponents.length = 0;

			const field = renderTab(plugin);
			await field.onChangeFn!("");
			expect(plugin.settings.syncInterval).toBe(0);
			expect(saveDataMock).toHaveBeenCalledWith(
				expect.objectContaining({ syncInterval: 0 }),
			);
		});

		it("renders settings when Obsidian opens the tab", async () => {
			const { plugin } = await makeLoadedPlugin({});
			const tab = new SettingsTab(plugin.app, plugin);
			stubDomExtensions(tab.containerEl);

			tab.display();

			expect(tab.containerEl.textContent).toContain(
				"Deterministic one-way import from Are.na into your Obsidian vault.",
			);
		});
	});

	describe("user-triggered migration", () => {
		it("still builds a plan and opens the preview modal via the command", async () => {
			const { buildMigrationPlan } = jest.requireMock("../migration");
			const { MigrationPreviewModal } = jest.requireMock("../modals");
			const openSpy = jest
				.spyOn(MigrationPreviewModal.prototype, "open")
				.mockImplementation(() => {});
			try {
				buildMigrationPlan.mockResolvedValue({
					channels: [{ channelSlug: "test-channel" }],
				});
				const { plugin } = await makeLoadedPlugin({});
				buildMigrationPlan.mockClear();
				await plugin.checkForMigrationPrompt(true);
				expect(buildMigrationPlan).toHaveBeenCalledTimes(1);
				expect(openSpy).toHaveBeenCalledTimes(1);
			} finally {
				openSpy.mockRestore();
			}
		});
	});
});
