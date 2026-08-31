import { IssueSeverity, IssueCategory } from './constants.js';

export type FindingSource = 'STATIC' | 'AI' | 'HYBRID';
export type IssueStatus = 'OPEN' | 'FIXED' | 'DISMISSED';

export interface ReviewIssue {
  id: string;
  file: string;
  line: number;
  endLine?: number;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  explanation: string;
  impact: string;
  suggestedFix?: string;
  originalCode?: string;
  source: FindingSource;
  status: IssueStatus;
  ruleId?: string;
  diffHunk?: string;
}

export interface CategoryScores {
  SECURITY: number;
  BUG: number;
  PERFORMANCE: number;
  CODE_QUALITY: number;
  BEST_PRACTICES: number;
}

export interface ReviewResult {
  id: string;
  prNumber: number;
  repoName: string;
  repoOwner: string;
  prTitle: string;
  prUrl: string;
  author: string;
  headSha: string;
  baseSha: string;
  headRef: string;
  baseRef: string;
  createdAt: string;
  completedAt?: string;
  overallScore: number;
  categoryScores: CategoryScores;
  issues: ReviewIssue[];
  filesCount: number;
  additions: number;
  deletions: number;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  summaryMarkdown: string;
  githubReviewId?: number;
  error?: string;
}

export interface ParsedDiffHunk {
  content: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: Array<{
    type: 'add' | 'del' | 'normal';
    content: string;
    oldLineNumber?: number;
    newLineNumber?: number;
    position: number; // 1-based diff hunk offset for GitHub Review API
  }>;
}

export interface ParsedDiffFile {
  from?: string;
  to?: string;
  oldPath: string;
  newPath: string;
  chunks: ParsedDiffHunk[];
  deletions: number;
  additions: number;
  isNew: boolean;
  isDeleted: boolean;
  isModified: boolean;
}

export interface RepositoryConfig {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  enabled: boolean;
  minimumSeverityToBlock: IssueSeverity;
  strictness: 'PERMISSIVE' | 'STANDARD' | 'STRICT';
  enabledCategories: IssueCategory[];
  customInstructions: string;
  autoApplySafeFixes: boolean;
  postInlineComments: boolean;
  postSummaryComment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetricsSummary {
  totalReviews: number;
  totalIssuesDetected: number;
  criticalIssuesCount: number;
  avgHealthScore: number;
  severityDistribution: Record<IssueSeverity, number>;
  categoryDistribution: Record<IssueCategory, number>;
  recentReviews: ReviewResult[];
}

export interface ApplyFixPayload {
  reviewId: string;
  issueId: string;
  customFix?: string;
}

export interface ApplyFixResult {
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  message: string;
}

export interface TestDiffPayload {
  diff: string;
  fileName?: string;
  language?: string;
  customInstructions?: string;
}

export interface TestPRPayload {
  prUrl: string;
}

