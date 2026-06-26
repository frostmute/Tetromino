import { App, Vault } from "obsidian";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS, ArenaBlock } from "../types";

jest.mock("obsidian", () => ({
	App: jest.fn(),
	Vault: jest.fn(),
	normalizePath: (path: string) => path.replace(/\\/g, "/").replace(/\/+/g, "/"),
	TFile: class TFile {
		path: string;
		name: string;
		basename: string;
		extension: string;
		stat: unknown;
		vault: unknown;
		parent: unknown;
		constructor() {
			this.path = "";
			this.name = "";
			this.basename = "";
			this.extension = "";
			this.stat = {};
			this.vault = null;
			this.parent = null;
		}
	},
}));

jest.mock("../api");

describe("SyncEngine - extractChannelSlugFromBlock", () => {
	let mockApp: App;
	let mockApi: jest.Mocked<ArenaApi>;
	let mockVault: jest.Mocked<Vault>;
	let engine: SyncEngine;

	beforeEach(() => {
		mockVault = {} as unknown as jest.Mocked<Vault>;
		mockApp = { vault: mockVault } as unknown as App;
		mockApi = new ArenaApi("test-token") as jest.Mocked<ArenaApi>;
		engine = new SyncEngine(mockApp, mockApi, DEFAULT_SETTINGS);
	});

	const callExtract = (block: Partial<ArenaBlock>) => {
		return (engine as any).extractChannelSlugFromBlock(block as ArenaBlock);
	};

	it("should return null if block has no source", () => {
		expect(callExtract({ source: null })).toBeNull();
	});

	it("should return null if block source has no url", () => {
		expect(callExtract({ source: { url: "", title: "" } })).toBeNull();
	});

	it("should extract slug from valid Are.na channel URL", () => {
		const block = {
			source: { url: "https://www.are.na/channel/my-cool-channel", title: "" }
		};
		expect(callExtract(block)).toBe("my-cool-channel");
	});

	it("should decode URI component in the slug", () => {
		const block = {
			source: { url: "https://www.are.na/channel/my%20cool%20channel", title: "" }
		};
		expect(callExtract(block)).toBe("my cool channel");
	});

	it("should handle malformed URLs using the fallback regex", () => {
		// This URL will make new URL() throw
		const block = {
			source: { url: "://www.are.na/channel/malformed-slug", title: "" }
		};

		// This URL is expected to make new URL() throw, triggering the fallback regex

		expect(callExtract(block)).toBe("malformed-slug");
	});

	it("should extract slug from malformed URL with encoded characters", () => {
		const block = {
			source: { url: "://www.are.na/channel/malformed%20slug", title: "" }
		};
		expect(callExtract(block)).toBe("malformed slug");
	});

	it("should handle invalidly encoded characters gracefully", () => {
		const block = {
			source: { url: "://www.are.na/channel/bad%slug", title: "" }
		};
		expect(() => callExtract(block)).not.toThrow();
		expect(callExtract(block)).toBe("bad%slug");
	});

	it("should return null if URL does not match channel pattern", () => {
		const block = {
			source: { url: "https://www.are.na/block/12345", title: "" }
		};
		expect(callExtract(block)).toBeNull();
	});

	it("should return null if malformed URL does not match channel pattern", () => {
		const block = {
			source: { url: "://www.are.na/not-a-channel/something", title: "" }
		};
		expect(callExtract(block)).toBeNull();
	});
});
