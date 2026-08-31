import { ReviewIssue, CategoryScores, SEVERITY_WEIGHTS } from '@ai-reviewer/shared';

export function calculateReviewScores(issues: ReviewIssue[]): {
  overallScore: number;
  categoryScores: CategoryScores;
} {
  const categoryDeductions: Record<keyof CategoryScores, number> = {
    SECURITY: 0,
    BUG: 0,
    PERFORMANCE: 0,
    CODE_QUALITY: 0,
    BEST_PRACTICES: 0,
  };

  let totalDeductions = 0;
  let hasCritical = false;
  let hasHigh = false;

  for (const issue of issues) {
    const weight = SEVERITY_WEIGHTS[issue.severity] || 0;
    categoryDeductions[issue.category] += weight;
    totalDeductions += weight;

    if (issue.severity === 'CRITICAL') hasCritical = true;
    if (issue.severity === 'HIGH') hasHigh = true;
  }

  const categoryScores: CategoryScores = {
    SECURITY: Math.max(0, Math.min(100, 100 - categoryDeductions.SECURITY)),
    BUG: Math.max(0, Math.min(100, 100 - categoryDeductions.BUG)),
    PERFORMANCE: Math.max(0, Math.min(100, 100 - categoryDeductions.PERFORMANCE)),
    CODE_QUALITY: Math.max(0, Math.min(100, 100 - categoryDeductions.CODE_QUALITY)),
    BEST_PRACTICES: Math.max(0, Math.min(100, 100 - categoryDeductions.BEST_PRACTICES)),
  };

  // Base weighted score across dimensions
  const weightedCategoryScore =
    categoryScores.SECURITY * 0.35 +
    categoryScores.BUG * 0.25 +
    categoryScores.PERFORMANCE * 0.2 +
    categoryScores.CODE_QUALITY * 0.1 +
    categoryScores.BEST_PRACTICES * 0.1;

  // Direct deduction score
  const directScore = Math.max(0, 100 - totalDeductions);

  // Blend weighted category score and direct deductions
  let overallScore = Math.round((weightedCategoryScore + directScore) / 2);

  // Critical and High penalties cap maximum allowed score
  if (hasCritical) {
    overallScore = Math.min(overallScore, 65);
  } else if (hasHigh) {
    overallScore = Math.min(overallScore, 79);
  }

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    categoryScores,
  };
}

export function deduplicateIssues(staticIssues: ReviewIssue[], aiIssues: ReviewIssue[]): ReviewIssue[] {
  const combined: ReviewIssue[] = [...staticIssues];

  for (const aiIssue of aiIssues) {
    const duplicate = staticIssues.find(
      (s) => s.file === aiIssue.file && Math.abs(s.line - aiIssue.line) <= 1 && s.category === aiIssue.category
    );

    if (!duplicate) {
      combined.push(aiIssue);
    }
  }

  return combined;
}

