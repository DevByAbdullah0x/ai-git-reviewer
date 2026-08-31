import { calculateReviewScores } from '../analyzer/score';
import { ReviewIssue } from '@ai-reviewer/shared';

export function testScoring() {
  console.log('🧪 Running Scoring Engine Tests...');

  const cleanIssues: ReviewIssue[] = [];
  const cleanScore = calculateReviewScores(cleanIssues);
  if (cleanScore.overallScore !== 100) {
    throw new Error(`Clean PR score should be 100, got ${cleanScore.overallScore}`);
  }

  const criticalIssues: ReviewIssue[] = [
    {
      id: '1',
      file: 'src/auth.ts',
      line: 10,
      severity: 'CRITICAL',
      category: 'SECURITY',
      title: 'SQL Injection',
      explanation: 'Unparameterized query',
      impact: 'DB dump',
      source: 'STATIC',
      status: 'OPEN',
    },
    {
      id: '2',
      file: 'src/auth.ts',
      line: 15,
      severity: 'HIGH',
      category: 'SECURITY',
      title: 'Missing Auth',
      explanation: 'No token check',
      impact: 'Unauthorized access',
      source: 'AI',
      status: 'OPEN',
    },
  ];

  const criticalScore = calculateReviewScores(criticalIssues);
  if (criticalScore.overallScore >= 80) {
    throw new Error(`Critical PR score should be reduced below 80, got ${criticalScore.overallScore}`);
  }

  console.log(`  ✅ Scoring engine correctly penalized severe vulnerabilities (Score: ${criticalScore.overallScore}/100).`);
}

