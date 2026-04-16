import * as obsidian from "obsidian";
import { ArenaApi } from "../api";
import type { ArenaBlock } from "../types";

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

describe("ArenaApi", () => {
	const requestUrlMock = jest.spyOn(obsidian, "requestUrl");

	beforeEach(() => {
		requestUrlMock.mockReset();
		jest.useRealTimers();
	});

	afterAll(() => {
		requestUrlMock.mockRestore();
	});

	describe("v3 adapters", () => {
		it("parses v3 data/meta payloads for channel contents", async () => {
			requestUrlMock.mockResolvedValueOnce({
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
		});

		it("unwraps v3 data payloads for single resources", async () => {
			requestUrlMock
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
		});
	});

	describe("verifyToken", () => {
		it("returns true when token is valid", async () => {
			requestUrlMock.mockResolvedValueOnce({
				status: 200,
				headers: {},
				json: { data: { id: 1, username: "tester" } },
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

		it("returns false when token is invalid (401)", async () => {
			requestUrlMock.mockResolvedValueOnce({
				status: 401,
				headers: {},
				json: { message: "Invalid token" },
				arrayBuffer: new ArrayBuffer(0),
			});

			const api = new ArenaApi("invalid-token");
			const isValid = await api.verifyToken();

			expect(isValid).toBe(false);
			expect(requestUrlMock).toHaveBeenCalledTimes(1);
		});

		it("returns false after max retries on network failure", async () => {
			requestUrlMock.mockRejectedValue(new Error("Network Error"));

			const api = new ArenaApi("token");

			jest.useFakeTimers();

			const verifyPromise = api.verifyToken();

			// Fast-forward through retries (MAX_RETRIES = 3)
			for (let i = 0; i < 3; i++) {
				await jest.runAllTimersAsync();
			}

			const isValid = await verifyPromise;

			expect(isValid).toBe(false);
			expect(requestUrlMock).toHaveBeenCalledTimes(3);
		});
	});
});
