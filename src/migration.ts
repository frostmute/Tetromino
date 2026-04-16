import { App, normalizePath, TFile, Vault } from "obsidian";
import { unifiedDiff } from "./diff";
import { resolveAttachmentBaseFolder, resolveChannelFolder } from "./utils";
import type { ArenaSyncSettings, ChannelMapping } from "./types";

export interface MigrationMove {
	from: string;
	to: string;
}

export interface MigrationFileUpdate {
	path: string;
	before: string;
	after: string;
	diff: string;
}

export interface MigrationChannelPlan {
	channelSlug: string;
	fromBase: string;
	toBase: string;
	moves: MigrationMove[];
	updates: MigrationFileUpdate[];
}

export interface MigrationPlan {
	channels: MigrationChannelPlan[];
	totalMoves: number;
	totalUpdates: number;
}

export interface MigrationReport {
	moved: number;
	updated: number;
	skipped: number;
	errors: string[];
	duration: number;
}

function extractWikiPaths(content: string): string[] {
	const paths: string[] = [];
	const regex = /!\[\[([^\]]+)\]\]|\[\[([^\]]+)\]\]/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		const raw = (match[1] || match[2] || "").trim();
		if (!raw) continue;
		const pipeIdx = raw.indexOf("|");
		const path = pipeIdx === -1 ? raw : raw.slice(0, pipeIdx).trim();
		if (path) paths.push(path);
	}
	return paths;
}

function ensureTrailingSlash(path: string): string {
	return path.endsWith("/") ? path : `${path}/`;
}

function isMarkdownFile(file: TFile, folder: string): boolean {
	return file.extension === "md" && file.path.startsWith(folder);
}

export async function buildMigrationPlan(
	app: App,
	settings: ArenaSyncSettings,
): Promise<MigrationPlan> {
	const channels: MigrationChannelPlan[] = [];
	const allFiles = app.vault.getFiles();

	for (const mapping of settings.channelMappings) {
		if (!mapping.enabled) continue;
		const channelFolder = resolveChannelFolder(mapping);
		const fromBase = normalizePath(
			mapping.lastAttachmentBase ||
				resolveAttachmentBaseFolder(settings, mapping),
		);
		const toBase = normalizePath(resolveAttachmentBaseFolder(settings, mapping));
		if (!fromBase || fromBase === toBase) continue;

		const oldPrefix = ensureTrailingSlash(fromBase);
		const newPrefix = ensureTrailingSlash(toBase);
		const movesMap = new Map<string, string>();
		const updates: MigrationFileUpdate[] = [];
		const noteFiles = allFiles.filter((file) =>
			isMarkdownFile(file, channelFolder),
		);

		await Promise.all(
			noteFiles.map(async (note) => {
				const before = await app.vault.read(note);
				if (!before.includes(oldPrefix)) return;
				const after = before.split(oldPrefix).join(newPrefix);
				if (after === before) return;

				updates.push({
					path: note.path,
					before,
					after,
					diff: unifiedDiff(before, after, note.path, note.path),
				});

				const paths = extractWikiPaths(before);
				for (const p of paths) {
					if (!p.startsWith(oldPrefix)) continue;
					const suffix = p.slice(oldPrefix.length);
					const from = normalizePath(p);
					const to = normalizePath(`${toBase}/${suffix}`);
					if (from && to) movesMap.set(from, to);
				}
			})
		);

		const moves = Array.from(movesMap.entries()).map(([from, to]) => ({
			from,
			to,
		}));

		if (moves.length === 0 && updates.length === 0) continue;

		channels.push({
			channelSlug: mapping.channelSlug,
			fromBase,
			toBase,
			moves,
			updates,
		});
	}

	const totalMoves = channels.reduce((sum, c) => sum + c.moves.length, 0);
	const totalUpdates = channels.reduce(
		(sum, c) => sum + c.updates.length,
		0,
	);
	return { channels, totalMoves, totalUpdates };
}

async function ensureFolder(vault: Vault, path: string): Promise<void> {
	const normalized = normalizePath(path);
	const parts = normalized.split("/").filter(Boolean);
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!vault.getAbstractFileByPath(current)) {
			await vault.createFolder(current);
		}
	}
}

export async function executeMigration(
	app: App,
	plan: MigrationPlan,
): Promise<MigrationReport> {
	const start = Date.now();
	let moved = 0;
	let updated = 0;
	let skipped = 0;
	const errors: string[] = [];

	for (const channel of plan.channels) {
		await ensureFolder(app.vault, channel.toBase);
		for (const move of channel.moves) {
			const file = app.vault.getAbstractFileByPath(move.from);
			const exists = app.vault.getAbstractFileByPath(move.to);
			if (!(file instanceof TFile)) {
				skipped++;
				continue;
			}
			if (exists) {
				skipped++;
				continue;
			}
			try {
				await app.vault.rename(file, move.to);
				moved++;
			} catch (err) {
				errors.push(
					`Failed to move ${move.from} -> ${move.to}: ${(err as Error).message}`,
				);
			}
		}

		for (const update of channel.updates) {
			const file = app.vault.getAbstractFileByPath(update.path);
			if (!(file instanceof TFile)) {
				skipped++;
				continue;
			}
			try {
				await app.vault.modify(file, update.after);
				updated++;
			} catch (err) {
				errors.push(
					`Failed to update ${update.path}: ${(err as Error).message}`,
				);
			}
		}
	}

	return {
		moved,
		updated,
		skipped,
		errors,
		duration: Date.now() - start,
	};
}

export function computeCurrentAttachmentBase(
	settings: ArenaSyncSettings,
	mapping: ChannelMapping,
): string {
	return normalizePath(resolveAttachmentBaseFolder(settings, mapping));
}
