import { ArenaChannel, ArenaBlock } from "../types";

export function makeChannel(id: number, slug: string, title: string): ArenaChannel {
	return {
		id,
		type: "Channel",
		slug,
		title,
		length: 0,
		status: "public",
		description: null,
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
		user: {
			id: 1,
			slug: "tester",
			name: "Test User",
			avatar: "",
			initials: "TU",
		},
		metadata: null,
	};
}

export function makeBlock(id: number, overrides: Partial<ArenaBlock> = {}): ArenaBlock {
	return {
		id,
		type: "Text",
		base_type: "Block",
		title: `Block ${id}`,
		content: { markdown: "content", html: "<p>content</p>", plain: "content" },
		description: null,
		source: null,
		image: null,
		attachment: null,
		embed: null,
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
		position: id,
		user: {
			id: 1,
			slug: "tester",
			name: "Test User",
			avatar: "",
			initials: "TU",
		},
		...overrides,
	};
}
