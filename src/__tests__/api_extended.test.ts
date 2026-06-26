import * as obsidian from "obsidian";
import { ArenaApi } from "../api";
import { makeBlock } from "./fixtures";
import type { ArenaBlock, ArenaChannelListItem } from "../types";

const MAX_RETRIES = 3;
const PER_PAGE = 100;

/**
 * Helper to drive a promise to completion when the code under test
 * schedules timers (delays, backoffs). We alternate flushing microtasks
 * and advancing fake timers by a large chunk until the promise settles.
 */
async function flushPromise<T>(promise: Promise<T>): Promise<T> {
	let done = false;
	let result: T;
	let error: unknown;

	promise.then(
		(v) => {
			done = true;
			result = v;
		},
		(e) => {
			done = true;
			error = e;
		},
	);

	while (!done) {
		await Promise.resolve();
		jest.advanceTimersByTime(30000);
	}

	if (error !== undefined) throw error;
	return result!;
}

function makeBlocks(count: number, startId = 1): ArenaBlock[] {
	return Array.from({ length: count }, (_, i) => makeBlock(startId + i));
}

function makePageResponse(
	pageNum: number,
	blocks: ArenaBlock[],
	totalPages: number,
	totalCount?: number,
) {
	return {
		status: 200,
		headers: {},
		json: {
			data: blocks,
			meta: {
				current_page: pageNum,
				per_page: PER_PAGE,
				total_pages: totalPages,
				total_count: totalCount ?? blocks.length,
			},
		},
		arrayBuffer: new ArrayBuffer(0),
	};
}

describe("ArenaApi request retry and error handling", () => {
	let requestUrlMock: jest.SpyInstance;

	beforeEach(() => {
		requestUrlMock = jest.spyOn(obsidian, "requestUrl");
		jest.useFakeTimers();
	});

	afterEach(() => {
		requestUrlMock.mockRestore();
		jest.useRealTimers();
	});

	it("retries on 429 rate limit and succeeds", async () => {
		requestUrlMock
			.mockResolvedValueOnce({
				status: 429,
				headers: { "retry-after": "1" },
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: { data: { id: 1, slug: "channel" } },
				arrayBuffer: new ArrayBuffer(0),
			});

		const api = new ArenaApi("token");
		const channel = await flushPromise(api.getChannel("test"));
		expect(channel.id).toBe(1);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it("retries on 500 transient error and succeeds", async () => {
		requestUrlMock
			.mockResolvedValueOnce({
				status: 500,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: { data: { id: 2, slug: "channel" } },
				arrayBuffer: new ArrayBuffer(0),
			});

		const api = new ArenaApi("token");
		const channel = await flushPromise(api.getChannel("test"));
		expect(channel.id).toBe(2);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it("retries on 502/503/504 and succeeds", async () => {
		requestUrlMock
			.mockResolvedValueOnce({
				status: 502,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 503,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: { data: { id: 3, slug: "channel" } },
				arrayBuffer: new ArrayBuffer(0),
			});

		const api = new ArenaApi("token");
		const channel = await flushPromise(api.getChannel("test"));
		expect(channel.id).toBe(3);
		expect(requestUrlMock).toHaveBeenCalledTimes(3);
	});

	it("throws 401 immediately without retry", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 401,
			headers: {},
			json: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		await expect(api.getChannel("test")).rejects.toThrow(
			"Invalid API token (401)",
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it("throws 403 immediately without retry", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 403,
			headers: {},
			json: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		await expect(api.getChannel("test")).rejects.toThrow(
			"Access denied (403)",
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it("throws 404 immediately without retry", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 404,
			headers: {},
			json: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		await expect(api.getChannel("test")).rejects.toThrow(
			"Channel not found (404)",
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it("throws after max retries on persistent 500", async () => {
		requestUrlMock.mockResolvedValue({
			status: 500,
			headers: {},
			json: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		await expect(flushPromise(api.getChannel("test"))).rejects.toThrow(
			"Server error (500)",
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(MAX_RETRIES);
	});

	it("retries on network error and succeeds", async () => {
		requestUrlMock
			.mockRejectedValueOnce(new Error("Network timeout"))
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: { data: { id: 4, slug: "channel" } },
				arrayBuffer: new ArrayBuffer(0),
			});

		const api = new ArenaApi("token");
		const channel = await flushPromise(api.getChannel("test"));
		expect(channel.id).toBe(4);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it("throws after max network errors", async () => {
		requestUrlMock.mockRejectedValue(new Error("Network timeout"));

		const api = new ArenaApi("token");
		await expect(flushPromise(api.getChannel("test"))).rejects.toThrow(
			"Network timeout",
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(MAX_RETRIES);
	});

	it("returns correct error messages for status codes", async () => {
		const cases = [
			{ status: 400, calls: 1, message: "Invalid request (400)" },
			{ status: 401, calls: 1, message: "Invalid API token (401)" },
			{ status: 403, calls: 1, message: "Access denied (403)" },
			{ status: 404, calls: 1, message: "Channel not found (404)" },
			{ status: 429, calls: 3, message: "Rate limited (429)" },
			{ status: 500, calls: 3, message: "Server error (500)" },
			{ status: 502, calls: 3, message: "Service unavailable" },
			{ status: 999, calls: 1, message: "Are.na API error 999" },
		];

		for (const { status, calls, message } of cases) {
			for (let i = 0; i < calls; i++) {
				requestUrlMock.mockResolvedValueOnce({
					status,
					headers: status === 429 ? { "retry-after": "1" } : {},
					json: {},
					arrayBuffer: new ArrayBuffer(0),
				});
			}

			const api = new ArenaApi("token");
			await expect(
				flushPromise(api.getChannel("test")),
			).rejects.toThrow(message);
		}
	});
});

describe("ArenaApi pagination", () => {
	let requestUrlMock: jest.SpyInstance;

	beforeEach(() => {
		requestUrlMock = jest.spyOn(obsidian, "requestUrl");
		jest.useFakeTimers();
	});

	afterEach(() => {
		requestUrlMock.mockRestore();
		jest.useRealTimers();
	});

	it("fetches all pages until completion", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makePageResponse(1, makeBlocks(100), 3, 201),
			)
			.mockResolvedValueOnce(
				makePageResponse(2, makeBlocks(100, 101), 3, 201),
			)
			.mockResolvedValueOnce(
				makePageResponse(3, makeBlocks(1, 201), 3, 201),
			);

		const api = new ArenaApi("token");
		const onPage = jest.fn();
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", onPage),
		);

		expect(blocks).toHaveLength(201);
		expect(blocks.map((b) => b.id)).toEqual(
			Array.from({ length: 201 }, (_, i) => i + 1),
		);
		expect(onPage).toHaveBeenCalledTimes(3);
		expect(onPage).toHaveBeenNthCalledWith(1, 1, 3);
		expect(onPage).toHaveBeenNthCalledWith(2, 2, 3);
		expect(onPage).toHaveBeenNthCalledWith(3, 3, 3);
	});

	it("deduplicates blocks across pages", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makePageResponse(1, makeBlocks(100), 2, 101),
			)
			.mockResolvedValueOnce(
				makePageResponse(2, [makeBlock(100), makeBlock(101)], 2, 101),
			);

		const api = new ArenaApi("token");
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", () => {}),
		);
		expect(blocks).toHaveLength(101);
		expect(blocks.map((b) => b.id)).toEqual(
			Array.from({ length: 101 }, (_, i) => i + 1),
		);
	});

	it("stops pagination on empty page", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makePageResponse(1, makeBlocks(100), 2, 100),
			)
			.mockResolvedValueOnce(makePageResponse(2, [], 2, 100));

		const api = new ArenaApi("token");
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", () => {}),
		);
		expect(blocks).toHaveLength(100);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it("stops pagination on partial page", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makePageResponse(1, makeBlocks(100), 10, 150),
			)
			.mockResolvedValueOnce(
				makePageResponse(2, makeBlocks(50, 101), 10, 150),
			);

		const api = new ArenaApi("token");
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", () => {}),
		);
		expect(blocks).toHaveLength(150);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it("stops pagination when total pages reached", async () => {
		requestUrlMock.mockResolvedValueOnce(
			makePageResponse(1, makeBlocks(100), 1, 100),
		);

		const api = new ArenaApi("token");
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", () => {}),
		);
		expect(blocks).toHaveLength(100);
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it("stops pagination on duplicate page", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makePageResponse(1, makeBlocks(100), 2, 100),
			)
			.mockResolvedValueOnce(
				makePageResponse(2, [makeBlock(1)], 2, 100),
			);

		const api = new ArenaApi("token");
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", () => {}),
		);
		expect(blocks).toHaveLength(100);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it("sorts blocks by position then id", async () => {
		requestUrlMock.mockResolvedValueOnce(
			makePageResponse(1, [
				makeBlock(3, { position: 10 }),
				makeBlock(2, { position: 1 }),
				makeBlock(1, { position: undefined }),
			]),
		);

		const api = new ArenaApi("token");
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", () => {}),
		);
		expect(blocks.map((b) => b.id)).toEqual([2, 3, 1]);
	});

	it("retries page fetch on transient errors via fetchPageWithRetries", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makePageResponse(1, makeBlocks(100), 2, 101),
			)
			.mockResolvedValueOnce({
				status: 500,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 500,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce({
				status: 500,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			})
			.mockResolvedValueOnce(
				makePageResponse(2, [makeBlock(101)], 2, 101),
			);

		const api = new ArenaApi("token");
		const blocks = await flushPromise(
			api.getAllChannelBlocksWithProgress("test-channel", () => {}),
		);
		expect(blocks).toHaveLength(101);
		expect(requestUrlMock).toHaveBeenCalledTimes(5);
	});

	it("throws after max consecutive errors in fetchPageWithRetries", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makePageResponse(1, makeBlocks(100), 2, 100),
			)
			.mockResolvedValue({
				status: 500,
				headers: {},
				json: {},
				arrayBuffer: new ArrayBuffer(0),
			});

		const api = new ArenaApi("token");
		await expect(
			flushPromise(
				api.getAllChannelBlocksWithProgress("test-channel", () => {}),
			),
		).rejects.toThrow(
			"Failed to fetch channel test-channel after 3 consecutive errors",
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(1 + 9);
	});
});

describe("ArenaApi normalization edge cases", () => {
	let requestUrlMock: jest.SpyInstance;

	beforeEach(() => {
		requestUrlMock = jest.spyOn(obsidian, "requestUrl");
	});

	afterEach(() => {
		requestUrlMock.mockRestore();
	});

	it("normalizes v2/legacy paginated response", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: {
				contents: [makeBlock(1)],
				length: 1,
				total_pages: 1,
				current_page: 1,
				per: 50,
			},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		const page = await api.getChannelContents("test", 1);
		expect(page.contents).toHaveLength(1);
		expect(page.current_page).toBe(1);
		expect(page.total_pages).toBe(1);
		expect(page.per).toBe(50);
	});

	it("normalizes raw array paginated response", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: [makeBlock(1), makeBlock(2)],
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		const page = await api.getChannelContents("test", 1);
		expect(page.contents).toHaveLength(2);
		expect(page.current_page).toBe(1);
		expect(page.total_pages).toBe(1);
		expect(page.per).toBe(2);
	});

	it("normalizes channel length from total_connections", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: {
				data: {
					id: 1,
					slug: "test",
					title: "Test",
					status: "public",
					user: makeBlock(1).user,
					total_connections: 42,
				},
			},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		const channel = await api.getChannel("test");
		expect(channel.length).toBe(42);
	});

	it("normalizes channel length from connections_count", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: {
				data: {
					id: 1,
					slug: "test",
					title: "Test",
					status: "public",
					user: makeBlock(1).user,
					connections_count: 7,
				},
			},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		const channel = await api.getChannel("test");
		expect(channel.length).toBe(7);
	});

	it("handles missing channel metadata and description", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			json: {
				data: {
					id: 1,
					slug: "test",
					title: "Test",
					status: "public",
					user: makeBlock(1).user,
					length: 0,
				},
			},
			arrayBuffer: new ArrayBuffer(0),
		});

		const api = new ArenaApi("token");
		const channel = await api.getChannel("test");
		expect(channel.metadata).toBeNull();
		expect(channel.description).toBeNull();
	});
});

describe("ArenaApi block types", () => {
	let requestUrlMock: jest.SpyInstance;

	beforeEach(() => {
		requestUrlMock = jest.spyOn(obsidian, "requestUrl");
	});

	afterEach(() => {
		requestUrlMock.mockRestore();
	});

	it("fetches various block types", async () => {
		const types: { cls: string; overrides: Partial<ArenaBlock> }[] = [
			{
				cls: "Image",
				overrides: {
					image: {
						filename: "img.png",
						content_type: "image/png",
						original: { url: "https://example.com/img.png" },
						display: { url: "https://example.com/display.png" },
						thumb: { url: "https://example.com/thumb.png" },
					},
				},
			},
			{
				cls: "Embed",
				overrides: {
					source: { url: "https://example.com", title: "Example" },
				},
			},
			{
				cls: "Media",
				overrides: {
					attachment: {
						file_name: "vid.mp4",
						file_size: 1024,
						url: "https://example.com/vid.mp4",
						content_type: "video/mp4",
						extension: "mp4",
					},
				},
			},
			{
				cls: "Attachment",
				overrides: {
					attachment: {
						file_name: "doc.pdf",
						file_size: 2048,
						url: "https://example.com/doc.pdf",
						content_type: "application/pdf",
						extension: "pdf",
					},
				},
			},
			{
				cls: "Link",
				overrides: {
					source: { url: "https://example.com", title: "Link" },
				},
			},
		];

		for (let i = 0; i < types.length; i++) {
			const { cls, overrides } = types[i];
			requestUrlMock.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: { data: makeBlock(i + 1, { class: cls, ...overrides }) },
				arrayBuffer: new ArrayBuffer(0),
			});
		}

		const api = new ArenaApi("token");
		for (let i = 0; i < types.length; i++) {
			const { cls } = types[i];
			const block = await api.getBlock(i + 1);
			expect(block.class).toBe(cls);
		}
	});
});

describe("ArenaApi listMyChannels", () => {
	let requestUrlMock: jest.SpyInstance;

	beforeEach(() => {
		requestUrlMock = jest.spyOn(obsidian, "requestUrl");
	});

	afterEach(() => {
		requestUrlMock.mockRestore();
	});

	function makeChannelResponse(
		pageNum: number,
		channels: ArenaChannelListItem[],
		totalPages: number,
	) {
		return {
			status: 200,
			headers: {},
			json: {
				data: channels,
				meta: {
					current_page: pageNum,
					per_page: 100,
					total_pages: totalPages,
					total_count: channels.length,
				},
			},
			arrayBuffer: new ArrayBuffer(0),
		};
	}

	it("lists channels with pagination", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makeChannelResponse(
					1,
					[
						{
							id: 1,
							title: "Channel 1",
							slug: "ch-1",
							length: 5,
							status: "public",
							updated_at: "2026-01-01T00:00:00.000Z",
						},
					],
					2,
				),
			)
			.mockResolvedValueOnce(
				makeChannelResponse(
					2,
					[
						{
							id: 2,
							title: "Channel 2",
							slug: "ch-2",
							length: 3,
							status: "public",
							updated_at: "2026-01-01T00:00:00.000Z",
						},
					],
					2,
				),
			);

		const api = new ArenaApi("token");
		const page = await api.listMyChannels(1);
		expect(page.contents).toHaveLength(1);
		expect(page.total_pages).toBe(2);
		expect(page.contents[0].slug).toBe("ch-1");

		const page2 = await api.listMyChannels(2);
		expect(page2.contents[0].slug).toBe("ch-2");
	});

	it("lists all my channels", async () => {
		requestUrlMock
			.mockResolvedValueOnce(
				makeChannelResponse(
					1,
					[
						{
							id: 1,
							title: "A",
							slug: "a",
							length: 1,
							status: "public",
							updated_at: "2026-01-01T00:00:00.000Z",
						},
					],
					2,
				),
			)
			.mockResolvedValueOnce(
				makeChannelResponse(
					2,
					[
						{
							id: 2,
							title: "B",
							slug: "b",
							length: 2,
							status: "public",
							updated_at: "2026-01-01T00:00:00.000Z",
						},
					],
					2,
				),
			);

		const api = new ArenaApi("token");
		const channels = await api.listAllMyChannels();
		expect(channels).toHaveLength(2);
		expect(channels.map((c) => c.slug)).toEqual(["a", "b"]);
	});
});
