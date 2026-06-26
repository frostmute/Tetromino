import * as obsidian from "obsidian";
import { ArenaApi } from "../api";
import type { ArenaBlock } from "../types";

const MAX_RETRIES = 3;

function makeBlock(id: number): ArenaBlock {
	return {
		id,
		title: `Block ${id}`,
		content: "content",
		content_html: "<p>content</p>",
		description: null,
		description_html: null,
		source: null,
		image: null,
		attachment: null,
		class: "Text",
		base_class: "Block",
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
		connected_at: "2026-01-01T00:00:00.000Z",
		position: id,
		user: {
			id: 1,
			slug: "tester",
			username: "tester",
			first_name: "Test",
			last_name: "User",
			avatar: "",
			channel_count: 1,
		},
	};
}

describe("ArenaApi v3 adapters", () => {
	it("parses v3 data/meta payloads for channel contents", async () => {
		const requestUrlMock = jest.spyOn(obsidian, "requestUrl").mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: {
				data: [makeBlock(2), makeBlock(1)],
				meta: {
					current_page: 2,
					per_page: 100,
					total_pages: 7,
					total_count: 654,
				},
			},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token-123");
		const page = await api.getChannelContents("rad-readings", 2);

		expect(page.contents).toHaveLength(2);
		expect(page.current_page).toBe(2);
		expect(page.total_pages).toBe(7);
		expect(page.length).toBe(654);
		expect(page.per).toBe(100);

		expect(requestUrlMock).toHaveBeenCalledWith(
			expect.objectContaining({
				method: "GET",
				url: "https://api.are.na/v3/channels/rad-readings/contents?page=2&per=100",
				headers: expect.objectContaining({
					Authorization: "Bearer token-123",
				}),
			}),
		);
		requestUrlMock.mockRestore();
	});

	it("unwraps v3 data payloads for single resources", async () => {
		const requestUrlMock = jest.spyOn(obsidian, "requestUrl")
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: {
					data: {
						id: 42,
						title: "Rad Readings",
						slug: "rad-readings",
						status: "public",
						user: makeBlock(1).user,
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: "2026-01-02T00:00:00.000Z",
						total_connections: 717,
						description: "Channel description",
					},
				},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: {
					data: makeBlock(999),
				},
				arrayBuffer: new ArrayBuffer(0),
			});

		const api = new ArenaApi("token-xyz");
		const channel = await api.getChannel("rad-readings");
		const block = await api.getBlock(999);

		expect(channel.id).toBe(42);
		expect(channel.slug).toBe("rad-readings");
		expect(channel.length).toBe(717);
		expect(channel.description).toBe("Channel description");
		expect(block.id).toBe(999);

		expect(requestUrlMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				url: "https://api.are.na/v3/channels/rad-readings",
			}),
		);
		expect(requestUrlMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				url: "https://api.are.na/v3/blocks/999",
			}),
		);
		requestUrlMock.mockRestore();
	});
});

describe("ArenaApi security", () => {
	it("downloadBinary should NOT include Authorization header", async () => {
		const requestUrlMock = jest.spyOn(obsidian, "requestUrl").mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("secret-token");
		const url = "https://external-asset.com/image.png";
		await api.downloadBinary(url);

		expect(requestUrlMock).toHaveBeenCalledWith(
			expect.objectContaining({
				url: url,
				headers: expect.not.objectContaining({
					Authorization: expect.any(String),
				}),
			}),
		);
		requestUrlMock.mockRestore();
	});

	it("not vulnerable to SSRF: absolute URLs in path are prefixed with BASE_URL", async () => {
		const requestUrlMock = jest.spyOn(obsidian, "requestUrl").mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: { data: { success: true } },
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("secret-token");
		const maliciousUrl = "https://malicious.com/stolen-token";
		// @ts-expect-error - accessing private method for testing
		await (api as any).request("GET", maliciousUrl);

		expect(requestUrlMock).toHaveBeenCalledWith(
			expect.objectContaining({
				// It should now be prefixed with BASE_URL and version
				url: "https://api.are.na/v3/https://malicious.com/stolen-token",
			}),
		);
		requestUrlMock.mockRestore();
	});

	describe("verifyToken", () => {
		let requestUrlMock: jest.SpyInstance;

		beforeEach(() => {
			requestUrlMock = jest.spyOn(obsidian, "requestUrl");
		});

		afterEach(() => {
			requestUrlMock.mockRestore();
		});

		it("returns true when /me returns 200", async () => {
			requestUrlMock.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: { data: { id: 1, slug: "me" } },
				arrayBuffer: new ArrayBuffer(0),
			});

			const api = new ArenaApi("valid-token");
			const isValid = await api.verifyToken();

			expect(isValid).toBe(true);
			expect(requestUrlMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://api.are.na/v3/me",
					headers: expect.objectContaining({
						Authorization: "Bearer valid-token",
					}),
				}),
			);
		});

		it("returns false when /me returns 401", async () => {
			requestUrlMock.mockResolvedValueOnce({
				status: 401,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			});

			const api = new ArenaApi("invalid-token");
			const isValid = await api.verifyToken();

			expect(isValid).toBe(false);
		});

		it("returns false when /me request fails after retries", async () => {
			jest.useFakeTimers();
			requestUrlMock.mockRejectedValue(new Error("Network Error"));

			const api = new ArenaApi("token");
			const resultPromise = api.verifyToken();

			// Advance past all retry backoff delays
			for (let i = 0; i < MAX_RETRIES; i++) {
				await Promise.resolve();
				jest.advanceTimersByTime(30000);
			}

			const isValid = await resultPromise;

			expect(isValid).toBe(false);
			jest.useRealTimers();
		});
	});
});

describe("ArenaApi request caching", () => {
	let requestUrlMock: jest.SpyInstance;
	let dateNowMock: jest.SpyInstance;

	beforeEach(() => {
		requestUrlMock = jest.spyOn(obsidian, "requestUrl");
		dateNowMock = jest.spyOn(Date, "now");
	});

	afterEach(() => {
		requestUrlMock.mockRestore();
		dateNowMock.mockRestore();
	});

	it("caches getChannel and returns cached value on subsequent calls", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: {
				data: {
					id: 42,
					title: "Cached Channel",
					slug: "cached-channel",
					status: "public",
					user: makeBlock(1).user,
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
					length: 10,
				},
			},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		const first = await api.getChannel("cached-channel");
		expect(first.title).toBe("Cached Channel");
		expect(requestUrlMock).toHaveBeenCalledTimes(1);

		const second = await api.getChannel("cached-channel");
		expect(second.title).toBe("Cached Channel");
		expect(requestUrlMock).toHaveBeenCalledTimes(1); // no extra request
	});

	it("caches getBlock and returns cached value on subsequent calls", async () => {
		const blockData = { ...makeBlock(123), title: "Cached Block" };
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: { data: blockData },
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		const first = await api.getBlock(123);
		expect(first.title).toBe("Cached Block");
		expect(requestUrlMock).toHaveBeenCalledTimes(1);

		const second = await api.getBlock(123);
		expect(second.title).toBe("Cached Block");
		expect(requestUrlMock).toHaveBeenCalledTimes(1); // no extra request
	});

	it("expires cache after TTL and refetches", async () => {
		let now = 1000000;
		dateNowMock.mockImplementation(() => now);

		requestUrlMock
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: {
					data: {
						id: 1,
						title: "Old Title",
						slug: "expiring-channel",
						status: "public",
						user: makeBlock(1).user,
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: "2026-01-01T00:00:00.000Z",
						length: 5,
					},
				},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: {
					data: {
						id: 1,
						title: "New Title",
						slug: "expiring-channel",
						status: "public",
						user: makeBlock(1).user,
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: "2026-01-02T00:00:00.000Z",
						length: 5,
					},
				},
				arrayBuffer: new ArrayBuffer(0),
			});

		const api = new ArenaApi("token");
		const first = await api.getChannel("expiring-channel");
		expect(first.title).toBe("Old Title");
		expect(requestUrlMock).toHaveBeenCalledTimes(1);

		// Advance time past the 5-minute TTL
		now += 6 * 60 * 1000;

		const second = await api.getChannel("expiring-channel");
		expect(second.title).toBe("New Title");
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it("does not share cache across ArenaApi instances", async () => {
		requestUrlMock
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: {
					data: {
						id: 1,
						title: "Instance A",
						slug: "shared-slug",
						status: "public",
						user: makeBlock(1).user,
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: "2026-01-01T00:00:00.000Z",
						length: 0,
					},
				},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: {
					data: {
						id: 1,
						title: "Instance B",
						slug: "shared-slug",
						status: "public",
						user: makeBlock(1).user,
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: "2026-01-01T00:00:00.000Z",
						length: 0,
					},
				},
				arrayBuffer: new ArrayBuffer(0),
			});

		const apiA = new ArenaApi("token-a");
		const apiB = new ArenaApi("token-b");

		const first = await apiA.getChannel("shared-slug");
		const second = await apiB.getChannel("shared-slug");

		expect(first.title).toBe("Instance A");
		expect(second.title).toBe("Instance B");
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});
});
