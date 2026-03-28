import {requestUrl, RequestUrlParam} from "obsidian";
import type {ArenaBlock, ArenaChannel, ArenaChannelListItem, ArenaPaginatedResponse} from "./types";

const BASE_URL = "https://api.are.na/v2";
const PER_PAGE = 100;
const MAX_RETRIES = 3;
const REQUEST_DELAY = 100; // ms between requests
const JITTER = 50; // ms

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Adds a random jitter to a base delay.
 *
 * @param baseDelay - The base delay in milliseconds
 * @returns The resulting delay in milliseconds: `baseDelay` plus a random value in the range `0` to `JITTER`
 */
function withJitter(baseDelay: number): number {
	return baseDelay + Math.random() * JITTER;
}

export class ArenaApi {
	private token: string;
	private debug: boolean;

	constructor(token: string, debug = false) {
		this.token = token;
		this.debug = debug;
	}

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

	async verifyToken(): Promise<boolean> {
		try {
			await this.request("GET", "/me");
			return true;
		} catch {
			return false;
		}
	}

	async getChannel(slug: string): Promise<ArenaChannel> {
		return this.request<ArenaChannel>(
			"GET",
			`/channels/${encodeURIComponent(slug)}?per=${PER_PAGE}`
		);
	}

	async getChannelContents(
		slug: string,
		page = 1
	): Promise<ArenaPaginatedResponse<ArenaBlock>> {
		return this.request<ArenaPaginatedResponse<ArenaBlock>>(
			"GET",
			`/channels/${encodeURIComponent(slug)}/contents?page=${page}&per=${PER_PAGE}`
		);
	}

	async getAllChannelBlocks(slug: string): Promise<ArenaBlock[]> {
		return this.getAllChannelBlocksWithProgress(slug, () => {});
	}

	async getAllChannelBlocksWithProgress(
		slug: string,
		onPage: (currentPage: number, totalPages: number) => void
	): Promise<ArenaBlock[]> {
		const blocks: ArenaBlock[] = [];
		const seenBlockIds = new Set<number>();
		let pageNumber = 1;
		let hasMore = true;
		let totalPagesEstimate = 1;
		let consecutiveErrors = 0;
		const MAX_CONSECUTIVE_ERRORS = 3;

		while (hasMore) {
			try {
				if (pageNumber > 1) {
					await delay(withJitter(REQUEST_DELAY));
				}

				const page = await this.getChannelContents(slug, pageNumber);
				consecutiveErrors = 0;

				if (page.total_pages && page.total_pages > totalPagesEstimate) {
					totalPagesEstimate = page.total_pages;
				}

				if (page.length && page.length > 0) {
					totalPagesEstimate = Math.max(
						totalPagesEstimate,
						Math.ceil(page.length / PER_PAGE)
					);
				}

				let newBlocksCount = 0;
				for (const block of page.contents) {
					if (!seenBlockIds.has(block.id)) {
						seenBlockIds.add(block.id);
						blocks.push(block);
						newBlocksCount++;
					}
				}

				onPage(pageNumber, totalPagesEstimate);

				const emptyPage = page.contents.length === 0;
				const lastPageByCount = page.contents.length < PER_PAGE;
				const lastPageByTotal = pageNumber >= totalPagesEstimate;
				const duplicatePage = newBlocksCount === 0 && page.contents.length > 0;

				if (emptyPage || lastPageByCount || lastPageByTotal || duplicatePage) {
					hasMore = false;
					if (this.debug) {
						console.log(
							`[arena-sync] Stopping pagination for ${slug}: ` +
							`page=${pageNumber}, totalPages=${totalPagesEstimate}, ` +
							`blocksOnPage=${page.contents.length}, ` +
							`newBlocks=${newBlocksCount}, ` +
							`reason=${emptyPage ? 'empty' : lastPageByCount ? 'partial' : lastPageByTotal ? 'total' : 'duplicates'}`
						);
					}
				} else {
					pageNumber++;
				}
			} catch (error) {
				consecutiveErrors++;
				console.error(
					`[arena-sync] Error fetching page ${pageNumber} for ${slug} ` +
					`(attempt ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
					error
				);

				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
					throw new Error(
						`Failed to fetch channel ${slug} after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. ` +
						`Last error: ${(error as Error).message}`
					);
				}

				await delay(REQUEST_DELAY * consecutiveErrors + withJitter(JITTER));
			}
		}

		if (this.debug) {
			console.log(
				`[arena-sync] Fetched ${blocks.length} unique blocks from ${slug} ` +
				`across ${pageNumber} page(s)`
			);
		}

		return blocks.sort((a, b) => a.position - b.position);
	}

	async listMyChannels(
		page = 1
	): Promise<ArenaPaginatedResponse<ArenaChannelListItem>> {
		return this.request<ArenaPaginatedResponse<ArenaChannelListItem>>(
			"GET",
			`/me/channels?page=${page}&per=${PER_PAGE}`
		);
	}

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
