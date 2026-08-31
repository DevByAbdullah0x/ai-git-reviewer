import React, { useState } from 'react';
import { ReviewIssue, SEVERITY_BADGES, CATEGORY_METADATA } from '@ai-reviewer/shared';
import {
  FileCode,
  Check,
  Copy,
  Wrench,
  XCircle,
} from 'lucide-react';

interface DiffViewerProps {
  issues: ReviewIssue[];
  onApplyFix?: (issueId: string) => Promise<void>;
  onDismissIssue?: (issueId: string) => Promise<void>;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  issues,
  onApplyFix,
  onDismissIssue,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Group issues by file
  const issuesByFile = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) acc[issue.file] = [];
    acc[issue.file].push(issue);
    return acc;
  }, {} as Record<string, ReviewIssue[]>);

  const handleCopy = (issueId: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(issueId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApply = async (issueId: string) => {
    if (!onApplyFix) return;
    setApplyingId(issueId);
    try {
      await onApplyFix(issueId);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(issuesByFile).map(([filePath, fileIssues]) => (
        <div
          key={filePath}
          className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm"
        >
          {/* File Header */}
          <div className="px-4 py-3 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <FileCode className="w-4 h-4 text-[#58a6ff]" />
              <span className="font-mono text-sm font-semibold text-white">{filePath}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {fileIssues.length} {fileIssues.length === 1 ? 'Finding' : 'Findings'}
              </span>
            </div>
          </div>

          {/* Issues in this file */}
          <div className="divide-y divide-[#30363d]">
            {fileIssues.map((issue) => {
              const badge = SEVERITY_BADGES[issue.severity];
              const categoryMeta = CATEGORY_METADATA[issue.category];

              return (
                <div
                  key={issue.id}
                  className={`p-5 transition-colors ${
                    issue.status === 'FIXED'
                      ? 'bg-emerald-950/20 opacity-75'
                      : issue.status === 'DISMISSED'
                      ? 'bg-zinc-900/40 opacity-50'
                      : 'hover:bg-[#21262d]/40'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Severity Badge */}
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold font-mono uppercase tracking-wider flex items-center space-x-1"
                          style={{
                            backgroundColor: `${badge.color}15`,
                            color: badge.color,
                            border: `1px solid ${badge.color}30`,
                          }}
                        >
                          <span>{badge.emoji}</span>
                          <span>{badge.label}</span>
                        </span>

                        {/* Category Tag */}
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                          {categoryMeta?.label || issue.category}
                        </span>

                        {/* Line Number */}
                        <span className="text-xs font-mono text-[#58a6ff] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          Line {issue.line}
                        </span>

                        {/* Status badge if fixed */}
                        {issue.status === 'FIXED' && (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Patch Applied</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-semibold text-white mt-2">{issue.title}</h4>
                      <p className="text-sm text-[#c9d1d9] leading-relaxed">{issue.explanation}</p>

                      {issue.impact && (
                        <div className="mt-2 text-xs text-[#f0883e] bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                          <strong className="font-semibold text-amber-300">💥 Impact: </strong>
                          {issue.impact}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 self-start mt-2 md:mt-0">
                      {issue.status === 'OPEN' && issue.suggestedFix && onApplyFix && (
                        <button
                          onClick={() => handleApply(issue.id)}
                          disabled={applyingId === issue.id}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{applyingId === issue.id ? 'Applying...' : 'Apply Fix'}</span>
                        </button>
                      )}

                      {issue.status === 'OPEN' && onDismissIssue && (
                        <button
                          onClick={() => onDismissIssue(issue.id)}
                          className="px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white rounded-lg text-xs font-medium border border-[#30363d] transition-all"
                          title="Dismiss finding"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Code Diff Comparison Block */}
                  {(issue.originalCode || issue.suggestedFix) && (
                    <div className="mt-4 rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117] text-xs font-mono">
                      {issue.originalCode && (
                        <div className="p-3 bg-rose-950/20 border-b border-[#30363d] text-rose-300 flex items-start space-x-3">
                          <span className="text-rose-500 select-none font-bold">-</span>
                          <code className="flex-1 whitespace-pre-wrap">{issue.originalCode}</code>
                        </div>
                      )}

                      {issue.suggestedFix && (
                        <div className="p-3 bg-emerald-950/20 text-emerald-300 flex items-start justify-between space-x-3">
                          <div className="flex items-start space-x-3 flex-1">
                            <span className="text-emerald-500 select-none font-bold">+</span>
                            <code className="flex-1 whitespace-pre-wrap">{issue.suggestedFix}</code>
                          </div>
                          <button
                            onClick={() => handleCopy(issue.id, issue.suggestedFix)}
                            className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white rounded border border-[#30363d] transition-all"
                            title="Copy suggested fix"
                          >
                            {copiedId === issue.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

