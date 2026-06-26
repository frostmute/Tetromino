import { parseTemplate, renderTemplate } from "../templateUtils";

describe("template rendering performance", () => {
	const defaultTemplate = `---\ntitle: "{{title}}"\narena_id: {{id}}\narena_class: {{class}}\narena_url: "{{arena_url}}"\n{{#if description}}description: "{{description}}"{{/if}}\n---\n\n# {{title}}\n\n{{#if image}}![{{title}}]({{image}}){{/if}}\n\n{{content}}\n\n{{#if description}}\n## Description\n{{description}}\n{{/if}}`;

	it("caches parsed templates by string reference", () => {
		const ast1 = parseTemplate(defaultTemplate);
		const ast2 = parseTemplate(defaultTemplate);
		expect(ast1).toBe(ast2);
	});

	it("renders 1,000 blocks with the default template in under 500 ms", () => {
		const ast = parseTemplate(defaultTemplate);
		const baseData = {
			title: "My Block",
			id: 12345,
			class: "Image",
			arena_url: "https://www.are.na/block/12345",
			description: "A short description",
			image: "https://cdn.are.na/image.jpg",
			content: "Some body content here",
		};

		const start = Date.now();
		for (let i = 0; i < 1000; i++) {
			renderTemplate(ast, { ...baseData, title: `Block ${i}`, id: i });
		}
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(500);
	});

	it("renders a template with a 100-item #each loop 100 times in under 500 ms", () => {
		const tmpl = "{{#each items}}{{name}}:{{value}};{{/each}}";
		const ast = parseTemplate(tmpl);
		const items = Array.from({ length: 100 }, (_, i) => ({
			name: `item-${i}`,
			value: i,
		}));

		const start = Date.now();
		for (let i = 0; i < 100; i++) {
			renderTemplate(ast, { items });
		}
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(500);
	});

	it("renders nested #if and #each correctly under load", () => {
		const tmpl = `{{#if show}}\n{{#each list}}{{#if active}}[{{name}}]{{/if}}\n{{/each}}\n{{/if}}`;
		const ast = parseTemplate(tmpl);
		const data = {
			show: true,
			list: Array.from({ length: 50 }, (_, i) => ({
				active: i % 2 === 0,
				name: `n${i}`,
			})),
		};

		const start = Date.now();
		for (let i = 0; i < 200; i++) {
			renderTemplate(ast, data);
		}
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(500);
	});
});
