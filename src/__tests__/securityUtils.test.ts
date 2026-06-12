import { sanitizeMarkdownContent } from "../securityUtils";

describe("sanitizeMarkdownContent", () => {
	it("passes through safe plain text unchanged", () => {
		const input = "# Hello\n\nThis is safe content.";
		expect(sanitizeMarkdownContent(input)).toBe(input);
	});

	it("handles non-string input: null", () => {
		expect(sanitizeMarkdownContent(null)).toBe("");
	});

	it("handles non-string input: undefined", () => {
		expect(sanitizeMarkdownContent(undefined)).toBe("");
	});

	it("handles non-string input: number", () => {
		expect(sanitizeMarkdownContent(42)).toBe("42");
	});

	it("strips script tags", () => {
		const input = 'before<script>alert("xss")</script>after';
		expect(sanitizeMarkdownContent(input)).not.toContain("<script");
		expect(sanitizeMarkdownContent(input)).toContain("before");
		expect(sanitizeMarkdownContent(input)).toContain("after");
	});

	it("strips style tags", () => {
		const input = "text<style>body{display:none}</style>more";
		expect(sanitizeMarkdownContent(input)).not.toContain("<style");
	});

	it("strips iframe tags", () => {
		const input = 'a<iframe src="evil.com"></iframe>b';
		expect(sanitizeMarkdownContent(input)).not.toContain("<iframe");
	});

	it("neutralizes dataview code blocks", () => {
		const input = "```dataview\nLIST\n```";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toMatch(/^```dataview/m);
		expect(result).toContain("dataview");
	});

	it("neutralizes dataviewjs code blocks", () => {
		const input = "```dataviewjs\ndv.pages()\n```";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toMatch(/^```dataviewjs/m);
	});

	it("neutralizes templater syntax", () => {
		const input = "<% tp.file.title %>";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toContain("<%");
	});

	it("neutralizes dataview inline queries", () => {
		const input = "`= this.file.name`";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toBe(input);
	});

	it("removes inline event handlers", () => {
		const input = '<img src="x" onerror="alert(1)">';
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toContain("onerror");
	});

	it("neutralizes javascript: protocol in links", () => {
		const input = "[click](javascript:alert(1))";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toContain("javascript:alert");
	});

	it("preserves normal markdown links", () => {
		const input = "[Are.na](https://www.are.na)";
		expect(sanitizeMarkdownContent(input)).toContain("https://www.are.na");
	});

	it("preserves wiki links", () => {
		const input = "[[My Note]]";
		expect(sanitizeMarkdownContent(input)).toBe("[[My Note]]");
	});

	it("neutralizes HTML-entity-encoded javascript: protocol (numeric decimal)", () => {
		// All letters entity-encoded: j=&#106; a=&#97; v=&#118; a=&#97; s=&#115; c=&#99; r=&#114; i=&#105; p=&#112; t=&#116;
		const input = "[x](&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1))";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toMatch(/javascript\s*:/i);
	});

	it("neutralizes HTML-entity-encoded javascript: protocol (numeric hex)", () => {
		// j=&#x6A; a=&#x61; v=&#x76; a=&#x61; s=&#x73; c=&#x63; r=&#x72; i=&#x69; p=&#x70; t=&#x74;
		const input = "[x](&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1))";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toMatch(/javascript\s*:/i);
	});

	it("neutralizes HTML-entity-encoded colon via named entity", () => {
		const input = "[x](javascript&colon;alert(1))";
		const result = sanitizeMarkdownContent(input);
		expect(result).not.toMatch(/javascript\s*:/i);
	});

	it("leaves unknown named HTML entities unchanged", () => {
		// &foo; is not a recognized entity and not part of a dangerous protocol token
		const input = "Hello &foo; world";
		expect(sanitizeMarkdownContent(input)).toBe("Hello &foo; world");
	});
});
