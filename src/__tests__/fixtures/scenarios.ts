import { ArenaChannel, ArenaBlock, ArenaChannelListItem } from "../../types";

/* ------------------------------------------------------------------ */
/*  User fixtures                                                       */
/* ------------------------------------------------------------------ */

export const testUser = {
	id: 1,
	slug: "testuser",
	username: "testuser",
	first_name: "Test",
	last_name: "User",
	avatar: "https://cdn.are.na/avatars/testuser.png",
	channel_count: 5,
};

export const otherUser = {
	id: 2,
	slug: "otheruser",
	username: "otheruser",
	first_name: "Other",
	last_name: "User",
	avatar: "",
	channel_count: 12,
};

/* ------------------------------------------------------------------ */
/*  Channel fixtures                                                    */
/* ------------------------------------------------------------------ */

export function makeChannel(
	id: number,
	slug: string,
	title: string,
	overrides: Partial<ArenaChannel> = {}
): ArenaChannel {
	return {
		id,
		slug,
		title,
		length: 0,
		status: "public",
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
		user: testUser,
		metadata: null,
		...overrides,
	};
}

export const emptyChannel = makeChannel(1, "empty-channel", "Empty Channel", {
	length: 0,
	description: "This channel has no blocks",
});

export const smallChannel = makeChannel(2, "small-channel", "Small Channel", {
	length: 3,
	description: "A small curated collection",
});

export const largeChannel = makeChannel(3, "large-channel", "Large Channel", {
	length: 250,
	description: "A large paginated channel",
});

export const privateChannel = makeChannel(4, "private-channel", "Private Channel", {
	length: 5,
	status: "private",
});

export const closedChannel = makeChannel(5, "closed-channel", "Closed Channel", {
	length: 8,
	status: "closed",
});

export const channelWithSpecialChars = makeChannel(
	6,
	"special-chars-channel",
	"Special / Characters: & < > Channel",
	{ length: 2 }
);

export const channelListItems: ArenaChannelListItem[] = [
	{ id: 1, title: "Channel A", slug: "channel-a", length: 10, status: "public", updated_at: "2026-01-01T00:00:00.000Z" },
	{ id: 2, title: "Channel B", slug: "channel-b", length: 25, status: "public", updated_at: "2026-01-02T00:00:00.000Z" },
	{ id: 3, title: "Channel C", slug: "channel-c", length: 0, status: "private", updated_at: "2026-01-03T00:00:00.000Z" },
];

/* ------------------------------------------------------------------ */
/*  Block fixtures                                                      */
/* ------------------------------------------------------------------ */

export function makeBlock(
	id: number,
	overrides: Partial<ArenaBlock> = {}
): ArenaBlock {
	return {
		id,
		title: `Block ${id}`,
		content: `Content for block ${id}`,
		content_html: `<p>Content for block ${id}</p>`,
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
		user: testUser,
		...overrides,
	};
}

/* Standard block type factories */

export function makeTextBlock(id: number, title: string, content: string): ArenaBlock {
	return makeBlock(id, { title, content, content_html: `<p>${content}</p>`, class: "Text" });
}

export function makeImageBlock(
	id: number,
	title: string,
	url: string,
	filename: string
): ArenaBlock {
	return makeBlock(id, {
		title,
		content: null,
		class: "Image",
		image: {
			filename,
			content_type: "image/jpeg",
			original: { url },
			display: { url: url.replace(".jpg", "_display.jpg") },
			thumb: { url: url.replace(".jpg", "_thumb.jpg") },
		},
	});
}

export function makeLinkBlock(
	id: number,
	title: string,
	url: string,
	description?: string
): ArenaBlock {
	return makeBlock(id, {
		title,
		content: null,
		class: "Link",
		source: { url, title: title },
		description: description ?? null,
	});
}

export function makeEmbedBlock(
	id: number,
	title: string,
	url: string
): ArenaBlock {
	return makeBlock(id, {
		title,
		content: null,
		class: "Embed",
		source: { url, title },
	});
}

export function makeMediaBlock(
	id: number,
	title: string,
	url: string,
	filename: string
): ArenaBlock {
	return makeBlock(id, {
		title,
		content: null,
		class: "Media",
		source: { url, title },
		attachment: {
			file_name: filename,
			file_size: 1024 * 1024,
			url,
			content_type: "video/mp4",
			extension: "mp4",
		},
	});
}

export function makeAttachmentBlock(
	id: number,
	title: string,
	url: string,
	filename: string,
	contentType: string
): ArenaBlock {
	return makeBlock(id, {
		title,
		content: null,
		class: "Attachment",
		attachment: {
			file_name: filename,
			file_size: 2048,
			url,
			content_type: contentType,
			extension: filename.split(".").pop() || "bin",
		},
	});
}

export function makeChannelBlock(
	id: number,
	title: string,
	slug: string
): ArenaBlock {
	return makeBlock(id, {
		title,
		content: null,
		class: "Channel",
		source: { url: `https://www.are.na/channel/${slug}`, title },
	});
}

/* ------------------------------------------------------------------ */
/*  Edge-case blocks                                                    */
/* ------------------------------------------------------------------ */

export const nullTitleBlock = makeBlock(100, { title: null, content: "No title here" });

export const emptyContentBlock = makeBlock(101, { title: "Empty Content", content: "" });

export const specialCharsBlock = makeBlock(102, {
	title: 'Special / Characters: & < > " Quotes',
	content: "Content with <script>alert(1)</script> HTML tags",
});

export const veryLongTitleBlock = makeBlock(103, {
	title: "A".repeat(200),
	content: "Short content",
});

export const unicodeBlock = makeBlock(104, {
	title: "Unicode: 你好世界 🌍 Émojis",
	content: "Mixed scripts: العربية עברית 日本語",
});

export const deletedBlock = makeBlock(105, {
	title: "Deleted Block",
	content: "This block was later removed from the channel",
});

export const nullDescriptionBlock = makeBlock(106, {
	title: "With Description",
	content: "Body",
	description: "A helpful description",
	description_html: "<p>A helpful description</p>",
});

export const noImageDataBlock = makeBlock(107, {
	title: "Broken Image",
	class: "Image",
	content: null,
	image: null,
});

/* ------------------------------------------------------------------ */
/*  Channel scenario builders                                           */
/* ------------------------------------------------------------------ */

export function makeSmallChannelBlocks(): ArenaBlock[] {
	return [
		makeTextBlock(1, "Introduction", "Welcome to this channel."),
		makeImageBlock(2, "Cover Photo", "https://cdn.are.na/cover.jpg", "cover.jpg"),
		makeLinkBlock(3, "Reference Article", "https://example.com/article", "A useful reference"),
	];
}

export function makeMixedChannelBlocks(): ArenaBlock[] {
	return [
		makeTextBlock(1, "Overview", "This channel contains mixed content types."),
		makeImageBlock(2, "Diagram", "https://cdn.are.na/diagram.jpg", "diagram.jpg"),
		makeLinkBlock(3, "External Resource", "https://example.com/resource"),
		makeEmbedBlock(4, "Video Embed", "https://youtube.com/watch?v=12345"),
		makeMediaBlock(5, "Podcast Episode", "https://cdn.are.na/podcast.mp3", "podcast.mp3"),
		makeAttachmentBlock(6, "Research PDF", "https://cdn.are.na/research.pdf", "research.pdf", "application/pdf"),
		makeChannelBlock(7, "Related Channel", "related-channel"),
		nullTitleBlock,
		specialCharsBlock,
		unicodeBlock,
	];
}

export function makePaginatedChannelBlocks(total: number): ArenaBlock[] {
	return Array.from({ length: total }, (_, i) => {
		const id = i + 1;
		if (i % 5 === 0) return makeImageBlock(id, `Image ${id}`, `https://cdn.are.na/img${id}.jpg`, `img${id}.jpg`);
		if (i % 5 === 1) return makeLinkBlock(id, `Link ${id}`, `https://example.com/${id}`);
		if (i % 5 === 2) return makeEmbedBlock(id, `Embed ${id}`, `https://example.com/embed/${id}`);
		if (i % 5 === 3) return makeAttachmentBlock(id, `Attachment ${id}`, `https://cdn.are.na/file${id}.pdf`, `file${id}.pdf`, "application/pdf");
		return makeTextBlock(id, `Text ${id}`, `Content for text block ${id}`);
	});
}

export function makeConflictScenarioBlocks(): ArenaBlock[] {
	return [
		makeTextBlock(1, "Stable Note", "This note will not change."),
		makeTextBlock(2, "Changing Note", "Original remote content."),
		makeTextBlock(3, "Deleted Note", "This note will be deleted from the channel."),
	];
}

/* ------------------------------------------------------------------ */
/*  API response helpers                                                */
/* ------------------------------------------------------------------ */

export function makeChannelResponse(channel: ArenaChannel) {
	return {
		status: 200,
		headers: {},
		json: { data: channel },
		arrayBuffer: new ArrayBuffer(0),
	};
}

export function makePaginatedBlocksResponse(
	pageNum: number,
	blocks: ArenaBlock[],
	totalPages: number,
	totalCount?: number
) {
	return {
		status: 200,
		headers: {},
		json: {
			data: blocks,
			meta: {
				current_page: pageNum,
				per_page: 100,
				total_pages: totalPages,
				total_count: totalCount ?? blocks.length,
			},
		},
		arrayBuffer: new ArrayBuffer(0),
	};
}

export function makeLegacyPaginatedBlocksResponse(
	pageNum: number,
	blocks: ArenaBlock[],
	totalPages: number,
	totalCount?: number
) {
	return {
		status: 200,
		headers: {},
		json: {
			contents: blocks,
			length: totalCount ?? blocks.length,
			total_pages: totalPages,
			current_page: pageNum,
			per: 100,
		},
		arrayBuffer: new ArrayBuffer(0),
	};
}

export function makeEmptyPaginatedResponse() {
	return {
		status: 200,
		headers: {},
		json: {
			data: [],
			meta: { current_page: 1, per_page: 100, total_pages: 1, total_count: 0 },
		},
		arrayBuffer: new ArrayBuffer(0),
	};
}

export function makeErrorResponse(status: number, message?: string) {
	return {
		status,
		headers: {},
		json: message ? { message } : {},
		arrayBuffer: new ArrayBuffer(0),
	};
}
