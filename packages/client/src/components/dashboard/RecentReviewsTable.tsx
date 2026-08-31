import React from 'react';
import { ReviewResult } from '@ai-reviewer/shared';
import { GitPullRequest, ChevronRight, CheckCircle2, AlertTriangle, AlertOctagon, Trash2 } from 'lucide-react';

interface RecentReviewsTableProps {
  reviews: ReviewResult[];
  onSelectReview: (review: ReviewResult) => void;
  onClearReviews?: () => void;
}

export const RecentReviewsTable: React.FC<RecentReviewsTableProps> = ({ reviews, onSelectReview, onClearReviews }) => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Recent Pull Request Reviews</h3>
          <p className="text-xs text-[#8b949e]">Click any pull request to inspect inline AI comments and apply code patches</p>
        </div>
        <div className="flex items-center space-x-2">
          {reviews.length > 0 && onClearReviews && (
            <button
              onClick={onClearReviews}
              className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
              title="Clear all logged reviews"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
            {reviews.length} Reviews
          </span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="p-12 text-center text-[#8b949e]">
          <GitPullRequest className="w-12 h-12 mx-auto text-[#30363d] mb-3" />
          <p className="text-sm font-medium text-white">No Pull Requests reviewed yet</p>
          <p className="text-xs mt-1">Open a Pull Request on any repository where the GitHub App is installed, or test a PR on-demand in the Diff Playground!</p>
        </div>
      ) : (
        <div className="divide-y divide-[#30363d]">
          {reviews.map((review) => {
            const criticalCount = review.issues.filter((i) => i.severity === 'CRITICAL').length;
            const highCount = review.issues.filter((i) => i.severity === 'HIGH').length;
            const otherCount = review.issues.filter((i) => !['CRITICAL', 'HIGH'].includes(i.severity)).length;

            const scoreColor =
              review.overallScore >= 85
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : review.overallScore >= 65
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

            return (
              <div
                key={review.id}
                onClick={() => onSelectReview(review)}
                className="p-4 sm:px-6 hover:bg-[#21262d]/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="mt-1">
                    <div className="w-8 h-8 rounded-lg bg-[#21262d] flex items-center justify-center border border-[#30363d]">
                      <GitPullRequest className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-white hover:text-emerald-400 transition-colors">
                        {review.prTitle}
                      </span>
                      <span className="text-xs font-mono text-[#8b949e]">#{review.prNumber}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#8b949e]">
                      <span className="font-mono text-[#58a6ff]">{review.repoOwner}/{review.repoName}</span>
                      <span>•</span>
                      <span>by <span className="text-[#c9d1d9]">{review.author}</span></span>
                      <span>•</span>
                      <span>{new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-center">
                  {/* Issue Severity Badges */}
                  <div className="flex items-center space-x-1.5">
                    {criticalCount > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
                        <AlertOctagon className="w-3 h-3" />
                        <span>{criticalCount} Critical</span>
                      </span>
                    )}
                    {highCount > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{highCount} High</span>
                      </span>
                    )}
                    {otherCount > 0 && criticalCount === 0 && highCount === 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {otherCount} Findings
                      </span>
                    )}
                    {review.issues.length === 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Clean PR</span>
                      </span>
                    )}
                  </div>

                  {/* Health Score Pill */}
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${scoreColor}`}>
                    {review.overallScore}/100
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#8b949e]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

