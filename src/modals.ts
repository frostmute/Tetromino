import { App, FuzzySuggestModal, Modal, Setting, TFile } from "obsidian";
import type { FileDiff, SyncResult } from "./types";
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
	const stats = container.createEl("div", { cls: "arena-sync-summary-stats" });
	const items: Array<[string, number]> = [
		["Created", result.created],
		["Updated", result.updated],
		["Moved", result.moved],
		["Deleted", result.deleted],
		["Skipped", result.skipped],
		["Downloaded", result.downloaded],
		["Errors", result.errors.length],
	];
	const list = stats.createEl("ul");
	for (const [label, value] of items) {
		const li = list.createEl("li");
		li.setText(`${label}: ${value}`);
	}
	const seconds = (result.duration / 1000).toFixed(1);
	stats.createEl("div", {
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
		row.createEl("div", {
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

export class SyncSummaryModal extends Modal {
	private result: SyncResult;
	private titleText: string;

	constructor(app: App, result: SyncResult, titleText: string) {
		super(app);
		this.result = result;
		this.titleText = titleText;
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

		if (this.result.missingPaths.length > 0) {
			contentEl.createEl("h3", { text: "Missing (Deleted Upstream)" });
			const list = contentEl.createEl("ul");
			for (const path of this.result.missingPaths) {
				list.createEl("li", { text: path });
			}
		}

		contentEl.createEl("h3", { text: "File Diffs" });
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
		contentEl.createEl("h2", { text: "Attachment Migration Preview" });

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
			section.createEl("div", {
				text: `From: ${channel.fromBase}`,
				cls: "arena-sync-migration-path",
			});
			section.createEl("div", {
				text: `To: ${channel.toBase}`,
				cls: "arena-sync-migration-path",
			});
			section.createEl("div", {
				text: `Moves: ${channel.moves.length} · Notes: ${channel.updates.length}`,
				cls: "arena-sync-migration-counts",
			});

			if (channel.updates.length > 0) {
				const list = section.createDiv({ cls: "arena-sync-diff-list" });
				for (const update of channel.updates) {
					const row = list.createDiv({ cls: "arena-sync-diff-row" });
					row.createEl("div", {
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
