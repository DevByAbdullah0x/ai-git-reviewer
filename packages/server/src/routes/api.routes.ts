import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/db.service';
import { processPullRequestReview } from '../services/review.service';
import { applyIssueFix } from '../services/patch.service';
import { fetchPublicPRDiff, fetchInstalledRepositories, fetchRepositoryPullRequests } from '../github/app';
import {
  TestDiffRequestSchema,
  TestPRRequestSchema,
  RepositoryConfigUpdateSchema,
} from '@ai-reviewer/shared';
import { config } from '../config';

export const apiRouter = Router();

// Middleware: ensure Supabase cloud state is loaded for every request
apiRouter.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await db.ensureLoaded();
  } catch (err: any) {
    console.warn('[API] Warning during ensureLoaded():', err.message);
  }
  next();
});

// 1. Health check & Provider Info
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiProvider: config.aiProvider,
    githubAppConfigured: Boolean(config.github.appId && config.github.privateKey),
    supabaseConfigured: db.isSupabaseConnected(),
  });
});

// 2. Metrics & KPI Overview
apiRouter.get('/metrics', (_req: Request, res: Response) => {
  const metrics = db.getMetrics();
  res.json(metrics);
});

// 3. Repositories
apiRouter.get('/repositories', (_req: Request, res: Response) => {
  const repos = db.getRepositories();
  res.json(repos);
});

apiRouter.post('/repositories/sync', async (_req: Request, res: Response) => {
  try {
    const installed = await fetchInstalledRepositories();
    const syncedRepos = [];

    for (const repo of installed) {
      const saved = await db.upsertRepository({
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
      });
      syncedRepos.push(saved);
    }

    res.json({
      success: true,
      syncedCount: installed.length,
      repositories: db.getRepositories(),
    });
  } catch (err: any) {
    console.error('[API] Error syncing repositories:', err);
    res.status(500).json({ error: err.message || 'Failed to sync repositories' });
  }
});

apiRouter.post('/repositories', async (req: Request, res: Response): Promise<void> => {
  const { fullName, minimumSeverityToBlock, strictness, enabledCategories, customInstructions } = req.body;
  if (!fullName || typeof fullName !== 'string' || !fullName.includes('/')) {
    res.status(400).json({ error: 'Valid repository fullName is required (e.g. owner/repo)' });
    return;
  }

  const parts = fullName.trim().split('/');
  const created = await db.upsertRepository({
    fullName: fullName.trim(),
    owner: parts[0],
    name: parts[1],
    minimumSeverityToBlock: minimumSeverityToBlock || 'HIGH',
    strictness: strictness || 'STANDARD',
    enabledCategories: enabledCategories || ['SECURITY', 'BUG', 'PERFORMANCE', 'CODE_QUALITY', 'BEST_PRACTICES'],
    customInstructions: customInstructions || '',
  });

  res.status(201).json(created);
});

apiRouter.get('/repositories/:id', (req: Request, res: Response): void => {
  const repo = db.getRepository(req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'Repository not found' });
    return;
  }
  res.json(repo);
});

apiRouter.put('/repositories/:id', async (req: Request, res: Response): Promise<void> => {
  const parsed = RepositoryConfigUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  const existingRepo = db.getRepository(req.params.id);
  const fullName = existingRepo?.fullName || req.body.fullName || req.params.id;

  const updated = await db.upsertRepository({
    ...(existingRepo || {
      id: req.params.id,
      fullName,
      owner: fullName.split('/')[0] || 'owner',
      name: fullName.split('/')[1] || fullName,
    }),
    ...parsed.data,
  });

  res.json(updated);
});

apiRouter.delete('/repositories/:id', async (req: Request, res: Response): Promise<void> => {
  const deleted = await db.deleteRepository(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Repository not found' });
    return;
  }
  res.json({ success: true, message: 'Repository removed successfully', repositories: db.getRepositories() });
});

// 4. Reviews
apiRouter.get('/reviews', (req: Request, res: Response) => {
  let reviews = db.getReviews();

  if (req.query.repo) {
    reviews = reviews.filter((r) => r.repoName === req.query.repo || `${r.repoOwner}/${r.repoName}` === req.query.repo);
  }

  if (req.query.severity) {
    reviews = reviews.filter((r) => r.issues.some((i) => i.severity === req.query.severity));
  }

  res.json(reviews);
});

apiRouter.delete('/reviews', async (_req: Request, res: Response) => {
  await db.clearReviews();
  res.json({ success: true, message: 'All reviews cleared', metrics: db.getMetrics() });
});

apiRouter.delete('/reviews/:id', async (req: Request, res: Response): Promise<void> => {
  const deleted = await db.deleteReview(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  res.json({ success: true, message: 'Review deleted', metrics: db.getMetrics() });
});

apiRouter.get('/reviews/:id', (req: Request, res: Response): void => {
  const review = db.getReviewById(req.params.id);
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  res.json(review);
});

// 5. Test Raw Diff (Playground)
apiRouter.post('/reviews/test-diff', async (req: Request, res: Response): Promise<void> => {
  const validation = TestDiffRequestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.format() });
    return;
  }

  const { diff, fileName, customInstructions } = validation.data;

  try {
    const review = await processPullRequestReview({
      rawDiff: diff,
      prTitle: `Playground Test: ${fileName || 'code-snippet.ts'}`,
      repoName: 'playground-sandbox',
      repoOwner: 'local-tester',
      customInstructions,
    });

    res.json(review);
  } catch (err: any) {
    console.error('[API] Error reviewing test diff:', err);
    res.status(500).json({ error: err.message || 'Failed to review diff' });
  }
});

// 6. Test Public GitHub PR by URL
apiRouter.post('/reviews/test-pr', async (req: Request, res: Response): Promise<void> => {
  const validation = TestPRRequestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.format() });
    return;
  }

  const { prUrl } = validation.data;

  // Regex to extract owner, repo, pull number
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (!match) {
    res.status(400).json({ error: 'Invalid GitHub PR URL. Example: https://github.com/owner/repo/pull/123' });
    return;
  }

  const [, owner, repo, pullNumStr] = match;
  const pullNumber = parseInt(pullNumStr, 10);

  try {
    const prDetails = await fetchPublicPRDiff(owner, repo, pullNumber);

    const review = await processPullRequestReview({
      rawDiff: prDetails.diff,
      prNumber: pullNumber,
      repoOwner: owner,
      repoName: repo,
      prTitle: prDetails.title,
      prUrl: prDetails.prUrl,
      author: prDetails.author,
      headSha: prDetails.headSha,
      baseSha: prDetails.baseSha,
      headRef: prDetails.headRef,
      baseRef: prDetails.baseRef,
    });

    res.json(review);
  } catch (err: any) {
    console.error('[API] Error reviewing public PR:', err);
    res.status(500).json({
      error: `Failed to fetch or review PR: ${err.response?.data?.message || err.message}`,
    });
  }
});

// 7. Apply 1-Click Fix
apiRouter.post('/reviews/:id/issues/:issueId/fix', async (req: Request, res: Response): Promise<void> => {
  const { id, issueId } = req.params;
  const { customFix, installationId } = req.body;

  const result = await applyIssueFix(id, issueId, customFix, installationId);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

// 8. Dismiss Issue
apiRouter.post('/reviews/:id/issues/:issueId/dismiss', async (req: Request, res: Response): Promise<void> => {
  const { id, issueId } = req.params;
  const success = await db.updateIssueStatus(id, issueId, 'DISMISSED');

  if (!success) {
    res.status(404).json({ error: 'Review or issue not found' });
    return;
  }

  res.json({ success: true, message: 'Issue marked as dismissed' });
});

// 9. Fetch Open PRs for Repository
apiRouter.get('/repositories/:id/pulls', async (req: Request, res: Response): Promise<void> => {
  const repo = db.getRepository(req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'Repository not found' });
    return;
  }

  const pulls = await fetchRepositoryPullRequests(repo.owner, repo.name);
  res.json(pulls);
});

// 10. Run Full AI Review on a Repository PR
apiRouter.post('/repositories/:id/reviews/run', async (req: Request, res: Response): Promise<void> => {
  const repo = db.getRepository(req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'Repository not found' });
    return;
  }

  const { prNumber } = req.body;
  if (!prNumber || typeof prNumber !== 'number') {
    res.status(400).json({ error: 'prNumber (integer) is required' });
    return;
  }

  try {
    const prDetails = await fetchPublicPRDiff(repo.owner, repo.name, prNumber);
    const review = await processPullRequestReview({
      rawDiff: prDetails.diff,
      prNumber,
      repoOwner: repo.owner,
      repoName: repo.name,
      prTitle: prDetails.title,
      prUrl: prDetails.prUrl,
      author: prDetails.author,
      headSha: prDetails.headSha,
      baseSha: prDetails.baseSha,
      headRef: prDetails.headRef,
      baseRef: prDetails.baseRef,
      customInstructions: repo.customInstructions,
    });

    res.json({
      success: true,
      message: `Successfully reviewed PR #${prNumber} for ${repo.fullName}!`,
      review,
    });
  } catch (err: any) {
    console.error(`[API] Error reviewing PR #${prNumber} for ${repo.fullName}:`, err);
    res.status(500).json({
      error: `Failed to review PR #${prNumber}: ${err.response?.data?.message || err.message}`,
    });
  }
});
