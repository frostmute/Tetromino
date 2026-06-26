import { App, Vault, TFile, normalizePath } from "obsidian";

/**
 * A realistic in-memory mock of an Obsidian vault for integration tests.
 *
 * Supports:
 *   - File creation, modification, renaming, and deletion
 *   - Binary file creation
 *   - Folder creation
 *   - File reading
 *   - Abstract file lookup by path
 *
 * Based on the mock vault pattern used in sync-engine-extended.test.ts,
 * extended with additional helpers for conflict and edge-case testing.
 */

class MockTFile extends TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	stat: { ctime: number; mtime: number; size: number };
	vault: Vault;
	parent: any;

	constructor(path: string, vault: Vault) {
		super();
		this.path = path;
		this.name = path.split("/").pop() || path;
		this.basename = this.name.replace(/\.md$/, "");
		this.extension = path.endsWith(".md") ? "md" : path.split(".").pop() || "";
		this.stat = { ctime: Date.now(), mtime: Date.now(), size: 0 };
		this.vault = vault;
		this.parent = null;
	}
}

export interface VaultFileEntry {
	file: TFile;
	content: string;
	binary?: ArrayBuffer;
}

export class MockVault {
	files = new Map<string, VaultFileEntry>();
	folders = new Set<string>();
	vault: Vault;

	constructor() {
		this.vault = {} as Vault;
	}

	getAbstractFileByPath(path: string): TFile | { path: string } | null {
		const normalized = normalizePath(path);
		const entry = this.files.get(normalized);
		if (entry) return entry.file;
		if (this.folders.has(normalized)) return { path: normalized };
		return null;
	}

	async read(file: TFile): Promise<string> {
		return this.files.get(file.path)?.content ?? "";
	}

	async create(path: string, content: string): Promise<TFile> {
		const normalized = normalizePath(path);
		const f = new MockTFile(normalized, this.vault);
		this.files.set(normalized, { file: f, content });
		f.stat.size = content.length;
		return f;
	}

	async createBinary(path: string, data: ArrayBuffer): Promise<TFile> {
		const normalized = normalizePath(path);
		const f = new MockTFile(normalized, this.vault);
		this.files.set(normalized, { file: f, content: "", binary: data });
		f.stat.size = data.byteLength;
		return f;
	}

	async modify(file: TFile, content: string): Promise<void> {
		const entry = this.files.get(file.path);
		if (entry) {
			entry.content = content;
			if (entry.file instanceof MockTFile) {
				entry.file.stat.mtime = Date.now();
				entry.file.stat.size = content.length;
			}
		}
	}

	async rename(file: TFile, newPath: string): Promise<void> {
		const oldPath = file.path;
		const entry = this.files.get(oldPath);
		if (entry) {
			this.files.delete(oldPath);
			const normalizedNew = normalizePath(newPath);
			entry.file.path = normalizedNew;
			entry.file.name = normalizedNew.split("/").pop() || normalizedNew;
			if (entry.file instanceof MockTFile) {
				entry.file.basename = entry.file.name.replace(/\.md$/, "");
			}
			this.files.set(normalizedNew, entry);
		}
	}

	async delete(file: TFile): Promise<void> {
		this.files.delete(file.path);
	}

	async createFolder(path: string): Promise<void> {
		this.folders.add(normalizePath(path));
	}

	/**
	 * Seed the vault with existing notes for conflict-resolution tests.
	 *
	 * @param entries - Map of path → content to pre-populate
	 */
	seed(entries: Record<string, string>): void {
		for (const [path, content] of Object.entries(entries)) {
			const normalized = normalizePath(path);
			const f = new MockTFile(normalized, this.vault);
			this.files.set(normalized, { file: f, content });
			f.stat.size = content.length;
		}
	}

	/**
	 * Check if a file exists at the given path.
	 */
	has(path: string): boolean {
		return this.files.has(normalizePath(path));
	}

	/**
	 * Get the content of a file at the given path.
	 */
	content(path: string): string | undefined {
		return this.files.get(normalizePath(path))?.content;
	}

	/**
	 * Get a list of all file paths in the vault.
	 */
	paths(): string[] {
		return Array.from(this.files.keys());
	}

	/**
	 * Clear all files and folders.
	 */
	clear(): void {
		this.files.clear();
		this.folders.clear();
	}
}

/**
 * Build a MockApp backed by a MockVault.
 */
export function makeMockApp(vault?: MockVault): { app: App; vault: MockVault } {
	const v = vault ?? new MockVault();
	const app = { vault: v as unknown as Vault } as unknown as App;
	return { app, vault: v };
}

/**
 * Pre-built vault scenarios for common test cases.
 */

export const emptyVault = (): MockVault => new MockVault();

export const vaultWithExistingNotes = (): MockVault => {
	const v = new MockVault();
	v.seed({
		"Are.na/existing-channel/Stable Note.md": "---\narena_id: 1\n---\n\n# Stable Note\n\nThis note will not change.\n",
		"Are.na/existing-channel/Changing Note.md": "---\narena_id: 2\n---\n\n# Changing Note\n\nOriginal local content.\n",
		"Are.na/existing-channel/Orphan Note.md": "---\narena_id: 999\n---\n\n# Orphan Note\n\nThis block no longer exists remotely.\n",
	});
	return v;
};

export const vaultWithConflictingEdits = (): MockVault => {
	const v = new MockVault();
	v.seed({
		"Are.na/conflict-channel/Note A.md": "---\narena_id: 1\n---\n\n# Note A\n\nLocal version.\n",
		"Are.na/conflict-channel/Note B.md": "---\narena_id: 2\n---\n\n# Note B\n\nLocal version.\n",
	});
	return v;
};
