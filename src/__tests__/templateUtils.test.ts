import { parseTemplate, renderTemplate } from "../templateUtils";

describe("parseTemplate / renderTemplate", () => {
	it("renders plain text unchanged", () => {
		const ast = parseTemplate("hello world");
		expect(renderTemplate(ast, {})).toBe("hello world");
	});

	it("interpolates a variable", () => {
		const ast = parseTemplate("Hello {{name}}!");
		expect(renderTemplate(ast, { name: "Arena" })).toBe("Hello Arena!");
	});

	it("renders empty string for undefined variable", () => {
		const ast = parseTemplate("{{missing}}");
		expect(renderTemplate(ast, {})).toBe("");
	});

	it("renders 0 (falsy number) correctly", () => {
		const ast = parseTemplate("{{count}}");
		expect(renderTemplate(ast, { count: 0 })).toBe("0");
	});

	it("renders nested property via dot notation", () => {
		const ast = parseTemplate("{{user.name}}");
		expect(renderTemplate(ast, { user: { name: "frostmute" } })).toBe("frostmute");
	});

	describe("#if", () => {
		it("renders then-branch when condition is truthy", () => {
			const ast = parseTemplate("{{#if title}}Title: {{title}}{{/if}}");
			expect(renderTemplate(ast, { title: "My Block" })).toBe("Title: My Block");
		});

		it("skips then-branch when condition is falsy", () => {
			const ast = parseTemplate("{{#if title}}Title: {{title}}{{/if}}");
			expect(renderTemplate(ast, { title: "" })).toBe("");
		});

		it("renders else-branch when condition is falsy", () => {
			const ast = parseTemplate("{{#if title}}{{title}}{{else}}Untitled{{/if}}");
			expect(renderTemplate(ast, { title: "" })).toBe("Untitled");
		});

		it("treats empty array as falsy", () => {
			const ast = parseTemplate("{{#if items}}yes{{else}}no{{/if}}");
			expect(renderTemplate(ast, { items: [] })).toBe("no");
		});

		it("treats non-empty array as truthy", () => {
			const ast = parseTemplate("{{#if items}}yes{{/if}}");
			expect(renderTemplate(ast, { items: [1] })).toBe("yes");
		});
	});

	describe("#each", () => {
		it("iterates over an array of objects", () => {
			const ast = parseTemplate("{{#each tags}}{{name}} {{/each}}");
			expect(renderTemplate(ast, { tags: [{ name: "a" }, { name: "b" }] })).toBe("a b ");
		});

		it("wraps primitives in { this: value }", () => {
			const ast = parseTemplate("{{#each nums}}{{this}},{{/each}}");
			expect(renderTemplate(ast, { nums: [1, 2, 3] })).toBe("1,2,3,");
		});

		it("renders nothing for empty array", () => {
			const ast = parseTemplate("{{#each items}}x{{/each}}");
			expect(renderTemplate(ast, { items: [] })).toBe("");
		});

		it("renders nothing when variable is not an array", () => {
			const ast = parseTemplate("{{#each items}}x{{/each}}");
			expect(renderTemplate(ast, { items: "not-array" })).toBe("");
		});
	});

	describe("error handling", () => {
		it("throws on unclosed #if", () => {
			expect(() => parseTemplate("{{#if title}}oops")).toThrow(/Unclosed #if/);
		});

		it("throws on unclosed #each", () => {
			expect(() => parseTemplate("{{#each items}}oops")).toThrow(/Unclosed #each/);
		});

		it("treats unexpected closing tags as literal text", () => {
			const ast = parseTemplate("{{/if}}");
			expect(renderTemplate(ast, {})).toBe("{{/if}}");
		});
	});
});
