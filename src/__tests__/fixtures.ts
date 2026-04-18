import { ArenaChannel, ArenaBlock } from "../types";

// fixtures.ts

// Mock data factories

export const mockDataFactory = () => ({
  id: '123',
  title: 'Mock Title',
  content: 'This is some mock content.',
});

export const anotherMockFactory = () => ({
  id: '456',
  description: 'Another mock description',
});

// Additional helper functions can be added here if needed.

export function makeChannel(id: number, slug: string, title: string): ArenaChannel {
	return {
		id,
		slug,
		title,
		length: 0,
		status: "public",
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
		user: {
			id: 1,
			slug: "tester",
			username: "tester",
			first_name: "Test",
			last_name: "User",
			avatar: "",
			channel_count: 1,
		},
		metadata: null,
	};
}

export function makeBlock(id: number): ArenaBlock {
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
