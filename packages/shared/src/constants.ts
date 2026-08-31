export const ISSUE_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export type IssueSeverity = typeof ISSUE_SEVERITIES[number];

export const ISSUE_CATEGORIES = [
  'SECURITY',
  'BUG',
  'PERFORMANCE',
  'CODE_QUALITY',
  'BEST_PRACTICES',
] as const;
export type IssueCategory = typeof ISSUE_CATEGORIES[number];

export const SEVERITY_WEIGHTS: Record<IssueSeverity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 0,
};

export const SEVERITY_BADGES: Record<IssueSeverity, { label: string; color: string; icon: string; emoji: string }> = {
  CRITICAL: {
    label: 'Critical',
    color: '#ef4444',
    icon: 'AlertOctagon',
    emoji: '🔴',
  },
  HIGH: {
    label: 'High',
    color: '#f97316',
    icon: 'AlertTriangle',
    emoji: '🟠',
  },
  MEDIUM: {
    label: 'Medium',
    color: '#eab308',
    icon: 'AlertCircle',
    emoji: '🟡',
  },
  LOW: {
    label: 'Low',
    color: '#3b82f6',
    icon: 'Info',
    emoji: '🔵',
  },
  INFO: {
    label: 'Info / Suggestion',
    color: '#10b981',
    icon: 'CheckCircle',
    emoji: '🟢',
  },
};

export const CATEGORY_METADATA: Record<IssueCategory, { label: string; icon: string; description: string }> = {
  SECURITY: {
    label: 'Security',
    icon: 'ShieldAlert',
    description: 'Vulnerabilities, injection risks, auth bypasses, and secret exposure.',
  },
  BUG: {
    label: 'Bugs & Logic',
    icon: 'Bug',
    description: 'Null pointer exceptions, race conditions, edge cases, and runtime crashes.',
  },
  PERFORMANCE: {
    label: 'Performance',
    icon: 'Zap',
    description: 'N+1 queries, memory bloat, unindexed lookups, and unoptimized operations.',
  },
  CODE_QUALITY: {
    label: 'Code Quality',
    icon: 'Code',
    description: 'Duplication, high complexity, dead code, and maintainability issues.',
  },
  BEST_PRACTICES: {
    label: 'Best Practices',
    icon: 'ThumbsUp',
    description: 'Language conventions, typing safety, framework idioms, and error handling.',
  },
};

