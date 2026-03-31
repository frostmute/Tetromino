import { requestUrl, RequestUrlParam } from "obsidian";
import type {
	ArenaBlock,
	ArenaChannel,
	ArenaChannelListItem,
	ArenaPaginatedResponse,
} from "./types";

const BASE_URL = "https://api.are.na/v2";
const PER_PAGE = 100;
const MAX_RETRIES = 3;
const REQUEST_DELAY = 100; // ms between requests
const JITTER = 50; // ms
const RATE_LIMIT_STATUS = 429;
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(baseDelay: number): number {
	return baseDelay + Math.random() * JITTER;
}

function transientBackoffMs(attempt: number): number {
	// 1s, 2s, 4s ... plus jitter.
	const base = 1000 * Math.pow(2, Math.max(0, attempt - 1));
	return Math.round(withJitter(base));
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
		body?: unknown,
	): Promise<T> {
		let attempts = 0;

		while (attempts < MAX_RETRIES) {
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

			let res;
			try {
				res = await requestUrl(params);
			} catch (err) {
				attempts++;
				if (attempts >= MAX_RETRIES) {
					throw err;
				}
				await delay(transientBackoffMs(attempts));
				continue;
			}

			// Handle rate limiting with exponential backoff
			if (res.status === RATE_LIMIT_STATUS) {
				const retryAfter = parseInt(
					res.headers["retry-after"] || "60",
					10,
				);
				const backoffMs = retryAfter * 1000;
				attempts++;

				if (attempts >= MAX_RETRIES) {
					throw new Error(
						`Are.na API rate limited (429). Max retries exceeded. ` +
							`Try again in ${retryAfter} seconds.`,
					);
				}

				if (this.debug) {
					console.log(
						`[arena-sync] Rate limited. Retrying after ${retryAfter}s ` +
							`(attempt ${attempts}/${MAX_RETRIES})`,
					);
				}

				await delay(backoffMs);
				continue;
			}

			if (TRANSIENT_STATUSES.has(res.status)) {
				attempts++;
				if (attempts >= MAX_RETRIES) {
					throw new Error(
						`Are.na API temporary failure (${res.status}). ` +
							`Max retries exceeded.`,
					);
				}
				const backoffMs = transientBackoffMs(attempts);
				if (this.debug) {
					console.log(
						`[arena-sync] ${res.status} retry in ${backoffMs}ms ` +
							`(attempt ${attempts}/${MAX_RETRIES})`,
					);
				}
				await delay(backoffMs);
				continue;
			}

			if (res.status < 200 || res.status >= 300) {
				const errorMessage = this.getErrorMessage(res.status);
				throw new Error(errorMessage);
			}

			return res.json as T;
		}

		throw new Error("Are.na API request failed after max retries");
	}

	private getErrorMessage(status: number): string {
		switch (status) {
			case 400:
				return "Are.na API error: Invalid request (400). Check your channel slug and try again.";
			case 401:
				return "Are.na API error: Invalid API token (401). Please check your token in settings.";
			case 403:
				return "Are.na API error: Access denied (403). The channel may be private or you don't have permission.";
			case 404:
				return "Are.na API error: Channel not found (404). Check that the channel slug is correct.";
			case 429:
				return "Are.na API error: Rate limited (429). Too many requests — please try again later.";
			case 500:
				return "Are.na API error: Server error (500). Are.na may be temporarily unavailable.";
			case 502:
			case 503:
			case 504:
				return "Are.na API error: Service unavailable. Are.na may be down for maintenance.";
			default:
				return `Are.na API error ${status}. Please try again or check Are.na status.`;
		}
	}

	async verifyToken(): Promise<boolean> {
		try {
			await this.request("GET", "/me");
			return true;
		} catch (err) {
			if (this.debug) {
				console.log(`[arena-sync] Token verification failed:`, err);
			}
			return false;
		}
	}

	async getChannel(slug: string): Promise<ArenaChannel> {
		return this.request<ArenaChannel>(
			"GET",
			`/channels/${encodeURIComponent(slug)}?per=${PER_PAGE}`,
		);
	}

	async getChannelContents(
		slug: string,
		page = 1,
	): Promise<ArenaPaginatedResponse<ArenaBlock>> {
		return this.request<ArenaPaginatedResponse<ArenaBlock>>(
			"GET",
			`/channels/${encodeURIComponent(slug)}/contents?page=${page}&per=${PER_PAGE}`,
		);
	}

	async getAllChannelBlocks(slug: string): Promise<ArenaBlock[]> {
		return this.getAllChannelBlocksWithProgress(slug, () => {});
	}

	async getAllChannelBlocksWithProgress(
		slug: string,
		onPage: (currentPage: number, totalPages: number) => void,
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
						Math.ceil(page.length / PER_PAGE),
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
				const duplicatePage =
					newBlocksCount === 0 && page.contents.length > 0;

				if (
					emptyPage ||
					lastPageByCount ||
					lastPageByTotal ||
					duplicatePage
				) {
					hasMore = false;
					if (this.debug) {
						console.log(
							`[arena-sync] Stopping pagination for ${slug}: ` +
								`page=${pageNumber}, totalPages=${totalPagesEstimate}, ` +
								`blocksOnPage=${page.contents.length}, ` +
								`newBlocks=${newBlocksCount}, ` +
								`reason=${emptyPage ? "empty" : lastPageByCount ? "partial" : lastPageByTotal ? "total" : "duplicates"}`,
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
					error,
				);

				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
					throw new Error(
						`Failed to fetch channel ${slug} after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. ` +
							`Last error: ${(error as Error).message}`,
					);
				}

				await delay(
					REQUEST_DELAY * consecutiveErrors + withJitter(JITTER),
				);
			}
		}

		if (this.debug) {
			console.log(
				`[arena-sync] Fetched ${blocks.length} unique blocks from ${slug} ` +
					`across ${pageNumber} page(s)`,
			);
		}

		return blocks.sort((a, b) => a.position - b.position);
	}

	async listMyChannels(
		page = 1,
	): Promise<ArenaPaginatedResponse<ArenaChannelListItem>> {
		return this.request<ArenaPaginatedResponse<ArenaChannelListItem>>(
			"GET",
			`/me/channels?page=${page}&per=${PER_PAGE}`,
		);
	}

	async getBlock(id: number): Promise<ArenaBlock> {
		return this.request<ArenaBlock>("GET", `/blocks/${id}`);
	}

	async downloadBinary(url: string): Promise<ArrayBuffer> {
		let attempts = 0;

		while (attempts < MAX_RETRIES) {
			let res;
			try {
				res = await requestUrl({
					url,
					method: "GET",
					headers: this.headers(),
				});
			} catch (err) {
				attempts++;
				if (attempts >= MAX_RETRIES) {
					throw err;
				}
				await delay(transientBackoffMs(attempts));
				continue;
			}

			// Handle rate limiting
			if (res.status === RATE_LIMIT_STATUS) {
				const retryAfter = parseInt(
					res.headers["retry-after"] || "60",
					10,
				);
				attempts++;

				if (attempts >= MAX_RETRIES) {
					throw new Error(
						`Asset download rate limited (429). ` +
							`Try again in ${retryAfter} seconds.`,
					);
				}

				if (this.debug) {
					console.log(
						`[arena-sync] Download rate limited. ` +
							`Retrying after ${retryAfter}s ` +
							`(attempt ${attempts}/${MAX_RETRIES})`,
					);
				}

				await delay(retryAfter * 1000);
				continue;
			}

			if (TRANSIENT_STATUSES.has(res.status)) {
				attempts++;
				if (attempts >= MAX_RETRIES) {
					throw new Error(
						`Asset download temporary failure (${res.status}) for ${url}`,
					);
				}
				await delay(transientBackoffMs(attempts));
				continue;
			}

			if (res.status < 200 || res.status >= 300) {
				throw new Error(
					`Asset download failed (${res.status}) for ${url}`,
				);
			}

			return res.arrayBuffer;
		}

		throw new Error(`Asset download failed after max retries for ${url}`);
	}
}
