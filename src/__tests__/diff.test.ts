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
});
