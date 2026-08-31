import { z } from 'zod';
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES } from './constants.js';

export const IssueSeveritySchema = z.enum(ISSUE_SEVERITIES);
export const IssueCategorySchema = z.enum(ISSUE_CATEGORIES);

export const LLMIssueSchema = z.object({
  file: z.string().describe('File path of the finding'),
  line: z.number().int().describe('1-based line number in the new/modified file where the issue occurs'),
  endLine: z.number().int().optional().describe('End line number if spanning multiple lines'),
  severity: IssueSeveritySchema.describe('Severity level of the issue'),
  category: IssueCategorySchema.describe('Category of the issue'),
  title: z.string().describe('Short, punchy title describing the issue (e.g. "SQL Injection Vulnerability")'),
  explanation: z.string().describe('Clear, technical explanation of why this is problematic with line context'),
  impact: z.string().describe('Real-world security, stability, or performance consequences'),
  suggestedFix: z.string().optional().describe('Exact replacement code for the problematic line(s), formatted cleanly without markdown fences'),
  originalCode: z.string().optional().describe('The original problematic code snippet'),
});

export const LLMReviewResponseSchema = z.object({
  summary: z.string().describe('High-level executive review summary of the PR changes'),
  overallHealthScore: z.number().min(0).max(100).describe('Overall code health score from 0 to 100'),
  categoryScores: z.object({
    SECURITY: z.number().min(0).max(100),
    BUG: z.number().min(0).max(100),
    PERFORMANCE: z.number().min(0).max(100),
    CODE_QUALITY: z.number().min(0).max(100),
    BEST_PRACTICES: z.number().min(0).max(100),
  }),
  issues: z.array(LLMIssueSchema).describe('List of discovered issues and actionable recommendations'),
});

export type LLMReviewResponse = z.infer<typeof LLMReviewResponseSchema>;
export type LLMIssue = z.infer<typeof LLMIssueSchema>;

export const TestDiffRequestSchema = z.object({
  diff: z.string().min(5, 'Diff content is required'),
  fileName: z.string().optional(),
  language: z.string().optional(),
  customInstructions: z.string().optional(),
});

export const TestPRRequestSchema = z.object({
  prUrl: z.string().url('Must be a valid GitHub PR URL (e.g., https://github.com/owner/repo/pull/1)'),
});

export const RepositoryConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  minimumSeverityToBlock: IssueSeveritySchema.optional(),
  strictness: z.enum(['PERMISSIVE', 'STANDARD', 'STRICT']).optional(),
  enabledCategories: z.array(IssueCategorySchema).optional(),
  customInstructions: z.string().optional(),
  autoApplySafeFixes: z.boolean().optional(),
  postInlineComments: z.boolean().optional(),
  postSummaryComment: z.boolean().optional(),
});

