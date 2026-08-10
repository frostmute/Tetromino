import { App, FuzzySuggestModal, Modal, Notice, Setting, TFile } from "obsidian";
import type { FileDiff, SyncConflict, SyncResult } from "./types";
import type { MigrationPlan } from "./migration";

export class DiffModal extends Modal {
	private titleText: string;
	private diffText: string;

	constructor(app: App, titleText: string, diffText: string) {
		super(app);
		this.titleText = titleText;
		this.diffText = diffText;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: this.titleText });
		const pre = contentEl.createEl("pre", { cls: "arena-sync-diff" });
		pre.setText(this.diffText);
	}
}

function renderStats(container: HTMLElement, result: SyncResult): void {
	const stats = container.createDiv({ cls: "arena-sync-summary-stats" });
	const items: Array<[string, number]> = [
		["Created", result.created],
		["Updated", result.updated],
		["Moved", result.moved],
		["Deleted", result.deleted],
		["Skipped", result.skipped],
		["Downloaded", result.downloaded],
		["Errors", result.errors.length],
		["Conflicts", result.conflicts?.length ?? 0],
		["No longer remote", result.noLongerRemote?.length ?? result.missingPaths.length],
	];
	const list = stats.createEl("ul");
	for (const [label, value] of items) {
		const li = list.createEl("li");
		li.setText(`${label}: ${value}`);
	}
	const seconds = (result.duration / 1000).toFixed(1);
	stats.createDiv({
		text: `Duration: ${seconds}s`,
		cls: "arena-sync-summary-duration",
	});
}

function renderDiffList(
	container: HTMLElement,
	app: App,
	diffs: FileDiff[],
): void {
	if (diffs.length === 0) {
		container.createEl("p", { text: "No file diffs captured." });
		return;
	}

	const list = container.createDiv({ cls: "arena-sync-diff-list" });
	for (const diff of diffs) {
		const row = list.createDiv({ cls: "arena-sync-diff-row" });
		row.createDiv({
			text: `${diff.kind.toUpperCase()} ${diff.path}`,
			cls: "arena-sync-diff-path",
		});
		const button = row.createEl("button", {
			text: "View diff",
			cls: "mod-cta",
		});
		button.addEventListener("click", () => {
			new DiffModal(app, diff.path, diff.diff).open();
		});
	}
}

export interface SyncConflictActions {
	onKeepLocal: (conflict: SyncConflict) => Promise<void>;
	onUseRemote: (conflict: SyncConflict) => Promise<void>;
	onReviewLater: (conflict: SyncConflict) => Promise<void>;
}

function renderConflictList(
	container: HTMLElement,
	app: App,
	conflicts: SyncConflict[],
	actions?: SyncConflictActions,
): void {
	if (conflicts.length === 0) return;
	container.createEl("h3", { text: "Conflicts (local edits preserved)" });
	const list = container.createDiv({ cls: "arena-sync-conflict-list" });
	for (const conflict of conflicts) {
		const row = list.createDiv({ cls: "arena-sync-conflict-row" });
		row.createDiv({ text: conflict.localPath, cls: "arena-sync-diff-path" });
		const viewButton = row.createEl("button", {
			text: "View diff",
			cls: "mod-cta",
		});
		viewButton.addEventListener("click", () => {
			new DiffModal(app, conflict.localPath, conflict.diff).open();
		});

		if (!actions) continue;
		const buttons: HTMLButtonElement[] = [];
		const addAction = (label: string, callback: (conflict: SyncConflict) => Promise<void>) => {
			const button = row.createEl("button", { text: label });
			buttons.push(button);
			button.addEventListener("click", () => {
				void (async () => {
					buttons.forEach((item) => { item.disabled = true; });
					try {
						await callback(conflict);
						button.setText(`${label} ✓`);
					} catch (error) {
						buttons.forEach((item) => { item.disabled = false; });
						new Notice(`Could not resolve conflict: ${(error as Error).message}`);
					}
				})();
			});
		};
		addAction("Keep local", actions.onKeepLocal);
		addAction("Use remote", actions.onUseRemote);
		addAction("Review later", actions.onReviewLater);
	}
}

export class SyncSummaryModal extends Modal {
	private result: SyncResult;
	private titleText: string;
	private actions?: SyncConflictActions;

	constructor(
		app: App,
		result: SyncResult,
		titleText: string,
		actions?: SyncConflictActions,
	) {
		super(app);
		this.result = result;
		this.titleText = titleText;
		this.actions = actions;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("arena-sync-summary-modal");
		contentEl.createEl("h2", { text: this.titleText });

		renderStats(contentEl, this.result);

		if (this.result.errors.length > 0) {
			contentEl.createEl("h3", { text: "Errors" });
			const list = contentEl.createEl("ul");
			for (const err of this.result.errors) {
				const li = list.createEl("li");
				li.setText(`${err.channelSlug}: ${err.message}`);
			}
		}

		const noLongerRemote = this.result.noLongerRemote ?? this.result.missingPaths.map((localPath) => ({
			blockId: 0,
			channelId: 0,
			localPath,
			detectedAt: "",
		}));
		if (noLongerRemote.length > 0) {
			contentEl.createEl("h3", { text: "No longer remote (local files preserved)" });
			const list = contentEl.createEl("ul");
			for (const candidate of noLongerRemote) {
				list.createEl("li", { text: candidate.localPath });
			}
		}

		renderConflictList(
			contentEl,
			this.app,
			this.result.conflicts ?? [],
			this.result.dryRun ? undefined : this.actions,
		);

		contentEl.createEl("h3", { text: "File diffs" });
		renderDiffList(contentEl, this.app, this.result.fileDiffs);
	}
}

export class MigrationPreviewModal extends Modal {
	private plan: MigrationPlan;
	private onRun: () => Promise<void>;

	constructor(app: App, plan: MigrationPlan, onRun: () => Promise<void>) {
		super(app);
		this.plan = plan;
		this.onRun = onRun;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("arena-sync-migration-modal");
		contentEl.createEl("h2", { text: "Attachment migration preview" });

		contentEl.createEl("p", {
			text: `Moves: ${this.plan.totalMoves} · Note updates: ${this.plan.totalUpdates}`,
		});

		if (this.plan.channels.length === 0) {
			contentEl.createEl("p", { text: "No migration required." });
			return;
		}

		for (const channel of this.plan.channels) {
			const section = contentEl.createDiv({ cls: "arena-sync-migration-section" });
			section.createEl("h3", {
				text: `Channel: ${channel.channelSlug}`,
			});
			section.createDiv({
				text: `From: ${channel.fromBase}`,
				cls: "arena-sync-migration-path",
			});
			section.createDiv({
				text: `To: ${channel.toBase}`,
				cls: "arena-sync-migration-path",
			});
			section.createDiv({
				text: `Moves: ${channel.moves.length} · Notes: ${channel.updates.length}`,
				cls: "arena-sync-migration-counts",
			});

			if (channel.updates.length > 0) {
				const list = section.createDiv({ cls: "arena-sync-diff-list" });
				for (const update of channel.updates) {
					const row = list.createDiv({ cls: "arena-sync-diff-row" });
					row.createDiv({
						text: update.path,
						cls: "arena-sync-diff-path",
					});
					const button = row.createEl("button", {
						text: "View diff",
						cls: "mod-cta",
					});
					button.addEventListener("click", () => {
						new DiffModal(this.app, update.path, update.diff).open();
					});
				}
			}
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("Run migration").setCta().onClick(async () => {
					btn.setDisabled(true);
					await this.onRun();
					this.close();
				}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => this.close()),
			);
	}
}

export class BackupFileSuggestModal extends FuzzySuggestModal<TFile> {
	private onSelect: (file: TFile) => Promise<void> | void;

	constructor(app: App, onSelect: (file: TFile) => Promise<void> | void) {
		super(app);
		this.onSelect = onSelect;
		this.setPlaceholder("Select a channel mapping backup file...");
	}

	getItems(): TFile[] {
		return this.app.vault
			.getFiles()
			.filter((file) => file.path.endsWith(".json"))
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
		void _evt;
		void this.onSelect(file);
	}
}
