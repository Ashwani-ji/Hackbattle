/**
 * Simple line-based diff using the classic LCS (longest common subsequence)
 * approach. Good enough for comparing original vs. AI-refactored code
 * snippets without pulling in an external dependency.
 *
 * Returns an array of { type: "same" | "add" | "remove", text } in order.
 */
export function diffLines(oldText, newText) {
  const a = (oldText || "").split("\n");
  const b = (newText || "").split("\n");
  const m = a.length;
  const n = b.length;

  // dp[i][j] = length of LCS of a[i..] and b[j..]
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", text: a[i] });
      i++;
    } else {
      result.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < m) {
    result.push({ type: "remove", text: a[i] });
    i++;
  }
  while (j < n) {
    result.push({ type: "add", text: b[j] });
    j++;
  }

  return result;
}
