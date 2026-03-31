import { addIcon, normalizePath, Notice, Plugin, TFile } from "obsidian";
import { ArenaApi } from "./api";
import { SyncEngine } from "./sync-engine";
import { ArenaSyncSettingTab } from "./settings-tab";
import type { ArenaSyncSettings, ImportProgress, SyncResult } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { SyncSummaryModal, MigrationPreviewModal } from "./modals";
import {
	buildMigrationPlan,
	computeCurrentAttachmentBase,
	executeMigration,
} from "./migration";

const ARENA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><rect x="15" y="15" width="30" height="30" rx="4"/><rect x="55" y="15" width="30" height="30" rx="4"/><rect x="15" y="55" width="30" height="30" rx="4"/><rect x="55" y="55" width="30" height="30" rx="4"/><line x1="45" y1="30" x2="55" y2="30"/><line x1="30" y1="45" x2="30" y2="55"/><line x1="70" y1="45" x2="70" y2="55"/></svg>`;

export default class ArenaSyncPlugin extends Plugin {
	settings: ArenaSyncSettings = DEFAULT_SETTINGS;
	api!: ArenaApi;
	engine!: SyncEngine;
	private isSyncing = false;
	private statusBarItem: HTMLElement | null = null;
	private isMigrating = false;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.api = new ArenaApi(
			this.settings.apiToken,
			this.settings.debugLogging,
		);
		this.engine = new SyncEngine(
			this.app,
			this.api,
			this.settings,
			(progress) => this.updateProgressStatus(progress),
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
					file.path.startsWith(m.localFolder),
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
					file.path.startsWith(m.localFolder),
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
					file.path.startsWith(m.localFolder),
				);
				if (!mapping) return false;
				if (checking) return true;
				window.open(
					`https://www.are.na/channel/${mapping.channelSlug}`,
					"_blank",
				);
				return true;
			},
		});

		this.addCommand({
			id: "arena-sync-migration-preview",
			name: "Preview attachment migration",
			callback: async () => {
				await this.checkForMigrationPrompt(true);
			},
		});

		this.addCommand({
			id: "arena-sync-migration-run",
			name: "Run attachment migration",
			callback: async () => {
				await this.runMigration();
			},
		});

		this.addSettingTab(new ArenaSyncSettingTab(this.app, this));

		this.checkForMigrationPrompt(false);
	}

	onunload(): void {
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		const changed = this.normalizeMappings();
		const updatedBases = this.ensureAttachmentBaseSnapshots();
		if (changed || updatedBases) {
			await this.saveData(this.settings);
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.api = new ArenaApi(
			this.settings.apiToken,
			this.settings.debugLogging,
		);
		this.engine = new SyncEngine(
			this.app,
			this.api,
			this.settings,
			(progress) => this.updateProgressStatus(progress),
		);
		await this.checkForMigrationPrompt(false);
	}

	async runSync(dryRun = false): Promise<void> {
		if (this.isSyncing) {
			new Notice("Are.na Import is already running...");
			return;
		}
		if (this.isMigrating) {
			new Notice("Attachment migration is running. Try again after it finishes.");
			return;
		}
		if (!this.settings.apiToken) {
			new Notice("Are.na Import: Please set your API token in settings.");
			return;
		}
		const validMappings = this.settings.channelMappings.filter(
			(m) => m.enabled && m.channelSlug.trim() && m.localFolder.trim(),
		);
		if (validMappings.length === 0) {
			new Notice(
				"Are.na Import: No valid channels configured (check that channel slug and folder are not empty).",
			);
			return;
		}

		this.isSyncing = true;
		this.updateStatusBar("syncing");

		try {
			const result = await this.engine.syncAll({ dryRun });
			if (!dryRun) {
				await this.saveSettings();
				await this.writeImportReport(result, "all");
			}
			this.notifySyncResult(result);
			this.showSummaryModal(result, dryRun ? "Preview" : "Sync");
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
		if (this.isMigrating) {
			new Notice("Attachment migration is running. Try again after it finishes.");
			return;
		}
		const mapping = this.settings.channelMappings.find(
			(m) => m.channelSlug === slug && m.enabled,
		);
		if (!mapping) {
			new Notice(
				`Channel "${slug}" not found in settings or is disabled.`,
			);
			return;
		}
		if (!mapping.channelSlug.trim() || !mapping.localFolder.trim()) {
			new Notice(`Channel "${slug}" has empty slug or folder path.`);
			return;
		}

		this.isSyncing = true;
		this.updateStatusBar("syncing");

		try {
			const result = await this.engine.syncChannel(mapping, { dryRun });
			if (!dryRun) {
				await this.saveSettings();
				await this.writeImportReport(result, slug);
			}
			this.notifySyncResult(result);
			this.showSummaryModal(result, dryRun ? "Preview" : "Sync");
		} catch (err) {
			new Notice(`Import failed for ${slug}: ${(err as Error).message}`);
		} finally {
			this.isSyncing = false;
			this.updateStatusBar("idle");
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
			progress.total > 0
				? Math.round((progress.current / progress.total) * 100)
				: 0;
		const barWidth = 10;
		const filled = Math.max(
			0,
			Math.min(barWidth, Math.round((percentage / 100) * barWidth)),
		);
		const bar = `[${"#".repeat(filled)}${"-".repeat(barWidth - filled)}]`;
		const label =
			progress.phase === "pages"
				? `pages ${progress.current}/${progress.total}`
				: `blocks ${progress.current}/${progress.total}`;
		this.updateStatusBar(
			"syncing",
			`${bar} ${percentage}% ${progress.channelSlug} ${label}`,
		);
	}

	private notifySyncResult(result: SyncResult): void {
		if (!this.settings.notifyOnSync) return;
		const parts: string[] = [];
		if (result.created > 0) parts.push(`${result.created} created`);
		if (result.updated > 0) parts.push(`${result.updated} updated`);
		if (result.moved > 0) parts.push(`${result.moved} moved`);
		if (result.deleted > 0) parts.push(`${result.deleted} deleted`);
		if (result.downloaded > 0)
			parts.push(`${result.downloaded} assets downloaded`);
		if (result.errors.length > 0)
			parts.push(`${result.errors.length} errors`);
		if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
		const summary = parts.length > 0 ? parts.join(", ") : "no changes";
		const seconds = (result.duration / 1000).toFixed(1);
		const prefix = result.dryRun
			? "Are.na Import preview"
			: "Are.na Import";
		new Notice(`${prefix}: ${summary} (${seconds}s)`);
	}

	private async writeImportReport(
		result: SyncResult,
		scope: string,
	): Promise<void> {
		const folder = normalizePath("Are.na");
		const filePath = normalizePath("Are.na/import-history.md");
		if (!this.app.vault.getAbstractFileByPath(folder)) {
			await this.app.vault.createFolder(folder);
		}
		const timestamp = new Date().toLocaleString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
			const lines: string[] = [
				`## ${timestamp} (${scope})`,
				"",
				`- created: ${result.created}`,
				`- updated: ${result.updated}`,
				`- moved: ${result.moved}`,
				`- deleted: ${result.deleted}`,
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
			await this.app.vault.modify(
				existing,
				`${current}\n${lines.join("\n")}`,
			);
		}
	}

	private showSummaryModal(result: SyncResult, label: string): void {
		const title = `Are.na Import ${label} Summary`;
		new SyncSummaryModal(this.app, result, title).open();
	}

	private normalizeMappings(): boolean {
		let changed = false;
		this.settings.channelMappings = this.settings.channelMappings.map(
			(mapping) => {
				const normalized = { ...mapping };
				if (normalized.attachmentStorageOverride === undefined) {
					normalized.attachmentStorageOverride = null;
					changed = true;
				}
				if (normalized.customAttachmentFolderOverride === undefined) {
					normalized.customAttachmentFolderOverride = "";
					changed = true;
				}
				if (normalized.lastAttachmentBase === undefined) {
					normalized.lastAttachmentBase = null;
					changed = true;
				}
				return normalized;
			},
		);
		return changed;
	}

	private ensureAttachmentBaseSnapshots(): boolean {
		let changed = false;
		for (const mapping of this.settings.channelMappings) {
			if (!mapping.lastAttachmentBase) {
				mapping.lastAttachmentBase = computeCurrentAttachmentBase(
					this.settings,
					mapping,
				);
				changed = true;
			}
		}
		return changed;
	}

	async checkForMigrationPrompt(force: boolean): Promise<void> {
		const plan = await buildMigrationPlan(this.app, this.settings);
		if (plan.channels.length === 0) return;
		if (!force && this.isMigrating) return;
		new MigrationPreviewModal(this.app, plan, async () => {
			await this.runMigration(plan);
		}).open();
	}

	async runMigration(planOverride?: Awaited<ReturnType<typeof buildMigrationPlan>>): Promise<void> {
		if (this.isMigrating) {
			new Notice("Are.na Import migration is already running...");
			return;
		}
		this.isMigrating = true;
		this.updateStatusBar("syncing", "Migrating attachments...");
		try {
			const plan = planOverride ?? (await buildMigrationPlan(this.app, this.settings));
			if (plan.channels.length === 0) {
				new Notice("No attachment migration required.");
				return;
			}
			const report = await executeMigration(this.app, plan);
			for (const channel of plan.channels) {
				const mapping = this.settings.channelMappings.find(
					(m) => m.channelSlug === channel.channelSlug,
				);
				if (mapping) {
					mapping.lastAttachmentBase = channel.toBase;
				}
			}
			await this.saveSettings();
			await this.writeMigrationReport(report);
			new Notice(
				`Attachment migration complete: ${report.moved} moved, ${report.updated} notes updated.`,
			);
		} catch (err) {
			new Notice(`Attachment migration failed: ${(err as Error).message}`);
		} finally {
			this.isMigrating = false;
			this.updateStatusBar("idle");
		}
	}

	private async writeMigrationReport(report: Awaited<ReturnType<typeof executeMigration>>): Promise<void> {
		const folder = normalizePath("Are.na");
		const filePath = normalizePath("Are.na/migration-history.md");
		if (!this.app.vault.getAbstractFileByPath(folder)) {
			await this.app.vault.createFolder(folder);
		}
		const timestamp = new Date().toLocaleString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
		const lines: string[] = [
			`## ${timestamp}`,
			"",
			`- moved: ${report.moved}`,
			`- updated: ${report.updated}`,
			`- skipped: ${report.skipped}`,
			`- errors: ${report.errors.length}`,
			`- duration_ms: ${report.duration}`,
			"",
			"### Errors",
			...report.errors.map((e) => `- ${e}`),
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
