import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { getInstallationOctokit, fetchPullRequestDiff } from '../github/app';
import { processPullRequestReview } from '../services/review.service';
import { db } from '../services/db.service';

export const webhookRouter = Router();

function verifyGitHubSignature(req: Request): boolean {
  if (!config.github.webhookSecret || config.github.webhookSecret === 'development_webhook_secret') {
    return true; // Allow in local dev mode
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', config.github.webhookSecret);
  const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

webhookRouter.post('/github', async (req: Request, res: Response): Promise<void> => {
  const event = req.headers['x-github-event'] as string;
  const deliveryId = req.headers['x-github-delivery'] as string;

  console.info(`[Webhook] Received event: ${event} (Delivery: ${deliveryId})`);

  if (!verifyGitHubSignature(req)) {
    res.status(401).json({ error: 'Invalid HMAC signature' });
    return;
  }

  // Acknowledge receipt immediately to avoid GitHub timeout
  res.status(202).json({ received: true, event });

  if (event === 'pull_request') {
    const action = req.body.action;
    if (['opened', 'synchronize', 'reopened'].includes(action)) {
      const pr = req.body.pull_request;
      const repo = req.body.repository;
      const installation = req.body.installation;

      if (!pr || !repo) return;

      console.info(`[Webhook] Processing PR #${pr.number} for ${repo.full_name} (${action})`);

      // Ensure repository is registered in DB
      db.upsertRepository({
        fullName: repo.full_name,
        owner: repo.owner.login,
        name: repo.name,
      });

      try {
        let diffText = '';

        if (installation?.id) {
          const octokit = await getInstallationOctokit(installation.id);
          diffText = await fetchPullRequestDiff(octokit, repo.owner.login, repo.name, pr.number);
        }

        if (!diffText) {
          console.warn(`[Webhook] Could not fetch diff for PR #${pr.number}`);
          return;
        }

        await processPullRequestReview({
          rawDiff: diffText,
          prNumber: pr.number,
          repoOwner: repo.owner.login,
          repoName: repo.name,
          prTitle: pr.title,
          prUrl: pr.html_url,
          author: pr.user?.login || 'unknown',
          headSha: pr.head?.sha,
          baseSha: pr.base?.sha,
          headRef: pr.head?.ref,
          baseRef: pr.base?.ref,
          installationId: installation?.id,
        });

        console.info(`[Webhook] Successfully reviewed PR #${pr.number}`);
      } catch (err: any) {
        console.error(`[Webhook] Error reviewing PR #${pr.number}:`, err);
      }
    }
  }
});

