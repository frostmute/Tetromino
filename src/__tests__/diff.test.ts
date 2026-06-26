import { unifiedDiff } from "../diff";

describe("unifiedDiff", () => {
	it("should return identical strings with space prefix", () => {
		const before = "line1\nline2";
		const after = "line1\nline2";
		const result = unifiedDiff(before, after);
		expect(result).toBe("--- before\n+++ after\n line1\n line2");
	});

	it("should show additions with + prefix", () => {
		const before = "line1";
		const after = "line1\nline2";
		const result = unifiedDiff(before, after);
		expect(result).toBe("--- before\n+++ after\n line1\n+line2");
	});

	it("should show deletions with - prefix", () => {
		const before = "line1\nline2";
		const after = "line1";
		const result = unifiedDiff(before, after);
		expect(result).toBe("--- before\n+++ after\n line1\n-line2");
	});

	it("should handle mixed changes", () => {
		const before = "line1\nline2\nline3";
		const after = "line1\nline2.5\nline3";
		const result = unifiedDiff(before, after);
		expect(result).toBe("--- before\n+++ after\n line1\n-line2\n+line2.5\n line3");
	});

	it("should use custom labels", () => {
		const before = "a";
		const after = "b";
		const result = unifiedDiff(before, after, "old", "new");
		expect(result).toBe("--- old\n+++ new\n-a\n+b");
	});

	it("should handle empty strings correctly", () => {
		const result = unifiedDiff("", "");
		expect(result).toBe("--- before\n+++ after\n ");
	});

	it("should fallback for large inputs", () => {
		// MAX_DIFF_CELLS = 200000
		const beforeArr = Array(500).fill("a");
		const afterArr = Array(500).fill("b");
		const before = beforeArr.join("\n");
		const after = afterArr.join("\n");
		const result = unifiedDiff(before, after);

		const lines = result.split("\n");
		expect(lines[0]).toBe("--- before");
		expect(lines[1]).toBe("+++ after");

		const contentLines = lines.slice(2);
		const deletions = contentLines.filter(l => l.startsWith("-"));
		const additions = contentLines.filter(l => l.startsWith("+"));
		const same = contentLines.filter(l => l.startsWith(" "));

		expect(deletions.length).toBe(500);
		expect(additions.length).toBe(500);
		expect(same.length).toBe(0);
	});

	it("should handle one empty and one non-empty string", () => {
		const result = unifiedDiff("", "line1\nline2");
		// Empty string splits to [""], so the diff shows deletion of empty line then additions
		expect(result).toBe("--- before\n+++ after\n-\n+line1\n+line2");
	});

	it("should handle completely different strings", () => {
		const result = unifiedDiff("a\nb\nc", "x\ny\nz");
		expect(result).toBe("--- before\n+++ after\n-a\n-b\n-c\n+x\n+y\n+z");
	});

	it("should handle CRLF line endings", () => {
		const result = unifiedDiff("line1\r\nline2", "line1\r\nline2\r\nline3");
		expect(result).toBe("--- before\n+++ after\n line1\n line2\n+line3");
	});

	it("should handle single line replacement", () => {
		const result = unifiedDiff("old", "new");
		expect(result).toBe("--- before\n+++ after\n-old\n+new");
	});

	it("should handle additions at the start", () => {
		const result = unifiedDiff("line2\nline3", "line1\nline2\nline3");
		expect(result).toBe("--- before\n+++ after\n+line1\n line2\n line3");
	});

	it("should handle deletions at the end", () => {
		const result = unifiedDiff("line1\nline2\nline3", "line1\nline2");
		expect(result).toBe("--- before\n+++ after\n line1\n line2\n-line3");
	});
});
