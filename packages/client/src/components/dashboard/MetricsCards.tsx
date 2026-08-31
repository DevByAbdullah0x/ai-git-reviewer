import React from 'react';
import { MetricsSummary } from '@ai-reviewer/shared';
import { GitPullRequest, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

interface MetricsCardsProps {
  metrics: MetricsSummary;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  const cards = [
    {
      title: 'Total PRs Reviewed',
      value: metrics.totalReviews,
      icon: GitPullRequest,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      description: 'Automated PR inspections',
    },
    {
      title: 'Critical Vulnerabilities',
      value: metrics.criticalIssuesCount,
      icon: AlertOctagon,
      iconColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      description: 'Zero-tolerance security blocks',
    },
    {
      title: 'Avg Health Score',
      value: `${metrics.avgHealthScore}/100`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      description: 'Codebase quality index',
    },
    {
      title: 'Total Findings',
      value: metrics.totalIssuesDetected,
      icon: ShieldAlert,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      description: 'Actionable suggestions & fixes',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm hover:border-[#484f58] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white tracking-tight">{card.value}</span>
            </div>
            <p className="mt-1 text-xs text-[#8b949e]">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
};

