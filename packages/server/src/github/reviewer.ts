import { ReviewIssue, ReviewResult, SEVERITY_BADGES } from '@ai-reviewer/shared';

export interface GitHubInlineComment {
  path: string;
  line: number;
  side: 'RIGHT' | 'LEFT';
  start_line?: number;
  start_side?: 'RIGHT' | 'LEFT';
  body: string;
}

export function formatInlineCommentBody(issue: ReviewIssue): string {
  const badge = SEVERITY_BADGES[issue.severity];
  const severityTag = `${badge.emoji} **${badge.label.toUpperCase()}** — ${issue.title}`;

  let body = `### ${severityTag}\n\n`;
  body += `**Category**: \`${issue.category}\` | **Source**: \`${issue.source}\`\n\n`;
  body += `> ${issue.explanation}\n\n`;

  if (issue.impact) {
    body += `**💥 Impact**:\n${issue.impact}\n\n`;
  }

  if (issue.suggestedFix) {
    body += `**💡 Suggested Fix**:\n`;
    body += '```suggestion\n';
    body += issue.suggestedFix.trim() + '\n';
    body += '```\n';
  }

  return body;
}

export function formatReviewSummaryMarkdown(review: Partial<ReviewResult>): string {
  const score = review.overallScore ?? 100;
  const issues = review.issues || [];
  const critical = issues.filter((i) => i.severity === 'CRITICAL').length;
  const high = issues.filter((i) => i.severity === 'HIGH').length;
  const medium = issues.filter((i) => i.severity === 'MEDIUM').length;
  const low = issues.filter((i) => i.severity === 'LOW').length;
  const suggestions = issues.filter((i) => i.severity === 'INFO').length;

  const scoreEmoji = score >= 85 ? '🟢' : score >= 65 ? '🟡' : '🔴';

  let md = `## 🤖 AI Git Reviewer Summary\n\n`;
  md += `| Overall Health Score | Critical | High | Medium | Low | Suggestions |\n`;
  md += `| :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  md += `| ${scoreEmoji} **${score}/100** | 🔴 ${critical} | 🟠 ${high} | 🟡 ${medium} | 🔵 ${low} | 💡 ${suggestions} |\n\n`;

  if (review.categoryScores) {
    md += `### 📊 Category Breakdown\n\n`;
    md += `- **Security**: ${review.categoryScores.SECURITY}/100\n`;
    md += `- **Bugs & Stability**: ${review.categoryScores.BUG}/100\n`;
    md += `- **Performance**: ${review.categoryScores.PERFORMANCE}/100\n`;
    md += `- **Code Quality**: ${review.categoryScores.CODE_QUALITY}/100\n`;
    md += `- **Best Practices**: ${review.categoryScores.BEST_PRACTICES}/100\n\n`;
  }

  if (review.summaryMarkdown) {
    md += `${review.summaryMarkdown}\n\n`;
  }

  md += `---\n*Automated review powered by [AI Git Reviewer](https://github.com/iabdu/ai-git-reviewer)*`;
  return md;
}

export async function submitGitHubReview(
  octokit: any,
  owner: string,
  repo: string,
  pullNumber: number,
  commitSha: string,
  review: ReviewResult
): Promise<number | undefined> {
  const inlineComments: GitHubInlineComment[] = [];

  for (const issue of review.issues) {
    if (issue.line > 0) {
      inlineComments.push({
        path: issue.file,
        line: issue.line,
        side: 'RIGHT',
        body: formatInlineCommentBody(issue),
      });
    }
  }

  const overallScore = review.overallScore;
  const hasCritical = review.issues.some((i) => i.severity === 'CRITICAL');
  const event = hasCritical || overallScore < 60 ? 'REQUEST_CHANGES' : overallScore >= 85 ? 'APPROVE' : 'COMMENT';

  try {
    const response = await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitSha,
      body: formatReviewSummaryMarkdown(review),
      event: event as 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
      comments: inlineComments.map((c) => ({
        path: c.path,
        line: c.line,
        side: c.side,
        body: c.body,
      })),
    });

    return response.data.id;
  } catch (err: any) {
    console.warn('[GitHub Reviewer] Could not create multi-line PR review in one batch. Falling back to PR summary comment:', err.message);

    // Fallback to PR issue comment
    const commentRes = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: formatReviewSummaryMarkdown(review),
    });

    return commentRes.data.id;
  }
}

