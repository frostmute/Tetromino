import { requestUrl, RequestUrlParam } from "obsidian";
import type {
	ArenaBlock,
	ArenaChannel,
	ArenaChannelListItem,
	ArenaPaginatedResponse,
} from "./types";

const BASE_URL = "https://api.are.na";
const API_VERSION_PREFIX = "/v3";
const PER_PAGE = 100;
const MAX_RETRIES = 3;
const RATE_LIMIT_STATUS = 429;
const REQUEST_DELAY = 100;
const JITTER = 50;

const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number): number {
	return ms + Math.floor(Math.random() * JITTER);
}

function transientBackoffMs(attempts: number): number {
	return Math.min(1000 * Math.pow(2, attempts), 10000) + Math.floor(Math.random() * JITTER);
}

function isRecord(val: unknown): val is Record<string, unknown> {
	return typeof val === "object" && val !== null && !Array.isArray(val);
}

function asNumber(val: unknown): number | null {
	const n = typeof val === "string" ? parseInt(val, 10) : val;
	return typeof n === "number" && !isNaN(n) ? n : null;
}

interface CacheEntry<T> {
	value: T;
	expiry: number;
}

export class ArenaApi {
	private token: string;
	private debug: boolean;
	private cache = new Map<string, CacheEntry<unknown>>();
	private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	constructor(token: string, debug = false) {
		this.token = token;
		this.debug = debug;
	}

	private getCached<T>(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;
		if (Date.now() > entry.expiry) {
			this.cache.delete(key);
			return undefined;
		}
		return entry.value as T;
	}

	private setCached<T>(key: string, value: T): void {
		this.cache.set(key, { value, expiry: Date.now() + this.CACHE_TTL_MS });
	}


	private log(message: string, ...args: unknown[]): void {
		if (this.debug) {
			console.log(`[arena-sync] ${message}`, ...args);
		}
	}

	private logError(message: string, ...args: unknown[]): void {
		console.error(`[arena-sync] ${message}`, ...args);
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
				url: this.buildApiUrl(path),
				method,
				headers: this.headers(),
			};
			if (body) {
				params.body = JSON.stringify(body);
			}

			this.log(`${method} ${params.url}`);

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
				const retryAfter = this.readRetryAfterSeconds(res.headers);
				attempts++;

				if (attempts >= MAX_RETRIES) {
					throw new Error(this.getErrorMessage(RATE_LIMIT_STATUS));
				}

				this.log(
					`Rate limited (429). ` +
						`Retrying after ${retryAfter}s ` +
						`(attempt ${attempts}/${MAX_RETRIES})`
				);

				await delay(retryAfter * 1000);
				continue;
			}

			// Handle transient server errors
			if (TRANSIENT_STATUSES.has(res.status)) {
				attempts++;
				if (attempts >= MAX_RETRIES) {
					throw new Error(this.getErrorMessage(res.status));
				}
				await delay(transientBackoffMs(attempts));
				continue;
			}

			if (res.status < 200 || res.status >= 300) {
				throw new Error(this.getErrorMessage(res.status));
			}

			return res.json as T;
		}

		throw new Error("Are.na API request failed after max retries");
	}

	private buildApiUrl(path: string): string {
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		if (normalizedPath.startsWith("/v")) {
			return `${BASE_URL}${normalizedPath}`;
		}
		return `${BASE_URL}${API_VERSION_PREFIX}${normalizedPath}`;
	}

	private readRetryAfterSeconds(headers: Record<string, string>): number {
		const raw =
			headers["retry-after"] ??
			headers["Retry-After"] ??
			headers["retry_after"] ??
			"60";
		const parsed = parseInt(raw, 10);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
	}

	private unwrapData<T>(payload: unknown): T {
		if (isRecord(payload) && "data" in payload) {
			return payload.data as T;
		}
		return payload as T;
	}

	private normalizeChannel(payload: unknown): ArenaChannel {
		const raw = this.unwrapData<unknown>(payload);
		if (!isRecord(raw)) {
			throw new Error("Unexpected Are.na channel response format");
		}
		const metadata = isRecord(raw.metadata)
			? {
					description:
						typeof raw.metadata.description === "string"
							? raw.metadata.description
							: null,
				}
			: null;
		const description =
			typeof raw.description === "string" ? raw.description : null;
		const length =
			asNumber(raw.length) ??
			asNumber(raw.total_connections) ??
			asNumber(raw.connections_count) ??
			0;

		return {
			...(raw as unknown as ArenaChannel),
			length,
			description,
			metadata,
		};
	}

	private normalizeBlock(payload: unknown): ArenaBlock {
		const raw = this.unwrapData<unknown>(payload);
		if (!isRecord(raw)) {
			throw new Error("Unexpected Are.na block response format");
		}
		return raw as unknown as ArenaBlock;
	}

	private normalizePaginatedResponse<T>(
		payload: unknown,
	): ArenaPaginatedResponse<T> {
		// v3 shape: { data: [...], meta: {...} }
		if (isRecord(payload) && Array.isArray(payload.data)) {
			const data = payload.data as T[];
			const meta = isRecord(payload.meta) ? payload.meta : {};
			const currentPage = asNumber(meta.current_page) ?? 1;
			const per =
				asNumber(meta.per_page) ??
				asNumber(meta.per) ??
				PER_PAGE;
			const totalPages = asNumber(meta.total_pages) ?? 1;
			const totalCount = asNumber(meta.total_count) ?? data.length;
			return {
				contents: data,
				length: totalCount,
				total_pages: totalPages,
				current_page: currentPage,
				per,
			};
		}

		// v2/legacy shape: { contents: [...], ... }
		if (isRecord(payload) && Array.isArray(payload.contents)) {
			const contents = payload.contents as T[];
			return {
				contents,
				length: asNumber(payload.length) ?? contents.length,
				total_pages: asNumber(payload.total_pages) ?? 1,
				current_page: asNumber(payload.current_page) ?? 1,
				per: asNumber(payload.per) ?? PER_PAGE,
			};
		}

		// Fallback: raw array payload.
		if (Array.isArray(payload)) {
			const contents = payload as T[];
			return {
				contents,
				length: contents.length,
				total_pages: 1,
				current_page: 1,
				per: contents.length || PER_PAGE,
			};
		}

		throw new Error("Unexpected Are.na pagination response format");
	}

	private static readonly ERROR_MESSAGES: Record<number, string> = {
		400: "Are.na API error: Invalid request (400). Check your channel slug and try again.",
		401: "Are.na API error: Invalid API token (401). Please check your token in settings.",
		403: "Are.na API error: Access denied (403). The channel may be private or you don't have permission.",
		404: "Are.na API error: Channel not found (404). Check that the channel slug is correct.",
		429: "Are.na API error: Rate limited (429). Too many requests — please try again later.",
		500: "Are.na API error: Server error (500). Are.na may be temporarily unavailable.",
		502: "Are.na API error: Service unavailable. Are.na may be down for maintenance.",
		503: "Are.na API error: Service unavailable. Are.na may be down for maintenance.",
		504: "Are.na API error: Service unavailable. Are.na may be down for maintenance.",
	};

	private getErrorMessage(status: number): string {
		return (
			ArenaApi.ERROR_MESSAGES[status] ||
			`Are.na API error ${status}. Please try again or check Are.na status.`
		);
	}

	async verifyToken(): Promise<boolean> {
		try {
			await this.request("GET", "/me");
			return true;
		} catch (err) {
			this.log(`Token verification failed:`, err);
			return false;
		}
	}

	async getChannel(slug: string): Promise<ArenaChannel> {
		const cacheKey = `channel:${slug}`;
		const cached = this.getCached<ArenaChannel>(cacheKey);
		if (cached) {
			this.log(`Cache hit for channel ${slug}`);
			return cached;
		}
		const payload = await this.request<unknown>(
			"GET",
			`/channels/${encodeURIComponent(slug)}`,
		);
		const channel = this.normalizeChannel(payload);
		this.setCached(cacheKey, channel);
		return channel;
	}

	async getChannelContents(
		slug: string,
		page = 1,
	): Promise<ArenaPaginatedResponse<ArenaBlock>> {
		const payload = await this.request<unknown>(
			"GET",
			`/channels/${encodeURIComponent(slug)}/contents?page=${page}&per=${PER_PAGE}`,
		);
		return this.normalizePaginatedResponse<ArenaBlock>(payload);
	}

	async getAllChannelBlocks(slug: string): Promise<ArenaBlock[]> {
		return this.getAllChannelBlocksWithProgress(slug, () => {});
	}

	private shouldStopPagination(
		slug: string,
		pageNumber: number,
		reportedTotalPages: number | null,
		pageLength: number,
		newBlocksCount: number,
	): boolean {
		const emptyPage = pageLength === 0;
		const lastPageByCount = pageLength < PER_PAGE;
		const lastPageByTotal =
			reportedTotalPages !== null && pageNumber >= reportedTotalPages;
		const duplicatePage = newBlocksCount === 0 && pageLength > 0;

		const stop =
			emptyPage || lastPageByCount || lastPageByTotal || duplicatePage;

		if (stop) {
			this.log(
				`Stopping pagination for ${slug}: ` +
					`page=${pageNumber}, totalPages=${reportedTotalPages ?? "unknown"}, ` +
					`blocksOnPage=${pageLength}, ` +
					`newBlocks=${newBlocksCount}, ` +
					`reason=${emptyPage ? "empty" : lastPageByCount ? "partial" : lastPageByTotal ? "total" : "duplicates"}`,
			);
		}

		return stop;
	}

	private async fetchPageWithRetries(
		slug: string,
		pageNumber: number,
	): Promise<ArenaPaginatedResponse<ArenaBlock>> {
		let consecutiveErrors = 0;
		const MAX_CONSECUTIVE_ERRORS = 3;

		while (true) {
			try {
				if (pageNumber > 1 && consecutiveErrors === 0) {
					await delay(withJitter(REQUEST_DELAY));
				}
				const page = await this.getChannelContents(slug, pageNumber);
				return page;
			} catch (error) {
				consecutiveErrors++;
				this.logError(
					`Error fetching page ${pageNumber} for ${slug} ` +
						`(attempt ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
					error instanceof Error ? error.message : String(error),
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
	}

	async getAllChannelBlocksWithProgress(
		slug: string,
		onPage: (currentPage: number, totalPages: number) => void,
	): Promise<ArenaBlock[]> {
		const blocks: ArenaBlock[] = [];
		const seenBlockIds = new Set<number>();
		let pageNumber = 1;
		let hasMore = true;
		let reportedTotalPages: number | null = null;

		while (hasMore) {
			const page = await this.fetchPageWithRetries(slug, pageNumber);

			if (page.total_pages && page.total_pages > 0) {
				reportedTotalPages = page.total_pages;
			}

			let newBlocksCount = 0;
			for (const block of page.contents) {
				if (!seenBlockIds.has(block.id)) {
					seenBlockIds.add(block.id);
					blocks.push(block);
					newBlocksCount++;
				}
			}

			onPage(pageNumber, reportedTotalPages ?? pageNumber + 1);

			if (
				this.shouldStopPagination(
					slug,
					pageNumber,
					reportedTotalPages,
					page.contents.length,
					newBlocksCount,
				)
			) {
				hasMore = false;
			} else {
				pageNumber++;
			}
		}

		this.log(
			`Fetched ${blocks.length} unique blocks from ${slug} ` +
				`across ${pageNumber} page(s)`,
		);

		return blocks.sort((a, b) => {
			const aPos = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
			const bPos = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
			return aPos - bPos || a.id - b.id;
		});
	}

	async listMyChannels(
		page = 1,
	): Promise<ArenaPaginatedResponse<ArenaChannelListItem>> {
		const payload = await this.request<unknown>(
			"GET",
			`/me/channels?page=${page}&per=${PER_PAGE}`,
		);
		return this.normalizePaginatedResponse<ArenaChannelListItem>(payload);
	}

	async listAllMyChannels(): Promise<ArenaChannelListItem[]> {
		const all: ArenaChannelListItem[] = [];
		let page = 1;
		let totalPages = 1;
		do {
			const res = await this.listMyChannels(page);
			all.push(...res.contents);
			totalPages = Math.max(totalPages, res.total_pages || 1);
			page++;
		} while (page <= totalPages);
		return all;
	}

	async getBlock(id: number): Promise<ArenaBlock> {
		const cacheKey = `block:${id}`;
		const cached = this.getCached<ArenaBlock>(cacheKey);
		if (cached) {
			this.log(`Cache hit for block ${id}`);
			return cached;
		}
		const payload = await this.request<unknown>("GET", `/blocks/${id}`);
		const block = this.normalizeBlock(payload);
		this.setCached(cacheKey, block);
		return block;
	}

	async downloadBinary(url: string): Promise<ArrayBuffer> {
		let attempts = 0;

		while (attempts < MAX_RETRIES) {
			let res;
			try {
				res = await requestUrl({
					url,
					method: "GET",
					headers: {},
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
				const retryAfter = this.readRetryAfterSeconds(res.headers);
				attempts++;

				if (attempts >= MAX_RETRIES) {
					throw new Error(
						`Asset download rate limited (429). ` +
							`Try again in ${retryAfter} seconds.`,
					);
				}

				this.log(
					`Download rate limited. ` +
						`Retrying after ${retryAfter}s ` +
						`(attempt ${attempts}/${MAX_RETRIES})`
				);

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
