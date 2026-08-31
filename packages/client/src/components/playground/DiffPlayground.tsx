import React, { useState } from 'react';
import { ReviewResult } from '@ai-reviewer/shared';
import { api } from '../../services/api';
import { DiffViewer } from '../diff-viewer/DiffViewer';
import {
  Code2,
  Sparkles,
  GitPullRequest,
  AlertCircle,
  Sliders,
} from 'lucide-react';

const PRESETS = {
  sqli_and_secret: {
    title: '🔴 Critical SQL Injection & Exposed AWS Key',
    diff: `diff --git a/src/controllers/user.controller.ts b/src/controllers/user.controller.ts
index 1234567..89abcdef 100644
--- a/src/controllers/user.controller.ts
+++ b/src/controllers/user.controller.ts
@@ -10,12 +10,18 @@ export async function getUserProfile(req: Request, res: Response) {
   const userId = req.body.userId;
+  const awsKey = "AKIAIOSFODNN7EXAMPLE";
+  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
+  const result = await db.query(query);
+  const token = Math.random().toString();
+  res.json({ user: result, token, awsKey });
 }`,
  },
  n_plus_one: {
    title: '🟡 N+1 Query & Inefficient Iteration',
    diff: `diff --git a/src/services/order.service.ts b/src/services/order.service.ts
index 2345678..9abcdef0 100644
--- a/src/services/order.service.ts
+++ b/src/services/order.service.ts
@@ -20,8 +20,12 @@ export async function getOrderSummaries(orderIds: string[]) {
+  const orders = [];
+  for (const id of orderIds) {
+    const order = await db.orders.findById(id);
+    orders.push(order);
+  }
+  const totals = orders.filter(o => o.status === 'PAID').map(o => o.total);
+  return totals;
 }`,
  },
  clean_code: {
    title: '🟢 Clean & Well-Typed Implementation',
    diff: `diff --git a/src/utils/math.ts b/src/utils/math.ts
index 3456789..abcdef1 100644
--- a/src/utils/math.ts
+++ b/src/utils/math.ts
@@ -1,5 +1,10 @@
+export function calculateDiscount(price: number, discountPercentage: number): number {
+  if (price < 0 || discountPercentage < 0 || discountPercentage > 100) {
+    throw new Error('Invalid price or discount percentage');
+  }
+  return Number((price * (1 - discountPercentage / 100)).toFixed(2));
+}`,
  },
};

export const DiffPlayground: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'diff' | 'prUrl'>('diff');
  const [diffInput, setDiffInput] = useState(PRESETS.sqli_and_secret.diff);
  const [prUrlInput, setPrUrlInput] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeMode === 'diff') {
        const res = await api.testDiff({
          diff: diffInput,
          customInstructions: customInstructions.trim() || undefined,
        });
        setReviewResult(res);
      } else {
        if (!prUrlInput.trim()) {
          setError('Please provide a valid GitHub PR URL (e.g. https://github.com/owner/repo/pull/1)');
          setLoading(false);
          return;
        }
        const res = await api.testPR(prUrlInput.trim());
        setReviewResult(res);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = async (issueId: string) => {
    if (!reviewResult) return;
    await api.applyFix(reviewResult.id, issueId);
    setReviewResult({
      ...reviewResult,
      issues: reviewResult.issues.map((i) => (i.id === issueId ? { ...i, status: 'FIXED' } : i)),
    });
  };

  const handleDismissIssue = async (issueId: string) => {
    if (!reviewResult) return;
    await api.dismissIssue(reviewResult.id, issueId);
    setReviewResult({
      ...reviewResult,
      issues: reviewResult.issues.map((i) => (i.id === issueId ? { ...i, status: 'DISMISSED' } : i)),
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Playground Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Interactive Review Playground</h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Paste any Git Diff or test a public GitHub Pull Request URL to run deterministic static analysis + structured AI review in real time.
        </p>
      </div>

      {/* Mode Switcher & Presets */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 p-1 bg-[#0d1117] rounded-xl border border-[#30363d] w-fit">
            <button
              onClick={() => setActiveMode('diff')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'diff'
                  ? 'bg-[#21262d] text-white shadow-sm border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Raw Git Diff</span>
            </button>
            <button
              onClick={() => setActiveMode('prUrl')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'prUrl'
                  ? 'bg-[#21262d] text-white shadow-sm border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public PR URL</span>
            </button>
          </div>

          {activeMode === 'diff' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#8b949e]">Presets:</span>
              <button
                onClick={() => setDiffInput(PRESETS.sqli_and_secret.diff)}
                className="px-2.5 py-1 rounded-lg text-xs bg-[#21262d] hover:bg-[#30363d] text-rose-400 border border-rose-500/20 font-medium transition-all"
              >
                SQLi + Secret
              </button>
              <button
                onClick={() => setDiffInput(PRESETS.n_plus_one.diff)}
                className="px-2.5 py-1 rounded-lg text-xs bg-[#21262d] hover:bg-[#30363d] text-amber-400 border border-amber-500/20 font-medium transition-all"
              >
                N+1 Query
              </button>
              <button
                onClick={() => setDiffInput(PRESETS.clean_code.diff)}
                className="px-2.5 py-1 rounded-lg text-xs bg-[#21262d] hover:bg-[#30363d] text-emerald-400 border border-emerald-500/20 font-medium transition-all"
              >
                Clean Code
              </button>
            </div>
          )}
        </div>

        {/* Input Area */}
        {activeMode === 'diff' ? (
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-2">
              Unified Diff Input
            </label>
            <textarea
              value={diffInput}
              onChange={(e) => setDiffInput(e.target.value)}
              rows={10}
              placeholder="Paste git diff here..."
              className="w-full p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-2">
              GitHub Pull Request URL
            </label>
            <input
              type="url"
              value={prUrlInput}
              onChange={(e) => setPrUrlInput(e.target.value)}
              placeholder="https://github.com/facebook/react/pull/1234"
              className="w-full p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-sm text-[#c9d1d9] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        )}

        {/* Custom Guidelines Option */}
        <div>
          <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-2 flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Custom Project Guidelines / Prompt Rules (Optional)</span>
          </label>
          <input
            type="text"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Enforce Zod validation on inputs; require strict TypeScript typing"
            className="w-full p-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          {error && (
            <div className="text-xs text-rose-400 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="ml-auto">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Analyzing Diff with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Analyze Diff</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Review Results */}
      {reviewResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Result Score Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Review Complete
                </span>
                <span className="text-xs font-mono text-[#8b949e]">ID: {reviewResult.id}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{reviewResult.prTitle}</h3>
              <p className="text-sm text-[#8b949e] whitespace-pre-wrap">{reviewResult.summaryMarkdown}</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-xs text-[#8b949e] uppercase font-semibold mb-1">Health Score</div>
                <div className={`px-4 py-2 rounded-xl text-2xl font-bold font-mono border ${
                  reviewResult.overallScore >= 85
                    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                    : reviewResult.overallScore >= 65
                    ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                    : 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                }`}>
                  {reviewResult.overallScore}/100
                </div>
              </div>
            </div>
          </div>

          {/* Inline Findings */}
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-white">Discovered Findings ({reviewResult.issues.length})</h4>
            <DiffViewer
              issues={reviewResult.issues}
              onApplyFix={handleApplyFix}
              onDismissIssue={handleDismissIssue}
            />
          </div>
        </div>
      )}
    </div>
  );
};

