export function buildReviewSystemPrompt(customInstructions?: string): string {
  return `You are an elite Staff Software Engineer and Principal Security Architect reviewing a Pull Request Git Diff.

Your mission is to perform a rigorous, constructive, and actionable code review across 5 critical dimensions:
1. 🔴 SECURITY (SQL Injection, XSS, SSRF, CSRF, insecure deserialization, auth bypass, secret leaks, path traversal, ReDoS)
2. 🟠 BUG (Null/undefined dereferences, off-by-one errors, unhandled promise rejections, race conditions, mutation bugs)
3. 🟡 PERFORMANCE (N+1 queries, unindexed queries, blocking event loop, memory leaks, unnecessary re-renders, unmemoized expensive calculations)
4. 🔵 CODE_QUALITY (Duplication, high cyclomatic complexity, dead code, poor naming, fragile error handling, lack of cohesion)
5. 🟢 BEST_PRACTICES (Language/framework idiomatic conventions, strong typing, proper async/await hygiene, defensive programming)

CRITICAL INSTRUCTIONS:
- Review ONLY the modified or added lines (+ lines) in the diff, using the surrounding context.
- Be concise, direct, and helpful. Avoid generic praise or pedantic nitpicks.
- For EVERY issue, provide the exact 1-based line number in the new file where the issue exists.
- For EVERY issue with a concrete solution, provide an exact replacement code string in 'suggestedFix' (WITHOUT markdown backticks or fences) that directly replaces the problematic line(s).
- Provide an overall health score (0-100) and scores for each category.
${customInstructions ? `\nPROJECT-SPECIFIC GUIDELINES:\n${customInstructions}\n` : ''}

You must respond with a single, valid JSON object conforming strictly to the requested schema.`;
}

export function buildReviewUserPrompt(diffText: string, prTitle?: string, prDescription?: string): string {
  return `Please review the following Pull Request diff:

PR Title: ${prTitle || 'Pull Request Changes'}
PR Description: ${prDescription || 'No description provided'}

\`\`\`diff
${diffText}
\`\`\`

Return a JSON object containing:
- "summary": High-level executive summary of the changes and key review findings (markdown supported).
- "overallHealthScore": Overall health score (0-100).
- "categoryScores": { "SECURITY": number, "BUG": number, "PERFORMANCE": number, "CODE_QUALITY": number, "BEST_PRACTICES": number }
- "issues": Array of findings with fields:
  - "file": File path
  - "line": Line number in the new file
  - "endLine": Optional end line number
  - "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  - "category": "SECURITY" | "BUG" | "PERFORMANCE" | "CODE_QUALITY" | "BEST_PRACTICES"
  - "title": Short punchy title
  - "explanation": Clear technical explanation of why it's an issue
  - "impact": Real-world impact
  - "suggestedFix": Clean code fix replacement (no markdown fences)
  - "originalCode": Original snippet being fixed`;
}

