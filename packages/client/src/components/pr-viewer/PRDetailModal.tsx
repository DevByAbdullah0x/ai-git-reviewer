import React from 'react';
import { ReviewResult, CATEGORY_METADATA, IssueCategory } from '@ai-reviewer/shared';
import { DiffViewer } from '../diff-viewer/DiffViewer';
import {
  X,
  GitPullRequest,
  ExternalLink,
  Shield,
  Bug,
  Zap,
  Code,
  ThumbsUp,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react';

interface PRDetailModalProps {
  review: ReviewResult;
  onClose: () => void;
  onApplyFix: (issueId: string) => Promise<void>;
  onDismissIssue: (issueId: string) => Promise<void>;
}

export const PRDetailModal: React.FC<PRDetailModalProps> = ({
  review,
  onClose,
  onApplyFix,
  onDismissIssue,
}) => {
  const getCategoryIcon = (cat: IssueCategory) => {
    switch (cat) {
      case 'SECURITY':
        return Shield;
      case 'BUG':
        return Bug;
      case 'PERFORMANCE':
        return Zap;
      case 'CODE_QUALITY':
        return Code;
      case 'BEST_PRACTICES':
        return ThumbsUp;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 65) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-5xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#21262d] flex items-center justify-center border border-[#30363d]">
              <GitPullRequest className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{review.prTitle}</h2>
                <span className="font-mono text-sm text-[#8b949e]">#{review.prNumber}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-[#8b949e] mt-0.5">
                <span className="text-[#58a6ff] font-mono">{review.repoOwner}/{review.repoName}</span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{review.author}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {review.prUrl && (
              <a
                href={review.prUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] transition-all"
                title="Open PR on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Score & Radar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Score */}
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
                Overall PR Health Score
              </span>
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${getScoreColor(review.overallScore)} font-bold text-3xl font-mono shadow-lg`}>
                {review.overallScore}
              </div>
              <p className="mt-3 text-xs text-[#8b949e]">
                {review.overallScore >= 85
                  ? 'Ready for merge approval'
                  : review.overallScore >= 65
                  ? 'Review recommendations before merge'
                  : 'Changes requested: Security/critical fixes needed'}
              </p>
            </div>

            {/* Category Scores Breakdown */}
            <div className="md:col-span-2 p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider block">
                Category Score Breakdown
              </span>
              <div className="space-y-2.5">
                {(Object.keys(review.categoryScores) as IssueCategory[]).map((cat) => {
                  const score = review.categoryScores[cat];
                  const Icon = getCategoryIcon(cat);
                  const meta = CATEGORY_METADATA[cat];

                  const barColor =
                    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500';

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-[#c9d1d9]">
                          <Icon className="w-3.5 h-3.5 text-[#8b949e]" />
                          <span className="font-medium">{meta.label}</span>
                        </div>
                        <span className="font-mono font-semibold text-white">{score}/100</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#21262d] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Executive Summary */}
          {review.summaryMarkdown && (
            <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Executive Review Summary</span>
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d] font-mono">
                  {review.filesCount || 1} file{(review.filesCount || 1) > 1 ? 's' : ''} evaluated
                </span>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <span className="text-[11px] text-[#8b949e] block">Critical Vulnerabilities</span>
                  <span className="text-sm font-bold text-rose-400 font-mono">
                    {review.issues.filter((i) => i.severity === 'CRITICAL').length}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <span className="text-[11px] text-[#8b949e] block">High Severity Bugs</span>
                  <span className="text-sm font-bold text-orange-400 font-mono">
                    {review.issues.filter((i) => i.severity === 'HIGH').length}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <span className="text-[11px] text-[#8b949e] block">Medium / Low Issues</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    {review.issues.filter((i) => ['MEDIUM', 'LOW'].includes(i.severity)).length}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <span className="text-[11px] text-[#8b949e] block">Quality Suggestions</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {review.issues.filter((i) => i.severity === 'INFO').length}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#c9d1d9] leading-relaxed bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d] space-y-1.5">
                {review.summaryMarkdown
                  .replace(/###\s*\??\s*/g, '')
                  .replace(/\?\?/g, '•')
                  .split('\n')
                  .filter((line) => line.trim().length > 0)
                  .map((line, idx) => (
                    <p key={idx} className={line.startsWith('-') || line.startsWith('•') ? 'pl-2 text-[#8b949e]' : 'text-white font-medium'}>
                      {line}
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* Inline Findings & Diff Viewer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Discovered Findings ({review.issues.length})</h3>
              <span className="text-xs text-[#8b949e]">Click 'Apply Fix' to auto-patch file</span>
            </div>

            {review.issues.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#161b22] border border-[#30363d] text-center text-[#8b949e]">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-white">Clean Pull Request!</p>
                <p className="text-xs mt-1">No security bugs or performance bottlenecks detected.</p>
              </div>
            ) : (
              <DiffViewer
                issues={review.issues}
                onApplyFix={onApplyFix}
                onDismissIssue={onDismissIssue}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
