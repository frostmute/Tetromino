import {addIcon, normalizePath, Notice, Plugin, TFile} from "obsidian";
import {ArenaApi} from "./api";
import {SyncEngine} from "./sync-engine";
import {ArenaSyncSettingTab} from "./settings-tab";
import type {ArenaSyncSettings, ImportProgress, SyncResult} from "./types";
import {DEFAULT_SETTINGS} from "./types";

const ARENA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><rect x="15" y="15" width="30" height="30" rx="4"/><rect x="55" y="15" width="30" height="30" rx="4"/><rect x="15" y="55" width="30" height="30" rx="4"/><rect x="55" y="55" width="30" height="30" rx="4"/><line x1="45" y1="30" x2="55" y2="30"/><line x1="30" y1="45" x2="30" y2="55"/><line x1="70" y1="45" x2="70" y2="55"/></svg>`;

export default class ArenaSyncPlugin extends Plugin {
	settings: ArenaSyncSettings = DEFAULT_SETTINGS;
	api!: ArenaApi;
	engine!: SyncEngine;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private isSyncing = false;
	private statusBarItem: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.api = new ArenaApi(this.settings.apiToken, this.settings.debugLogging);
		this.engine = new SyncEngine(
			this.app,
			this.api,
			this.settings,
			(progress) => this.updateProgressStatus(progress)
		);

		addIcon("arena-sync", ARENA_ICON);
		this.addRibbonIcon("arena-sync", "Import from Are.na", async () => {
			await this.runSync(false);
		});

		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar("idle");

		this.addCommand({
			id: "arena-sync-now",
			name: "Import all channels now",
			callback: async () => await this.runSync(false),
		});

		this.addCommand({
			id: "arena-sync-preview",
			name: "Preview import (dry-run)",
			callback: async () => await this.runSync(true),
		});

		this.addCommand({
			id: "arena-sync-channel",
			name: "Import current channel",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const mapping = this.settings.channelMappings.find((m) =>
					file.path.startsWith(m.localFolder)
				);
				if (!mapping) return false;
				if (checking) return true;
				this.runChannelSync(mapping.channelSlug, false);
				return true;
			},
		});

		this.addCommand({
			id: "arena-sync-channel-preview",
			name: "Preview current channel import (dry-run)",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const mapping = this.settings.channelMappings.find((m) =>
					file.path.startsWith(m.localFolder)
				);
				if (!mapping) return false;
				if (checking) return true;
				this.runChannelSync(mapping.channelSlug, true);
				return true;
			},
		});

		this.addCommand({
			id: "arena-sync-open-channel",
			name: "Open channel on Are.na",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const mapping = this.settings.channelMappings.find((m) =>
					file.path.startsWith(m.localFolder)
				);
				if (!mapping) return false;
				if (checking) return true;
				window.open(
					`https://www.are.na/channel/${mapping.channelSlug}`,
					"_blank"
				);
				return true;
			},
		});

		this.addSettingTab(new ArenaSyncSettingTab(this.app, this));
		this.resetSyncTimer();

		if (this.settings.syncOnStartup && this.settings.apiToken) {
			setTimeout(() => this.runSync(false), 3000);
		}
	}

	onunload(): void {
		this.clearSyncTimer();
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.api = new ArenaApi(this.settings.apiToken, this.settings.debugLogging);
		this.engine = new SyncEngine(
			this.app,
			this.api,
			this.settings,
			(progress) => this.updateProgressStatus(progress)
		);
	}

	async runSync(dryRun = false): Promise<void> {
		if (this.isSyncing) {
			new Notice("Are.na Import is already running...");
			return;
		}
		if (!this.settings.apiToken) {
			new Notice("Are.na Import: Please set your API token in settings.");
			return;
		}
		if (this.settings.channelMappings.length === 0) {
			new Notice("Are.na Import: No channels configured.");
			return;
		}

		this.isSyncing = true;
		this.updateStatusBar("syncing");

		try {
			const result = await this.engine.syncAll({dryRun});
			if (!dryRun) {
				await this.saveSettings();
				await this.writeImportReport(result, "all");
			}
			this.notifySyncResult(result);
		} catch (err) {
			new Notice(`Are.na Import failed: ${(err as Error).message}`);
		} finally {
			this.isSyncing = false;
			this.updateStatusBar("idle");
		}
	}

	async runChannelSync(slug: string, dryRun = false): Promise<void> {
		if (this.isSyncing) {
			new Notice("Are.na Import is already running...");
			return;
		}
		const mapping = this.settings.channelMappings.find((m) => m.channelSlug === slug);
		if (!mapping) {
			new Notice(`Channel "${slug}" not found in settings.`);
			return;
		}

		this.isSyncing = true;
		this.updateStatusBar("syncing");

		try {
			const result = await this.engine.syncChannel(mapping, {dryRun});
			if (!dryRun) {
				await this.saveSettings();
				await this.writeImportReport(result, slug);
			}
			this.notifySyncResult(result);
		} catch (err) {
			new Notice(`Import failed for ${slug}: ${(err as Error).message}`);
		} finally {
			this.isSyncing = false;
			this.updateStatusBar("idle");
		}
	}

	resetSyncTimer(): void {
		this.clearSyncTimer();
		const mins = this.settings.syncInterval;
		if (mins > 0) {
			this.syncTimer = setInterval(
				() => this.runSync(false),
				mins * 60 * 1000
			);
		}
	}

	private clearSyncTimer(): void {
		if (this.syncTimer) {
			clearInterval(this.syncTimer);
			this.syncTimer = null;
		}
	}

	private updateStatusBar(state: "idle" | "syncing", detail = ""): void {
		if (!this.statusBarItem) return;
		if (state === "syncing") {
			this.statusBarItem.setText(detail || "Importing from Are.na...");
		} else {
			this.statusBarItem.setText("");
		}
	}

	private updateProgressStatus(progress: ImportProgress): void {
		if (!this.isSyncing) return;
		const percentage =
			progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
		const barWidth = 10;
		const filled = Math.max(0, Math.min(barWidth, Math.round((percentage / 100) * barWidth)));
		const bar = `[${"#".repeat(filled)}${"-".repeat(barWidth - filled)}]`;
		const label =
			progress.phase === "pages"
				? `pages ${progress.current}/${progress.total}`
				: `blocks ${progress.current}/${progress.total}`;
		this.updateStatusBar("syncing", `${bar} ${percentage}% ${progress.channelSlug} ${label}`);
	}

	private notifySyncResult(result: SyncResult): void {
		if (!this.settings.notifyOnSync) return;
		const parts: string[] = [];
		if (result.created > 0) parts.push(`${result.created} created`);
		if (result.updated > 0) parts.push(`${result.updated} updated`);
		if (result.downloaded > 0) parts.push(`${result.downloaded} assets downloaded`);
		if (result.errors.length > 0) parts.push(`${result.errors.length} errors`);
		if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
		const summary = parts.length > 0 ? parts.join(", ") : "no changes";
		const seconds = (result.duration / 1000).toFixed(1);
		const prefix = result.dryRun ? "Are.na Import preview" : "Are.na Import";
		new Notice(`${prefix}: ${summary} (${seconds}s)`);
	}

	private async writeImportReport(result: SyncResult, scope: string): Promise<void> {
		const folder = normalizePath("Are.na");
		const filePath = normalizePath("Are.na/import-history.md");
		if (!this.app.vault.getAbstractFileByPath(folder)) {
			await this.app.vault.createFolder(folder);
		}
		const timestamp = new Date().toISOString();
		const lines: string[] = [
			`## ${timestamp} (${scope})`,
			"",
			`- created: ${result.created}`,
			`- updated: ${result.updated}`,
			`- downloaded: ${result.downloaded}`,
			`- skipped: ${result.skipped}`,
			`- errors: ${result.errors.length}`,
			`- duration_ms: ${result.duration}`,
			"",
			"### Actions",
			...result.actions.map((a) => `- ${a}`),
			"",
		];
		const existing = this.app.vault.getAbstractFileByPath(filePath);
		if (!existing) {
			await this.app.vault.create(filePath, lines.join("\n"));
			return;
		}
		if (existing instanceof TFile) {
			const current = await this.app.vault.read(existing);
			await this.app.vault.modify(existing, `${current}\n${lines.join("\n")}`);
		}
	}
}
