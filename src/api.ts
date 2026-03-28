import {requestUrl, RequestUrlParam} from "obsidian";
import type {ArenaBlock, ArenaChannel, ArenaChannelListItem, ArenaPaginatedResponse,} from "./types";

const BASE_URL = "https://api.are.na/v2";
const PER_PAGE = 100;

/**
 * Lightweight Are.na REST client.
 * Uses Obsidian's built-in `requestUrl` so that requests work on
 * both desktop and mobile without CORS issues.
 */
export class ArenaApi {
	private token: string;
	private debug: boolean;

	constructor(token: string, debug = false) {
		this.token = token;
		this.debug = debug;
	}

	/* ------------------------------------------------------------------ */
	/*  Internals                                                         */
	/* ------------------------------------------------------------------ */

	private headers(): Record<string, string> {
		const h: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.token) {
			h["Authorization"] = `Bearer ${this.token}`;
		}
		return h;
	}

	private async request<T>(
		method: string,
		path: string,
		body?: unknown
	): Promise<T> {
		const params: RequestUrlParam = {
			url: `${BASE_URL}${path}`,
			method,
			headers: this.headers(),
		};
		if (body) {
			params.body = JSON.stringify(body);
		}

		if (this.debug) {
			console.log(`[arena-sync] ${method} ${params.url}`);
		}

		const res = await requestUrl(params);

		if (res.status < 200 || res.status >= 300) {
			throw new Error(
				`Are.na API error ${res.status}: ${JSON.stringify(res.json)}`
			);
		}
		return res.json as T;
	}

	/* ------------------------------------------------------------------ */
	/*  Public helpers                                                    */
	/* ------------------------------------------------------------------ */

	/** Verify that the stored token is valid. */
	async verifyToken(): Promise<boolean> {
		try {
			await this.request("GET", "/me");
			return true;
		} catch {
			return false;
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Channels                                                          */
	/* ------------------------------------------------------------------ */

	/** Return a single channel with its first page of contents. */
	async getChannel(slug: string): Promise<ArenaChannel> {
		return this.request<ArenaChannel>(
			"GET",
			`/channels/${encodeURIComponent(slug)}?per=${PER_PAGE}`
		);
	}

	/** Return a page of contents for a channel. */
	async getChannelContents(
		slug: string,
		page = 1
	): Promise<ArenaPaginatedResponse<ArenaBlock>> {
		return this.request<ArenaPaginatedResponse<ArenaBlock>>(
			"GET",
			`/channels/${encodeURIComponent(slug)}/contents?page=${page}&per=${PER_PAGE}`
		);
	}

	/**
	 * Retrieve **all** blocks in a channel, transparently paginating.
	 * Returns blocks sorted by `position` (ascending).
	 */
	async getAllChannelBlocks(slug: string): Promise<ArenaBlock[]> {
		const first = await this.getChannelContents(slug, 1);
		const blocks: ArenaBlock[] = [...first.contents];

		for (let p = 2; p <= first.total_pages; p++) {
			const page = await this.getChannelContents(slug, p);
			blocks.push(...page.contents);
		}

		return blocks.sort((a, b) => a.position - b.position);
	}

	async getAllChannelBlocksWithProgress(
		slug: string,
		onPage: (currentPage: number, totalPages: number) => void
	): Promise<ArenaBlock[]> {
		const first = await this.getChannelContents(slug, 1);
		onPage(1, first.total_pages);
		const blocks: ArenaBlock[] = [...first.contents];

		for (let p = 2; p <= first.total_pages; p++) {
			const page = await this.getChannelContents(slug, p);
			blocks.push(...page.contents);
			onPage(p, first.total_pages);
		}

		return blocks.sort((a, b) => a.position - b.position);
	}

	/** List channels for the authenticated user. */
	async listMyChannels(
		page = 1
	): Promise<ArenaPaginatedResponse<ArenaChannelListItem>> {
		return this.request<ArenaPaginatedResponse<ArenaChannelListItem>>(
			"GET",
			`/me/channels?page=${page}&per=${PER_PAGE}`
		);
	}

	/* ------------------------------------------------------------------ */
	/*  Blocks                                                            */
	/* ------------------------------------------------------------------ */

	/** Fetch a single block by ID. */
	async getBlock(id: number): Promise<ArenaBlock> {
		return this.request<ArenaBlock>("GET", `/blocks/${id}`);
	}

	async downloadBinary(url: string): Promise<ArrayBuffer> {
		const res = await requestUrl({
			url,
			method: "GET",
			headers: this.headers(),
		});
		if (res.status < 200 || res.status >= 300) {
			throw new Error(`Asset download failed (${res.status}) for ${url}`);
		}
		return res.arrayBuffer;
	}
}
