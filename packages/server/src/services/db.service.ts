import fs from 'fs';
import path from 'path';
import { ReviewResult, RepositoryConfig, MetricsSummary, IssueSeverity, IssueCategory } from '@ai-reviewer/shared';

interface DatabaseSchema {
  reviews: ReviewResult[];
  repositories: RepositoryConfig[];
  metrics: MetricsSummary;
}

const DATA_FILE = path.resolve(__dirname, '../../data/store.json');

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    this.recomputeMetrics();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[DB] Failed to read store.json, using in-memory store:', err);
    }

    return {
      reviews: [],
      repositories: [],
      metrics: {
        totalReviews: 0,
        totalIssuesDetected: 0,
        criticalIssuesCount: 0,
        avgHealthScore: 100,
        severityDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
        categoryDistribution: { SECURITY: 0, BUG: 0, PERFORMANCE: 0, CODE_QUALITY: 0, BEST_PRACTICES: 0 },
        recentReviews: [],
      },
    };
  }

  private persist() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error saving data to disk:', err);
    }
  }

  public getRepositories(): RepositoryConfig[] {
    return this.data.repositories;
  }

  public getRepository(idOrName: string): RepositoryConfig | undefined {
    return this.data.repositories.find((r) => r.id === idOrName || r.fullName.toLowerCase() === idOrName.toLowerCase());
  }

  public upsertRepository(repo: Partial<RepositoryConfig> & { fullName: string }): RepositoryConfig {
    const existingIndex = this.data.repositories.findIndex(
      (r) => r.fullName.toLowerCase() === repo.fullName.toLowerCase()
    );
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      this.data.repositories[existingIndex] = {
        ...this.data.repositories[existingIndex],
        ...repo,
        updatedAt: now,
      };
      this.persist();
      return this.data.repositories[existingIndex];
    } else {
      const parts = repo.fullName.split('/');
      const newRepo: RepositoryConfig = {
        id: `repo-${Date.now()}`,
        fullName: repo.fullName,
        owner: parts[0] || 'owner',
        name: parts[1] || repo.fullName,
        enabled: repo.enabled ?? true,
        minimumSeverityToBlock: repo.minimumSeverityToBlock ?? 'HIGH',
        strictness: repo.strictness ?? 'STANDARD',
        enabledCategories: repo.enabledCategories ?? ['SECURITY', 'BUG', 'PERFORMANCE', 'CODE_QUALITY', 'BEST_PRACTICES'],
        customInstructions: repo.customInstructions ?? '',
        autoApplySafeFixes: repo.autoApplySafeFixes ?? false,
        postInlineComments: repo.postInlineComments ?? true,
        postSummaryComment: repo.postSummaryComment ?? true,
        createdAt: now,
        updatedAt: now,
      };
      this.data.repositories.push(newRepo);
      this.persist();
      return newRepo;
    }
  }

  public deleteRepository(idOrName: string): boolean {
    const initialLen = this.data.repositories.length;
    this.data.repositories = this.data.repositories.filter(
      (r) => r.id !== idOrName && r.fullName.toLowerCase() !== idOrName.toLowerCase()
    );
    if (this.data.repositories.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public getReviews(): ReviewResult[] {
    return this.data.reviews;
  }

  public getReviewById(id: string): ReviewResult | undefined {
    return this.data.reviews.find((r) => r.id === id);
  }

  public saveReview(review: ReviewResult): ReviewResult {
    const existingIndex = this.data.reviews.findIndex((r) => r.id === review.id);
    if (existingIndex >= 0) {
      this.data.reviews[existingIndex] = review;
    } else {
      this.data.reviews.unshift(review);
    }
    this.recomputeMetrics();
    this.persist();
    return review;
  }

  public deleteReview(id: string): boolean {
    const initialLen = this.data.reviews.length;
    this.data.reviews = this.data.reviews.filter((r) => r.id !== id);
    if (this.data.reviews.length !== initialLen) {
      this.recomputeMetrics();
      this.persist();
      return true;
    }
    return false;
  }

  public clearReviews(): void {
    this.data.reviews = [];
    this.recomputeMetrics();
    this.persist();
  }

  public updateIssueStatus(reviewId: string, issueId: string, status: 'OPEN' | 'FIXED' | 'DISMISSED'): boolean {
    const review = this.getReviewById(reviewId);
    if (!review) return false;

    const issue = review.issues.find((i) => i.id === issueId);
    if (!issue) return false;

    issue.status = status;
    this.recomputeMetrics();
    this.persist();
    return true;
  }

  public getMetrics(): MetricsSummary {
    return this.data.metrics;
  }

  private recomputeMetrics() {
    const totalReviews = this.data.reviews.length;
    let totalIssuesDetected = 0;
    let criticalIssuesCount = 0;
    let totalScore = 0;

    const severityDist: Record<IssueSeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    const categoryDist: Record<IssueCategory, number> = {
      SECURITY: 0,
      BUG: 0,
      PERFORMANCE: 0,
      CODE_QUALITY: 0,
      BEST_PRACTICES: 0,
    };

    for (const rev of this.data.reviews) {
      totalScore += rev.overallScore;
      for (const issue of rev.issues) {
        totalIssuesDetected++;
        if (issue.severity === 'CRITICAL') criticalIssuesCount++;
        severityDist[issue.severity] = (severityDist[issue.severity] || 0) + 1;
        categoryDist[issue.category] = (categoryDist[issue.category] || 0) + 1;
      }
    }

    this.data.metrics = {
      totalReviews,
      totalIssuesDetected,
      criticalIssuesCount,
      avgHealthScore: totalReviews > 0 ? Math.round(totalScore / totalReviews) : 100,
      severityDistribution: severityDist,
      categoryDistribution: categoryDist,
      recentReviews: this.data.reviews.slice(0, 10),
    };
  }
}

export const db = new DatabaseService();
