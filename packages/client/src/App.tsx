import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { MetricsCards } from './components/dashboard/MetricsCards';
import { AnalyticsCharts } from './components/dashboard/AnalyticsCharts';
import { MonitoredRepositories } from './components/dashboard/MonitoredRepositories';
import { RecentReviewsTable } from './components/dashboard/RecentReviewsTable';
import { PRDetailModal } from './components/pr-viewer/PRDetailModal';
import { DiffPlayground } from './components/playground/DiffPlayground';
import { RulesConfig } from './components/rules/RulesConfig';
import { api } from './services/api';
import { MetricsSummary, ReviewResult, RepositoryConfig } from '@ai-reviewer/shared';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [repositories, setRepositories] = useState<RepositoryConfig[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewResult | null>(null);
  const [healthInfo, setHealthInfo] = useState<{ aiProvider: string } | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [m, h, r] = await Promise.all([
        api.getMetrics(),
        api.getHealth(),
        api.getRepositories(),
      ]);
      setMetrics(m);
      setHealthInfo(h);
      setRepositories(r);
    } catch (err) {
      console.error('Failed to load initial data', err);
    }
  };

  const handleApplyFix = async (issueId: string) => {
    if (!selectedReview) return;
    await api.applyFix(selectedReview.id, issueId);
    setSelectedReview({
      ...selectedReview,
      issues: selectedReview.issues.map((i) => (i.id === issueId ? { ...i, status: 'FIXED' } : i)),
    });
    loadData();
  };

  const handleDismissIssue = async (issueId: string) => {
    if (!selectedReview) return;
    await api.dismissIssue(selectedReview.id, issueId);
    setSelectedReview({
      ...selectedReview,
      issues: selectedReview.issues.map((i) => (i.id === issueId ? { ...i, status: 'DISMISSED' } : i)),
    });
    loadData();
  };

  const handleClearReviews = async () => {
    if (!window.confirm('Are you sure you want to clear all review logs?')) return;
    try {
      await api.clearReviews();
      await loadData();
      setBannerNotice('All review logs cleared.');
      setTimeout(() => setBannerNotice(null), 3000);
    } catch (err) {
      console.error('Failed to clear reviews', err);
    }
  };

  const handleReviewCompleted = (review: ReviewResult) => {
    loadData();
    setSelectedReview(review);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aiProvider={healthInfo?.aiProvider || 'mock'}
      />

      {bannerNotice && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 px-4 py-2.5 text-center text-xs font-semibold flex items-center justify-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{bannerNotice}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && metrics && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Pull Request Intelligence</h1>
                <p className="text-sm text-[#8b949e] mt-1">
                  Automated code review metrics, severity breakdown, and live GitHub PR audit logs.
                </p>
              </div>

              <button
                onClick={loadData}
                className="flex items-center space-x-2 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-white border border-[#30363d] rounded-lg text-xs font-medium transition-all self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Stats</span>
              </button>
            </div>

            <MetricsCards metrics={metrics} />

            <MonitoredRepositories
              repositories={repositories}
              onReviewCompleted={handleReviewCompleted}
              onNavigateToSettings={() => setActiveTab('rules')}
            />

            <AnalyticsCharts metrics={metrics} />

            <RecentReviewsTable
              reviews={metrics.recentReviews}
              onSelectReview={(rev) => setSelectedReview(rev)}
              onClearReviews={handleClearReviews}
            />
          </div>
        )}

        {activeTab === 'playground' && <DiffPlayground />}

        {activeTab === 'rules' && <RulesConfig onRepositoriesChanged={loadData} />}
      </main>

      {/* PR Detail Modal */}
      {selectedReview && (
        <PRDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onApplyFix={handleApplyFix}
          onDismissIssue={handleDismissIssue}
        />
      )}

      <footer className="border-t border-[#30363d] py-6 text-center text-xs text-[#8b949e]">
        <p>AI Git Reviewer — Automated PR Security & Quality Engine</p>
      </footer>
    </div>
  );
};
