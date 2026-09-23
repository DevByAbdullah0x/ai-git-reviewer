import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ReviewResult, RepositoryConfig, MetricsSummary, IssueSeverity, IssueCategory } from '@ai-reviewer/shared';
import { config } from '../config';

interface DatabaseSchema {
  reviews: ReviewResult[];
  repositories: RepositoryConfig[];
  metrics: MetricsSummary;
}

const DATA_FILE = process.env.VERCEL
  ? '/tmp/store.json'
  : path.resolve(__dirname, '../../data/store.json');

class DatabaseService {
  private readonly supabase: SupabaseClient | null = null;
  private data: DatabaseSchema;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    if (config.supabase.url && config.supabase.serviceRoleKey) {
      try {
        this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        console.log('[DB] Supabase persistence client initialized.');
      } catch (err) {
        console.warn('[DB] Failed to initialize Supabase client:', err);
      }
    } else {
      console.log('[DB] Supabase not configured. Using local file/in-memory store fallback.');
    }

    this.data = this.emptyData();
    this.recomputeMetrics();

    // Trigger initial background load
    this.ensureLoaded().catch((err) => {
      console.warn('[DB] Initial background load warning:', err.message);
    });
  }

  private emptyMetrics(): MetricsSummary {
    return {
      totalReviews: 0,
      totalIssuesDetected: 0,
      criticalIssuesCount: 0,
      avgHealthScore: 100,
      severityDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
      categoryDistribution: { SECURITY: 0, BUG: 0, PERFORMANCE: 0, CODE_QUALITY: 0, BEST_PRACTICES: 0 },
      recentReviews: [],
    };
  }

  private emptyData(): DatabaseSchema {
    return {
      reviews: [],
      repositories: [],
      metrics: this.emptyMetrics(),
    };
  }

  public isSupabaseConnected(): boolean {
    return this.supabase !== null;
  }

  public async ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      if (this.supabase) {
        try {
          const { data, error } = await this.supabase
            .from('reviewer_state')
            .select('data')
            .eq('id', 'global')
            .maybeSingle();

          if (error) {
            console.error('[DB] Supabase load error:', error.message);
          } else if (data?.data) {
            const state = data.data as Partial<DatabaseSchema>;
            this.data = {
              reviews: Array.isArray(state.reviews) ? state.reviews : [],
              repositories: Array.isArray(state.repositories) ? state.repositories : [],
              metrics: state.metrics || this.emptyMetrics(),
            };
            this.recomputeMetrics();
            return;
          }
        } catch (err: any) {
          console.warn('[DB] Failed loading from Supabase, attempting local fallback:', err.message);
        }
      }

      // Local file fallback
      try {
        if (fs.existsSync(DATA_FILE)) {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          this.data = {
            reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
            repositories: Array.isArray(parsed.repositories) ? parsed.repositories : [],
            metrics: parsed.metrics || this.emptyMetrics(),
          };
          this.recomputeMetrics();
        }
      } catch (err: any) {
        console.warn('[DB] Failed reading local store file:', err.message);
      }
    })();

    try {
      await this.loadPromise;
    } catch (err) {
      this.loadPromise = null;
      throw err;
    }
  }

  private async persist(): Promise<void> {
    if (this.supabase) {
      try {
        const { error } = await this.supabase.from('reviewer_state').upsert(
          {
            id: 'global',
            data: this.data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        if (error) {
          console.error('[DB] Supabase save error:', error.message);
        }
      } catch (err: any) {
        console.error('[DB] Supabase persist exception:', err.message);
      }
    }

    // Always keep local disk file in sync as safety backup when writable
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // Ignore disk write errors in read-only serverless environments
    }
  }

  public getRepositories(): RepositoryConfig[] {
    return this.data.repositories;
  }

  public getRepository(idOrName: string): RepositoryConfig | undefined {
    return this.data.repositories.find(
      (r) => r.id === idOrName || r.fullName.toLowerCase() === idOrName.toLowerCase()
    );
  }

  public async upsertRepository(repo: Partial<RepositoryConfig> & { fullName: string }): Promise<RepositoryConfig> {
    await this.ensureLoaded();
    const existingIndex = this.data.repositories.findIndex(
      (r) => r.fullName.toLowerCase() === repo.fullName.toLowerCase()
    );
    const now = new Date().toISOString();

    let result: RepositoryConfig;

    if (existingIndex >= 0) {
      this.data.repositories[existingIndex] = {
        ...this.data.repositories[existingIndex],
        ...repo,
        updatedAt: now,
      };
      result = this.data.repositories[existingIndex];
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
      result = newRepo;
    }

    await this.persist();
    return result;
  }

  public async deleteRepository(idOrName: string): Promise<boolean> {
    await this.ensureLoaded();
    const initialLen = this.data.repositories.length;
    this.data.repositories = this.data.repositories.filter(
      (r) => r.id !== idOrName && r.fullName.toLowerCase() !== idOrName.toLowerCase()
    );
    if (this.data.repositories.length !== initialLen) {
      await this.persist();
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

  public async saveReview(review: ReviewResult): Promise<ReviewResult> {
    await this.ensureLoaded();
    const existingIndex = this.data.reviews.findIndex((r) => r.id === review.id);
    if (existingIndex >= 0) {
      this.data.reviews[existingIndex] = review;
    } else {
      this.data.reviews.unshift(review);
    }
    this.recomputeMetrics();
    await this.persist();
    return review;
  }

  public async deleteReview(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const initialLen = this.data.reviews.length;
    this.data.reviews = this.data.reviews.filter((r) => r.id !== id);
    if (this.data.reviews.length !== initialLen) {
      this.recomputeMetrics();
      await this.persist();
      return true;
    }
    return false;
  }

  public async clearReviews(): Promise<void> {
    await this.ensureLoaded();
    this.data.reviews = [];
    this.recomputeMetrics();
    await this.persist();
  }

  public async updateIssueStatus(
    reviewId: string,
    issueId: string,
    status: 'OPEN' | 'FIXED' | 'DISMISSED'
  ): Promise<boolean> {
    await this.ensureLoaded();
    const review = this.getReviewById(reviewId);
    if (!review) return false;

    const issue = review.issues.find((i) => i.id === issueId);
    if (!issue) return false;

    issue.status = status;
    this.recomputeMetrics();
    await this.persist();
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
