import { v4 as uuidv4 } from 'uuid';
import { ReviewResult, ReviewIssue } from '@ai-reviewer/shared';
import { parseUnifiedDiff } from '../analyzer/diff-parser';
import { runStaticAnalysis } from '../analyzer/static/scanner';
import { runAIReview } from '../analyzer/ai/provider';
import { calculateReviewScores, deduplicateIssues } from '../analyzer/score';
import { db } from './db.service';
import { getInstallationOctokit } from '../github/app';
import { submitGitHubReview } from '../github/reviewer';

export interface ProcessReviewParams {
  rawDiff: string;
  prNumber?: number;
  repoOwner?: string;
  repoName?: string;
  prTitle?: string;
  prUrl?: string;
  author?: string;
  headSha?: string;
  baseSha?: string;
  headRef?: string;
  baseRef?: string;
  installationId?: number;
  customInstructions?: string;
}

export async function processPullRequestReview(params: ProcessReviewParams): Promise<ReviewResult> {
  const reviewId = `rev-${uuidv4().slice(0, 8)}`;
  const repoFullName = `${params.repoOwner || 'unknown'}/${params.repoName || 'unknown'}`;
  const repoConfig = db.getRepository(repoFullName);

  const customInstructions = params.customInstructions || repoConfig?.customInstructions;

  // 1. Parse unified diff
  const parsedFiles = parseUnifiedDiff(params.rawDiff);

  const additions = parsedFiles.reduce((sum, f) => sum + f.additions, 0);
  const deletions = parsedFiles.reduce((sum, f) => sum + f.deletions, 0);

  // 2. Static Analysis Pre-scan
  const staticIssues = runStaticAnalysis(parsedFiles);

  // 3. AI Analysis (Structured output)
  const aiResponse = await runAIReview({
    diffText: params.rawDiff,
    files: parsedFiles,
    prTitle: params.prTitle,
    customInstructions,
  });

  const convertedAiIssues: ReviewIssue[] = aiResponse.issues.map((i) => ({
    id: uuidv4(),
    file: i.file,
    line: i.line,
    endLine: i.endLine,
    severity: i.severity,
    category: i.category,
    title: i.title,
    explanation: i.explanation,
    impact: i.impact,
    suggestedFix: i.suggestedFix,
    originalCode: i.originalCode,
    source: 'AI',
    status: 'OPEN',
  }));

  // 4. Merge & Deduplicate
  const mergedIssues = deduplicateIssues(staticIssues, convertedAiIssues);

  // Filter based on repo settings if specified
  const filteredIssues = repoConfig?.enabledCategories
    ? mergedIssues.filter((i) => repoConfig.enabledCategories.includes(i.category))
    : mergedIssues;

  // 5. Calculate final scores
  const { overallScore, categoryScores } = calculateReviewScores(filteredIssues);

  const review: ReviewResult = {
    id: reviewId,
    prNumber: params.prNumber || 1,
    repoName: params.repoName || 'playground-repo',
    repoOwner: params.repoOwner || 'local',
    prTitle: params.prTitle || 'Manual Diff Review',
    prUrl: params.prUrl || 'http://localhost:5173/playground',
    author: params.author || 'developer',
    headSha: params.headSha || 'head-sha-sample',
    baseSha: params.baseSha || 'base-sha-sample',
    headRef: params.headRef || 'feature/branch',
    baseRef: params.baseRef || 'main',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    overallScore,
    categoryScores,
    issues: filteredIssues,
    filesCount: parsedFiles.length || 1,
    additions,
    deletions,
    status: 'COMPLETED',
    summaryMarkdown: aiResponse.summary || 'Code review completed.',
  };

  // 6. Post to GitHub if live installation provided
  if (params.installationId && params.repoOwner && params.repoName && params.prNumber && params.headSha) {
    try {
      const octokit = await getInstallationOctokit(params.installationId);
      const ghReviewId = await submitGitHubReview(
        octokit,
        params.repoOwner,
        params.repoName,
        params.prNumber,
        params.headSha,
        review
      );
      review.githubReviewId = ghReviewId;
    } catch (err: any) {
      console.warn('[Review Service] Could not post review directly to GitHub:', err.message);
    }
  }

  // 7. Save to DB Store
  await db.saveReview(review);

  return review;
}
