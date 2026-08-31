"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryConfigUpdateSchema = exports.TestPRRequestSchema = exports.TestDiffRequestSchema = exports.LLMReviewResponseSchema = exports.LLMIssueSchema = exports.IssueCategorySchema = exports.IssueSeveritySchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("./constants");
exports.IssueSeveritySchema = zod_1.z.enum(constants_1.ISSUE_SEVERITIES);
exports.IssueCategorySchema = zod_1.z.enum(constants_1.ISSUE_CATEGORIES);
exports.LLMIssueSchema = zod_1.z.object({
    file: zod_1.z.string().describe('File path of the finding'),
    line: zod_1.z.number().int().describe('1-based line number in the new/modified file where the issue occurs'),
    endLine: zod_1.z.number().int().optional().describe('End line number if spanning multiple lines'),
    severity: exports.IssueSeveritySchema.describe('Severity level of the issue'),
    category: exports.IssueCategorySchema.describe('Category of the issue'),
    title: zod_1.z.string().describe('Short, punchy title describing the issue (e.g. "SQL Injection Vulnerability")'),
    explanation: zod_1.z.string().describe('Clear, technical explanation of why this is problematic with line context'),
    impact: zod_1.z.string().describe('Real-world security, stability, or performance consequences'),
    suggestedFix: zod_1.z.string().optional().describe('Exact replacement code for the problematic line(s), formatted cleanly without markdown fences'),
    originalCode: zod_1.z.string().optional().describe('The original problematic code snippet'),
});
exports.LLMReviewResponseSchema = zod_1.z.object({
    summary: zod_1.z.string().describe('High-level executive review summary of the PR changes'),
    overallHealthScore: zod_1.z.number().min(0).max(100).describe('Overall code health score from 0 to 100'),
    categoryScores: zod_1.z.object({
        SECURITY: zod_1.z.number().min(0).max(100),
        BUG: zod_1.z.number().min(0).max(100),
        PERFORMANCE: zod_1.z.number().min(0).max(100),
        CODE_QUALITY: zod_1.z.number().min(0).max(100),
        BEST_PRACTICES: zod_1.z.number().min(0).max(100),
    }),
    issues: zod_1.z.array(exports.LLMIssueSchema).describe('List of discovered issues and actionable recommendations'),
});
exports.TestDiffRequestSchema = zod_1.z.object({
    diff: zod_1.z.string().min(5, 'Diff content is required'),
    fileName: zod_1.z.string().optional(),
    language: zod_1.z.string().optional(),
    customInstructions: zod_1.z.string().optional(),
});
exports.TestPRRequestSchema = zod_1.z.object({
    prUrl: zod_1.z.string().url('Must be a valid GitHub PR URL (e.g., https://github.com/owner/repo/pull/1)'),
});
exports.RepositoryConfigUpdateSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().optional(),
    minimumSeverityToBlock: exports.IssueSeveritySchema.optional(),
    strictness: zod_1.z.enum(['PERMISSIVE', 'STANDARD', 'STRICT']).optional(),
    enabledCategories: zod_1.z.array(exports.IssueCategorySchema).optional(),
    customInstructions: zod_1.z.string().optional(),
    autoApplySafeFixes: zod_1.z.boolean().optional(),
    postInlineComments: zod_1.z.boolean().optional(),
    postSummaryComment: zod_1.z.boolean().optional(),
});
