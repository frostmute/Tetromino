import { Notice, Plugin, addIcon } from "obsidian";
import { ArenaApi } from "./api";
import { SyncEngine } from "./sync-engine";
import { ArenaSyncSettingTab } from "./settings-tab";
import type { ArenaSyncSettings, SyncResult } from "./types";
import { DEFAULT_SETTINGS } from "./types";

/* ------------------------------------------------------------------ */
/*  Custom ribbon icon (Are.na logo simplified)                       */
/* ------------------------------------------------------------------ */
const ARENA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><rect x="15" y="15" width="30" height="30" rx="4"/><rect x="55" y="15" width="30" height="30" rx="4"/><rect x="15" y="55" width="30" height="30" rx="4"/><rect x="55" y="55" width="30" height="30" rx="4"/><line x1="45" y1="30" x2="55" y2="30"/><line x1="30" y1="45" x2="30" y2="55"/><line x1="70" y1="45" x2="70" y2="55"/></svg>`;

export default class ArenaSyncPlugin extends Plugin {
	settings: ArenaSyncSettings = DEFAULT_SETTINGS;
	api!: ArenaApi;
	engine!: SyncEngine;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private isSyncing = false;
	private statusBarItem: HTMLElement | null = null;

	/* ---------------------------------------------------------------- */
	/*  Lifecycle                                                       */
	/* ---------------------------------------------------------------- */

	async onload(): Promise<void> {
		await this.loadSettings();

		this.api = new ArenaApi(this.settings.apiToken, this.settings.debugLogging);
		this.engine = new SyncEngine(this.app, this.api, this.settings);

		// Register custom icon
		addIcon("arena-sync", ARENA_ICON);

		// Ribbon button
		this.addRibbonIcon("arena-sync", "Sync with Are.na", async () => {
			await this.runSync();
		});

		// Status bar
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar("idle");

		// Commands
		this.addCommand({
			id: "arena-sync-now",
			name: "Sync all channels now",
			callback: async () => await this.runSync(),
		});

		this.addCommand({
			id: "arena-sync-channel",
			name: "Sync current channel",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const mapping = this.settings.channelMappings.find((m) =>
					file.path.startsWith(m.localFolder)
				);
				if (!mapping) return false;
				if (checking) return true;
				this.runChannelSync(mapping.channelSlug);
				return true;
			},
		});

		this.addCommand({
			id: "arena-sync-push-note",
			name: "Push current note to Are.na",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (checking) return true;
				this.pushCurrentNote(file);
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

		// Settings tab
		this.addSettingTab(new ArenaSyncSettingTab(this.app, this));

		// Auto-sync timer
		this.resetSyncTimer();

		// Startup sync
		if (this.settings.syncOnStartup && this.settings.apiToken) {
			// Small delay so vault is fully loaded
			setTimeout(() => this.runSync(), 3000);
		}

		this.log("Are.na Sync plugin loaded");
	}

	onunload(): void {
		this.clearSyncTimer();
		this.log("Are.na Sync plugin unloaded");
	}

	/* ---------------------------------------------------------------- */
	/*  Settings persistence                                            */
	/* ---------------------------------------------------------------- */

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		// Rebuild API client when token changes
		this.api = new ArenaApi(this.settings.apiToken, this.settings.debugLogging);
		this.engine = new SyncEngine(this.app, this.api, this.settings);
	}

	/* ---------------------------------------------------------------- */
	/*  Sync orchestration                                              */
	/* ---------------------------------------------------------------- */

	async runSync(): Promise<void> {
		if (this.isSyncing) {
			new Notice("Are.na Sync is already running…");
			return;
		}
		if (!this.settings.apiToken) {
			new Notice("Are.na Sync: Please set your API token in settings.");
			return;
		}
		if (this.settings.channelMappings.length === 0) {
			new Notice("Are.na Sync: No channels configured. Open settings to add one.");
			return;
		}

		this.isSyncing = true;
		this.updateStatusBar("syncing");

		try {
			const result = await this.engine.syncAll();
			this.notifySyncResult(result);
		} catch (err) {
			new Notice(`Are.na Sync failed: ${(err as Error).message}`);
			this.log(`Sync error: ${(err as Error).stack}`);
		} finally {
			this.isSyncing = false;
			this.updateStatusBar("idle");
		}
	}

	async runChannelSync(slug: string): Promise<void> {
		const mapping = this.settings.channelMappings.find(
			(m) => m.channelSlug === slug
		);
		if (!mapping) {
			new Notice(`Channel "${slug}" not found in settings.`);
			return;
		}

		this.isSyncing = true;
		this.updateStatusBar("syncing");

		try {
			const result = await this.engine.syncChannel(mapping);
			await this.saveSettings();
			this.notifySyncResult(result);
		} catch (err) {
			new Notice(`Sync failed for ${slug}: ${(err as Error).message}`);
		} finally {
			this.isSyncing = false;
			this.updateStatusBar("idle");
		}
	}

	private async pushCurrentNote(file: import("obsidian").TFile): Promise<void> {
		const mapping = this.settings.channelMappings.find((m) =>
			file.path.startsWith(m.localFolder)
		);
		if (!mapping) {
			new Notice(
				"This note isn't inside a synced channel folder. " +
				"Map a channel to this folder in settings first."
			);
			return;
		}

		try {
			const content = await this.app.vault.read(file);
			const { markdownToBlockContent } = await import("./utils");
			const { title, content: body } = markdownToBlockContent(content);
			await this.api.createBlock(mapping.channelSlug, body, title);
			new Notice(`Pushed "${title || file.basename}" to #${mapping.channelTitle}`);
		} catch (err) {
			new Notice(`Push failed: ${(err as Error).message}`);
		}
	}

	/* ---------------------------------------------------------------- */
	/*  Timer management                                                */
	/* ---------------------------------------------------------------- */

	resetSyncTimer(): void {
		this.clearSyncTimer();
		const mins = this.settings.syncInterval;
		if (mins > 0) {
			this.syncTimer = setInterval(
				() => this.runSync(),
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

	/* ---------------------------------------------------------------- */
	/*  UI helpers                                                      */
	/* ---------------------------------------------------------------- */

	private updateStatusBar(state: "idle" | "syncing"): void {
		if (!this.statusBarItem) return;
		if (state === "syncing") {
			this.statusBarItem.setText("⟳ Syncing Are.na…");
		} else {
			this.statusBarItem.setText("");
		}
	}

	private notifySyncResult(result: SyncResult): void {
		if (!this.settings.notifyOnSync) return;

		const parts: string[] = [];
		if (result.created > 0) parts.push(`${result.created} created`);
		if (result.updated > 0) parts.push(`${result.updated} updated`);
		if (result.deleted > 0) parts.push(`${result.deleted} deleted`);
		if (result.conflicts.length > 0)
			parts.push(`${result.conflicts.length} conflicts`);
		if (result.errors.length > 0)
			parts.push(`${result.errors.length} errors`);

		const summary =
			parts.length > 0 ? parts.join(", ") : "Everything up to date";
		const seconds = (result.duration / 1000).toFixed(1);

		new Notice(`Are.na Sync: ${summary} (${seconds}s)`);
	}

	/* ---------------------------------------------------------------- */
	/*  Logging                                                         */
	/* ---------------------------------------------------------------- */

	log(msg: string): void {
		if (this.settings.debugLogging) {
			console.log(`[arena-sync] ${msg}`);
		}
	}
}
