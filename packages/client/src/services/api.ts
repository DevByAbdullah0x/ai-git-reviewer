import axios from 'axios';
import {
  MetricsSummary,
  RepositoryConfig,
  ReviewResult,
  TestDiffPayload,
  ApplyFixResult,
} from '@ai-reviewer/shared';

const API_BASE = '/api';

export const api = {
  getHealth: async () => {
    const res = await axios.get(`${API_BASE}/health`);
    return res.data;
  },

  getMetrics: async (): Promise<MetricsSummary> => {
    const res = await axios.get<MetricsSummary>(`${API_BASE}/metrics`);
    return res.data;
  },

  getRepositories: async (): Promise<RepositoryConfig[]> => {
    const res = await axios.get<RepositoryConfig[]>(`${API_BASE}/repositories`);
    return res.data;
  },

  syncRepositories: async (): Promise<{ success: boolean; syncedCount: number; repositories: RepositoryConfig[] }> => {
    const res = await axios.post(`${API_BASE}/repositories/sync`);
    return res.data;
  },

  createRepository: async (fullName: string): Promise<RepositoryConfig> => {
    const res = await axios.post<RepositoryConfig>(`${API_BASE}/repositories`, { fullName });
    return res.data;
  },

  updateRepository: async (id: string, updates: Partial<RepositoryConfig>): Promise<RepositoryConfig> => {
    const res = await axios.put<RepositoryConfig>(`${API_BASE}/repositories/${id}`, updates);
    return res.data;
  },

  deleteRepository: async (id: string): Promise<{ success: boolean; repositories: RepositoryConfig[] }> => {
    const res = await axios.delete(`${API_BASE}/repositories/${id}`);
    return res.data;
  },

  getReviews: async (repo?: string, severity?: string): Promise<ReviewResult[]> => {
    const res = await axios.get<ReviewResult[]>(`${API_BASE}/reviews`, {
      params: { repo, severity },
    });
    return res.data;
  },

  clearReviews: async (): Promise<{ success: boolean; metrics: MetricsSummary }> => {
    const res = await axios.delete(`${API_BASE}/reviews`);
    return res.data;
  },

  deleteReview: async (id: string): Promise<{ success: boolean; metrics: MetricsSummary }> => {
    const res = await axios.delete(`${API_BASE}/reviews/${id}`);
    return res.data;
  },

  getReviewById: async (id: string): Promise<ReviewResult> => {
    const res = await axios.get<ReviewResult>(`${API_BASE}/reviews/${id}`);
    return res.data;
  },

  testDiff: async (payload: TestDiffPayload): Promise<ReviewResult> => {
    const res = await axios.post<ReviewResult>(`${API_BASE}/reviews/test-diff`, payload);
    return res.data;
  },

  testPR: async (prUrl: string): Promise<ReviewResult> => {
    const res = await axios.post<ReviewResult>(`${API_BASE}/reviews/test-pr`, { prUrl });
    return res.data;
  },

  applyFix: async (reviewId: string, issueId: string, customFix?: string): Promise<ApplyFixResult> => {
    const res = await axios.post<ApplyFixResult>(`${API_BASE}/reviews/${reviewId}/issues/${issueId}/fix`, {
      customFix,
    });
    return res.data;
  },

  dismissIssue: async (reviewId: string, issueId: string): Promise<{ success: boolean }> => {
    const res = await axios.post<{ success: boolean }>(`${API_BASE}/reviews/${reviewId}/issues/${issueId}/dismiss`);
    return res.data;
  },

  getRepositoryPulls: async (repoId: string): Promise<Array<{
    number: number;
    title: string;
    author: string;
    htmlUrl: string;
    createdAt: string;
    headRef: string;
    baseRef: string;
  }>> => {
    const res = await axios.get(`${API_BASE}/repositories/${repoId}/pulls`);
    return res.data;
  },

  runRepositoryReview: async (repoId: string, prNumber: number): Promise<{ success: boolean; message: string; review: ReviewResult }> => {
    const res = await axios.post(`${API_BASE}/repositories/${repoId}/reviews/run`, { prNumber });
    return res.data;
  },
};
