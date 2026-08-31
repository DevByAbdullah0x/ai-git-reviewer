import axios from 'axios';
import { config } from '../config';

let githubApp: any = null;

export async function getGitHubApp(): Promise<any> {
  if (githubApp) return githubApp;

  if (!config.github.appId || !config.github.privateKey) {
    return null;
  }

  try {
    const { App } = await import('@octokit/app');
    githubApp = new App({
      appId: config.github.appId,
      privateKey: config.github.privateKey,
      webhooks: {
        secret: config.github.webhookSecret,
      },
    });
    return githubApp;
  } catch (err) {
    console.error('[GitHub App] Failed to initialize App instance:', err);
    return null;
  }
}

export async function getInstallationOctokit(installationId: number): Promise<any> {
  const app = await getGitHubApp();
  if (!app) {
    throw new Error('GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in .env');
  }
  return await app.getInstallationOctokit(installationId);
}

export async function fetchInstalledRepositories(): Promise<
  Array<{ id: number; fullName: string; owner: string; name: string }>
> {
  const app = await getGitHubApp();
  if (!app) return [];

  const repos: Array<{ id: number; fullName: string; owner: string; name: string }> = [];

  try {
    for await (const { installation } of app.eachInstallation.iterator()) {
      const octokit = await app.getInstallationOctokit(installation.id);
      const res = await octokit.request('GET /installation/repositories', {
        per_page: 100,
      });

      for (const repo of res.data.repositories) {
        repos.push({
          id: repo.id,
          fullName: repo.full_name,
          owner: repo.owner.login,
          name: repo.name,
        });
      }
    }
  } catch (err: any) {
    console.warn('[GitHub App] Error fetching installed repositories:', err.message);
  }

  return repos;
}

export async function fetchRepositoryPullRequests(
  owner: string,
  repo: string
): Promise<Array<{
  number: number;
  title: string;
  author: string;
  htmlUrl: string;
  createdAt: string;
  headRef: string;
  baseRef: string;
}>> {
  try {
    const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=15`, {
      headers: {
        'User-Agent': 'AI-Git-Reviewer-Bot',
      },
    });
    return res.data.map((pr: any) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      htmlUrl: pr.html_url,
      createdAt: pr.created_at,
      headRef: pr.head?.ref || '',
      baseRef: pr.base?.ref || '',
    }));
  } catch (err: any) {
    console.warn(`[GitHub] Could not fetch PRs for ${owner}/${repo}:`, err.message);
    return [];
  }
}

export async function fetchPullRequestDiff(
  octokit: any,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string> {
  const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: pullNumber,
    headers: {
      accept: 'application/vnd.github.v3.diff',
    },
  });

  return response.data as unknown as string;
}

export async function fetchPublicPRDiff(owner: string, repo: string, pullNumber: number): Promise<{
  diff: string;
  title: string;
  author: string;
  headSha: string;
  baseSha: string;
  headRef: string;
  baseRef: string;
  prUrl: string;
}> {
  const metadataRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    headers: {
      'User-Agent': 'AI-Git-Reviewer-Bot',
    },
  });

  const diffRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    headers: {
      'User-Agent': 'AI-Git-Reviewer-Bot',
      Accept: 'application/vnd.github.v3.diff',
    },
  });

  const data = metadataRes.data;

  return {
    diff: typeof diffRes.data === 'string' ? diffRes.data : String(diffRes.data),
    title: data.title || `PR #${pullNumber}`,
    author: data.user?.login || 'unknown',
    headSha: data.head?.sha || '',
    baseSha: data.base?.sha || '',
    headRef: data.head?.ref || '',
    baseRef: data.base?.ref || '',
    prUrl: data.html_url || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
  };
}
