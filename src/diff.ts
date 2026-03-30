export type DiffLine = { type: "same" | "add" | "del"; text: string };

const MAX_DIFF_CELLS = 200000;

function buildDiffLines(before: string[], after: string[]): DiffLine[] {
	const m = before.length;
	const n = after.length;
	if (m === 0 && n === 0) return [];

	if (m * n > MAX_DIFF_CELLS) {
		const lines: DiffLine[] = [];
		for (const line of before) lines.push({ type: "del", text: line });
		for (const line of after) lines.push({ type: "add", text: line });
		return lines;
	}

	const dp: number[][] = Array.from({ length: m + 1 }, () =>
		Array(n + 1).fill(0),
	);

	for (let i = m - 1; i >= 0; i--) {
		for (let j = n - 1; j >= 0; j--) {
			if (before[i] === after[j]) {
				dp[i][j] = dp[i + 1][j + 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
			}
		}
	}

	const lines: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < m && j < n) {
		if (before[i] === after[j]) {
			lines.push({ type: "same", text: before[i] });
			i++;
			j++;
			continue;
		}
		if (dp[i + 1][j] >= dp[i][j + 1]) {
			lines.push({ type: "del", text: before[i] });
			i++;
		} else {
			lines.push({ type: "add", text: after[j] });
			j++;
		}
	}
	while (i < m) {
		lines.push({ type: "del", text: before[i] });
		i++;
	}
	while (j < n) {
		lines.push({ type: "add", text: after[j] });
		j++;
	}

	return lines;
}

export function unifiedDiff(
	beforeText: string,
	afterText: string,
	labelBefore = "before",
	labelAfter = "after",
): string {
	const before = beforeText.split(/\r?\n/);
	const after = afterText.split(/\r?\n/);
	const lines = buildDiffLines(before, after);
	const out: string[] = [`--- ${labelBefore}`, `+++ ${labelAfter}`];
	for (const line of lines) {
		const prefix = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
		out.push(`${prefix}${line.text}`);
	}
	return out.join("\n");
}
