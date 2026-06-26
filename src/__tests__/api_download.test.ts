import * as obsidian from "obsidian";
import { ArenaApi } from "../api";

describe("ArenaApi.downloadBinary retry logic", () => {
	const requestUrlMock = jest.spyOn(obsidian, "requestUrl");
	const api = new ArenaApi("test-token");

	beforeEach(() => {
		requestUrlMock.mockReset();
	});

	afterAll(() => {
		requestUrlMock.mockRestore();
	});

	it("downloads successfully on the first attempt", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			arrayBuffer: new ArrayBuffer(8),
			json: {},
		});

		const result = await api.downloadBinary("https://example.com/image.png");
		expect(result.byteLength).toBe(8);
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it("retries and succeeds after a network error", async () => {
		requestUrlMock
			.mockRejectedValueOnce(new Error("Network failure"))
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				arrayBuffer: new ArrayBuffer(8),
				json: {},
			});

		const result = await api.downloadBinary("https://example.com/image.png");
		expect(result.byteLength).toBe(8);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	}, 10000);

	it("retries and succeeds after a 429 rate limit", async () => {
		requestUrlMock
			.mockResolvedValueOnce({
				status: 429,
				headers: { "retry-after": "1" },
				arrayBuffer: new ArrayBuffer(0),
				json: {},
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: {},
				arrayBuffer: new ArrayBuffer(8),
				json: {},
			});

		const result = await api.downloadBinary("https://example.com/image.png");
		expect(result.byteLength).toBe(8);
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	}, 10000);

	it("throws after maximum retries are exhausted", async () => {
		requestUrlMock.mockResolvedValue({
			status: 500,
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
			json: {},
		});

		await expect(api.downloadBinary("https://example.com/image.png")).rejects.toThrow(
			"Asset download temporary failure (500)"
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(3);
	}, 15000);

	it("throws immediately on non-retriable 404 error", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 404,
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
			json: {},
		});

		await expect(api.downloadBinary("https://example.com/404.png")).rejects.toThrow(
			"Asset download failed (404)"
		);
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it("does not send Authorization header to external URLs (credential leak regression)", async () => {
		requestUrlMock.mockResolvedValueOnce({
			status: 200,
			headers: {},
			arrayBuffer: new ArrayBuffer(8),
			json: {},
		});

		await api.downloadBinary("https://cdn.external.com/image.png");
		const call = requestUrlMock.mock.calls[0][0] as { headers: Record<string, string> };
		expect(call.headers).toEqual({});
		expect(call.headers).not.toHaveProperty("Authorization");
	});
});
