import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { MetricsSummary, SEVERITY_BADGES, CATEGORY_METADATA, IssueSeverity, IssueCategory } from '@ai-reviewer/shared';

interface AnalyticsChartsProps {
  metrics: MetricsSummary;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ metrics }) => {
  if (metrics.totalIssuesDetected === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#161b22] border border-[#30363d] text-center text-[#8b949e]">
        <h3 className="text-sm font-semibold text-white mb-1">Live Analytics & Quality Radar</h3>
        <p className="text-xs">No Pull Requests reviewed yet. Once PRs are opened or analyzed, real-time severity and category breakdowns will render here.</p>
      </div>
    );
  }

  const severityData = (Object.keys(metrics.severityDistribution) as IssueSeverity[]).map((sev) => ({
    name: SEVERITY_BADGES[sev].label,
    count: metrics.severityDistribution[sev] || 0,
    color: SEVERITY_BADGES[sev].color,
  }));

  const categoryData = (Object.keys(metrics.categoryDistribution) as IssueCategory[]).map((cat) => ({
    name: CATEGORY_METADATA[cat].label,
    count: metrics.categoryDistribution[cat] || 0,
    color:
      cat === 'SECURITY'
        ? '#ef4444'
        : cat === 'BUG'
        ? '#f97316'
        : cat === 'PERFORMANCE'
        ? '#eab308'
        : cat === 'CODE_QUALITY'
        ? '#3b82f6'
        : '#10b981',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Severity Breakdown */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Issues by Severity</h3>
          <span className="text-xs text-[#8b949e]">Weighted risk breakdown</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#8b949e" fontSize={12} tickLine={false} />
              <YAxis stroke="#8b949e" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#21262d',
                  borderColor: '#30363d',
                  borderRadius: '8px',
                  color: '#c9d1d9',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Category Distribution</h3>
          <span className="text-xs text-[#8b949e]">Multi-dimensional analysis</span>
        </div>
        <div className="h-64 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                paddingAngle={4}
                label={({ name, count }) => (count > 0 ? `${name}: ${count}` : '')}
                labelLine={false}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`pie-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#21262d',
                  borderColor: '#30363d',
                  borderRadius: '8px',
                  color: '#c9d1d9',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

