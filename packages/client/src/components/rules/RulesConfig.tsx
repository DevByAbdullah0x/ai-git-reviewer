import React, { useState, useEffect } from 'react';
import { RepositoryConfig, ISSUE_CATEGORIES, ISSUE_SEVERITIES, IssueCategory, IssueSeverity, CATEGORY_METADATA } from '@ai-reviewer/shared';
import { api } from '../../services/api';
import { Save, Check, GitBranch, Terminal, RefreshCw, Github, Plus, ExternalLink, Trash2 } from 'lucide-react';

interface RulesConfigProps {
  onRepositoriesChanged?: () => void;
}

export const RulesConfig: React.FC<RulesConfigProps> = ({ onRepositoriesChanged }) => {
  const [repos, setRepos] = useState<RepositoryConfig[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepositoryConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    try {
      const data = await api.getRepositories();
      setRepos(data);
      if (data.length > 0 && !selectedRepo) {
        setSelectedRepo(data[0]);
      }
    } catch (err) {
      console.error('Failed to load repositories', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.syncRepositories();
      setRepos(res.repositories);
      if (res.repositories.length > 0) {
        setSelectedRepo(res.repositories[0]);
      }
      onRepositoriesChanged?.();
      if (res.syncedCount > 0) {
        setSyncMessage(`Successfully synced ${res.syncedCount} repositories from GitHub App!`);
      } else {
        setSyncMessage(`GitHub App has not been installed on any repositories yet. Click "Install on GitHub" to select repositories.`);
      }
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      console.error('Sync failed', err);
      setSyncMessage(err.response?.data?.error || 'Failed to sync with GitHub App.');
      setTimeout(() => setSyncMessage(null), 6000);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoInput.trim() || !newRepoInput.includes('/')) return;

    try {
      const created = await api.createRepository(newRepoInput.trim());
      setRepos([...repos, created]);
      setSelectedRepo(created);
      setNewRepoInput('');
      setSyncMessage(`Added repository ${created.fullName}!`);
      onRepositoriesChanged?.();
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to add repository', err);
      setSyncMessage(err.response?.data?.error || 'Failed to add repository.');
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleDeleteRepo = async (id: string, fullName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${fullName} from AI Reviewer?`)) return;
    setDeleting(true);
    try {
      const res = await api.deleteRepository(id);
      const remaining = res.repositories;
      setRepos(remaining);
      setSelectedRepo(remaining.length > 0 ? remaining[0] : null);
      setSyncMessage(`Removed repository ${fullName}`);
      onRepositoriesChanged?.();
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete repository', err);
      setSyncMessage(err.response?.data?.error || 'Failed to delete repository.');
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRepo) return;
    setSaving(true);
    try {
      const updated = await api.updateRepository(selectedRepo.id, selectedRepo);
      setSelectedRepo(updated);
      setSavedSuccess(true);
      onRepositoriesChanged?.();
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update repository', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: IssueCategory) => {
    if (!selectedRepo) return;
    const current = selectedRepo.enabledCategories;
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    setSelectedRepo({ ...selectedRepo, enabledCategories: next });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Review Rules & Repository Policies</h1>
          <p className="text-sm text-[#8b949e] mt-1">
            Configure automated PR inspection criteria, custom AI prompt guidelines, and merge block thresholds per repository.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="https://github.com/settings/apps"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-white rounded-xl text-xs font-medium border border-[#30363d] transition-all"
          >
            <span>Install on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-white rounded-xl text-xs font-semibold border border-[#30363d] shadow-sm transition-all disabled:opacity-50"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Github className="w-4 h-4 text-emerald-400" />
            )}
            <span>{syncing ? 'Syncing...' : 'Sync GitHub Repos'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{syncMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Repository List Sidebar */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#8b949e] uppercase block mb-1">
              Add New Repository
            </label>
            <form onSubmit={handleAddRepo} className="flex space-x-1.5">
              <input
                type="text"
                value={newRepoInput}
                onChange={(e) => setNewRepoInput(e.target.value)}
                placeholder="owner/repo-name"
                className="w-full p-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newRepoInput.includes('/')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-all flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#8b949e] uppercase block mb-1">
              Configured Repositories ({repos.length})
            </label>
            <div className="space-y-1.5">
              {repos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    selectedRepo?.id === repo.id
                      ? 'bg-[#21262d] border-emerald-500/50 text-white shadow-sm'
                      : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58]'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-sm font-semibold text-white truncate">{repo.fullName}</div>
                    <div className="text-xs text-[#8b949e] flex items-center space-x-1 mt-0.5">
                      <GitBranch className="w-3 h-3" />
                      <span>{repo.strictness} Mode</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        {selectedRepo ? (
          <div className="md:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
              <div>
                <h3 className="text-base font-bold text-white">{selectedRepo.fullName}</h3>
                <span className="text-xs text-[#8b949e]">Repository Rule Settings</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDeleteRepo(selectedRepo.id, selectedRepo.fullName)}
                  disabled={deleting}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  title="Remove this repository from AI Reviewer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Threshold & Strictness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#8b949e] uppercase block mb-1.5">
                  Minimum Severity to Block PR
                </label>
                <select
                  value={selectedRepo.minimumSeverityToBlock}
                  onChange={(e) =>
                    setSelectedRepo({
                      ...selectedRepo,
                      minimumSeverityToBlock: e.target.value as IssueSeverity,
                    })
                  }
                  className="w-full p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {ISSUE_SEVERITIES.map((sev) => (
                    <option key={sev} value={sev}>
                      {sev}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b949e] uppercase block mb-1.5">
                  Review Strictness
                </label>
                <select
                  value={selectedRepo.strictness}
                  onChange={(e) =>
                    setSelectedRepo({
                      ...selectedRepo,
                      strictness: e.target.value as 'PERMISSIVE' | 'STANDARD' | 'STRICT',
                    })
                  }
                  className="w-full p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="PERMISSIVE">Permissive (Critical vulnerabilities only)</option>
                  <option value="STANDARD">Standard (Balanced code quality & security)</option>
                  <option value="STRICT">Strict (Zero tolerance & thorough best practices)</option>
                </select>
              </div>
            </div>

            {/* Enabled Categories */}
            <div>
              <label className="text-xs font-semibold text-[#8b949e] uppercase block mb-2">
                Active Review Categories
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ISSUE_CATEGORIES.map((cat) => {
                  const active = selectedRepo.enabledCategories.includes(cat);
                  const meta = CATEGORY_METADATA[cat];

                  return (
                    <div
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start space-x-2.5 ${
                        active
                          ? 'bg-[#21262d] border-emerald-500/40 text-white'
                          : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {}}
                        className="mt-0.5 accent-emerald-500 rounded"
                      />
                      <div>
                        <div className="text-xs font-semibold">{meta.label}</div>
                        <div className="text-[11px] text-[#8b949e] leading-snug mt-0.5">{meta.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Prompt Instructions */}
            <div>
              <label className="text-xs font-semibold text-[#8b949e] uppercase block mb-1.5 flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Custom AI Guidelines & Conventions</span>
              </label>
              <textarea
                value={selectedRepo.customInstructions || ''}
                onChange={(e) =>
                  setSelectedRepo({ ...selectedRepo, customInstructions: e.target.value })
                }
                rows={4}
                placeholder="e.g. Always use parameterized Knex queries. Never allow raw string concatenation in SQL. Enforce strict error handling in async Express route handlers."
                className="w-full p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-[#30363d] space-y-2 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer text-[#c9d1d9]">
                <input
                  type="checkbox"
                  checked={selectedRepo.postInlineComments}
                  onChange={(e) =>
                    setSelectedRepo({ ...selectedRepo, postInlineComments: e.target.checked })
                  }
                  className="accent-emerald-500 rounded"
                />
                <span>Post inline review comments directly onto changed diff lines</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-[#c9d1d9]">
                <input
                  type="checkbox"
                  checked={selectedRepo.postSummaryComment}
                  onChange={(e) =>
                    setSelectedRepo({ ...selectedRepo, postSummaryComment: e.target.checked })
                  }
                  className="accent-emerald-500 rounded"
                />
                <span>Post top-level Pull Request executive summary with Health Score badge</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 p-12 text-center text-[#8b949e] bg-[#161b22] border border-[#30363d] rounded-2xl">
            <p>Select or add a repository to configure its review policies.</p>
          </div>
        )}
      </div>
    </div>
  );
};
