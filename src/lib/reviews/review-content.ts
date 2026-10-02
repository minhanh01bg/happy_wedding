/** Reject recognizable code syntax, while allowing ordinary review punctuation. */
export function containsReviewCode(content: string): boolean {
  const patterns = [
    /<\/?[a-z][a-z0-9:-]*(?:\s[^<>]*)?\s*\/?>/i,
    /<!--|<!doctype\b|<\?(?:php|=)/i,
    /```|~~~[^\n]*\n/,
    /\b(?:javascript|vbscript)\s*:/i,
    /\b(?:const|let|var)\s+[a-z_$][\w$]*\s*=/i,
    /\bfunction\s*(?:[a-z_$][\w$]*\s*)?\([^)]*\)\s*\{/i,
    /\b(?:document|window|console)\s*\.\s*[a-z_$][\w$]*/i,
    /\b(?:alert|eval|fetch)\s*\([^)]*\)/i,
    /\bprint\s*\(\s*(?:["'`\d]|[a-z_]\w*\s*[,)]|\))/i,
    /(?:^|[;\n])\s*(?:import\s+[\w.]+|from\s+[\w.]+\s+import\s+)/m,
    /\bdef\s+\w+\s*\([^)]*\)\s*:/,
    /[.#]?[a-z][\w.#\s>:+-]*\s*\{\s*[a-z-]+\s*:[^{}]+;?\s*\}/i,
    /\bselect\s+[\s\S]+?\s+from\s+[a-z_][\w]*/i,
    /\b(?:insert\s+into|delete\s+from|drop\s+table)\s+[a-z_][\w]*/i,
    /\bupdate\s+[a-z_][\w]*\s+set\b/i,
  ];
  return patterns.some((pattern) => pattern.test(content));
}
export const REVIEW_CODE_MESSAGE =
  "Đánh giá chỉ được chứa cảm nhận, không nhập mã HTML hoặc mã lập trình";
