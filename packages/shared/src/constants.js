"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_METADATA = exports.SEVERITY_BADGES = exports.SEVERITY_WEIGHTS = exports.ISSUE_CATEGORIES = exports.ISSUE_SEVERITIES = void 0;
exports.ISSUE_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
exports.ISSUE_CATEGORIES = [
    'SECURITY',
    'BUG',
    'PERFORMANCE',
    'CODE_QUALITY',
    'BEST_PRACTICES',
];
exports.SEVERITY_WEIGHTS = {
    CRITICAL: 25,
    HIGH: 15,
    MEDIUM: 8,
    LOW: 3,
    INFO: 0,
};
exports.SEVERITY_BADGES = {
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
exports.CATEGORY_METADATA = {
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
