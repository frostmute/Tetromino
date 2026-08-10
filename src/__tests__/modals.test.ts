import { App } from "obsidian";
import { SyncSummaryModal } from "../modals";
import type { SyncConflict, SyncResult } from "../types";

function augmentObsidianElement(el: HTMLElement): void {
	const extended = el as HTMLElement & {
		empty(): void;
		addClass(className: string): void;
		setText(text: string): void;
		createEl(tag: string, options?: { text?: string; cls?: string }): HTMLElement;
		createDiv(options?: { text?: string; cls?: string }): HTMLElement;
	};
	extended.empty = () => {
		while (el.firstChild) el.removeChild(el.firstChild);
	};
	extended.addClass = (className) => el.classList.add(className);
	extended.setText = (text) => { el.textContent = text; };
	extended.createEl = (tag, options) => {
		const child = document.createElement(tag);
		augmentObsidianElement(child);
		if (options?.text) child.textContent = options.text;
		if (options?.cls) child.className = options.cls;
		el.appendChild(child);
		return child;
	};
	extended.createDiv = (options) => extended.createEl("div", options);
}

function makeConflict(): SyncConflict {
	return {
		blockId: 1,
		channelId: 10,
		channelSlug: "design",
		localPath: "Are.na/design/Note.md",
		localHash: "local",
		remoteHash: "remote",
		remoteContent: "Remote",
		diff: "- Local\n+ Remote",
	};
}

function makeResult(conflict: SyncConflict): SyncResult {
	return {
		created: 0,
		updated: 0,
		deleted: 0,
		moved: 0,
		skipped: 0,
		downloaded: 0,
		dryRun: false,
		actions: [],
		moves: [],
		fileDiffs: [],
		missingPaths: [],
		errors: [],
		conflicts: [conflict],
		noLongerRemote: [{
			blockId: 2,
			channelId: 10,
			localPath: "Are.na/design/Old.md",
			detectedAt: "2026-08-10T00:00:00.000Z",
		}],
		duration: 10,
	};
}

describe("SyncSummaryModal conflict UI", () => {
	it("renders conflicts, no-longer-remote candidates, and all actions", () => {
		const modal = new SyncSummaryModal(
			{} as App,
			makeResult(makeConflict()),
			"Tetromino Sync Summary",
			{
				onKeepLocal: jest.fn(async () => {}),
				onUseRemote: jest.fn(async () => {}),
				onReviewLater: jest.fn(async () => {}),
			},
		);
		augmentObsidianElement(modal.contentEl);
		modal.onOpen();

		expect(modal.contentEl.textContent).toContain("Conflicts (local edits preserved)");
		expect(modal.contentEl.textContent).toContain("No longer remote (local files preserved)");
		expect(modal.contentEl.textContent).toContain("Are.na/design/Note.md");
		expect(modal.contentEl.querySelectorAll("button")).toHaveLength(4);
		expect(modal.contentEl.textContent).toContain("Keep local");
		expect(modal.contentEl.textContent).toContain("Use remote");
		expect(modal.contentEl.textContent).toContain("Review later");
	});

	it.each([
		["Keep local", "onKeepLocal"],
		["Use remote", "onUseRemote"],
		["Review later", "onReviewLater"],
	] as const)("invokes the %s action callback", async (label, callbackName) => {
		const actions = {
			onKeepLocal: jest.fn(async () => {}),
			onUseRemote: jest.fn(async () => {}),
			onReviewLater: jest.fn(async () => {}),
		};
		const modal = new SyncSummaryModal(
			{} as App,
			makeResult(makeConflict()),
			"Tetromino Sync Summary",
			actions,
		);
		augmentObsidianElement(modal.contentEl);
		modal.onOpen();

		const button = Array.from(modal.contentEl.querySelectorAll("button"))
			.find((item) => item.textContent === label);
		expect(button).toBeDefined();
		button!.click();
		await Promise.resolve();
		await Promise.resolve();
		expect(actions[callbackName]).toHaveBeenCalledWith(makeConflict());
	});
});
