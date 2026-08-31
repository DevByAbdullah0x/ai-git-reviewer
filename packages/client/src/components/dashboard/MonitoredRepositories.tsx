import React, { useState } from 'react';
import { RepositoryConfig, ReviewResult } from '@ai-reviewer/shared';
import { GitBranch, Shield, Play, Settings, Plus, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface MonitoredRepositoriesProps {
  repositories: RepositoryConfig[];
  onReviewCompleted: (review: ReviewResult) => void;
  onNavigateToSettings: () => void;
}

export const MonitoredRepositories: React.FC<MonitoredRepositoriesProps> = ({
  repositories,
  onReviewCompleted,
  onNavigateToSettings,
}) => {
  const [selectedRepoId, setSelectedRepoId] = useState<string>(repositories[0]?.id || '');
  const [prNumberInput, setPrNumberInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRunReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId || !prNumberInput.trim()) return;

    const num = parseInt(prNumberInput.trim(), 10);
    if (isNaN(num) || num <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid Pull Request number (e.g. 1)' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await api.runRepositoryReview(selectedRepoId, num);
      if (res.review) {
        setStatusMsg({ type: 'success', text: `Successfully reviewed PR #${num} for ${res.review.repoOwner}/${res.review.repoName}!` });
        onReviewCompleted(res.review);
        setPrNumberInput('');
      }
    } catch (err: any) {
      console.error('Failed to run review', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.error || `Failed to review PR #${num}. Check if the PR exists on GitHub.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Monitored Repositories ({repositories.length})</span>
          </h3>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Active repositories linked with automated PR inspection & branch protection rules.
          </p>
        </div>

        <button
          onClick={onNavigateToSettings}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white rounded-lg text-xs font-medium border border-[#30363d] transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add / Manage Repositories</span>
        </button>
      </div>

      {repositories.length === 0 ? (
        <div className="p-8 text-center text-[#8b949e] bg-[#0d1117] border border-[#30363d] rounded-lg">
          <p className="text-sm font-medium text-white">No repositories connected yet</p>
          <p className="text-xs mt-1">Add your GitHub repositories or sync from GitHub App to start automated reviews.</p>
          <button
            onClick={onNavigateToSettings}
            className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Connect Repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Active Repos List */}
          <div className="lg:col-span-2 space-y-2">
            {repositories.map((repo) => {
              const isSelected = (selectedRepoId || repositories[0]?.id) === repo.id;

              return (
                <div
                  key={repo.id}
                  onClick={() => setSelectedRepoId(repo.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#21262d] border-emerald-500/50 shadow-sm'
                      : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{repo.fullName}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {repo.strictness}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-[#8b949e] mt-1">
                      <span className="flex items-center space-x-1">
                        <GitBranch className="w-3 h-3 text-[#58a6ff]" />
                        <span>Block on: <strong className="text-[#c9d1d9]">{repo.minimumSeverityToBlock}</strong></span>
                      </span>
                      <span>•</span>
                      <span>{repo.enabledCategories.length} categories active</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToSettings();
                      }}
                      className="p-1.5 rounded-lg bg-[#161b22] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] transition-all"
                      title="Edit Repository Rules"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Review Form */}
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-emerald-400 fill-current" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Review Open PR</h4>
            </div>

            <p className="text-xs text-[#8b949e] leading-snug">
              Inspect an active Pull Request on your selected repository on demand.
            </p>

            <form onSubmit={handleRunReview} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#8b949e] uppercase block mb-1">
                  Selected Repo
                </label>
                <select
                  value={selectedRepoId || repositories[0]?.id}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {repositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8b949e] uppercase block mb-1">
                  PR Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={prNumberInput}
                  onChange={(e) => setPrNumberInput(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !prNumberInput.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Analyzing Diff & Issues...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-white" />
                    <span>Run Full AI Review</span>
                  </>
                )}
              </button>
            </form>

            {statusMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start space-x-1.5 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

