import React from 'react';
import { GitPullRequest, Code2, Sliders, Play, Sparkles } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'playground' | 'rules';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  aiProvider: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  aiProvider,
}) => {
  return (
    <header className="border-b border-[#30363d] bg-[#161b22]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <img
              src="/logo.png"
              alt="AI Git Reviewer Logo"
              className="w-10 h-10 rounded-xl object-contain shadow-md shadow-indigo-500/20 hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-white tracking-tight">AI Git Reviewer</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-[#8b949e]">automated code review, powered by AI</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 pl-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#21262d] text-white shadow-sm border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]/50'
              }`}
            >
              <GitPullRequest className="w-4 h-4 text-emerald-400" />
              <span>Reviews & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'playground'
                  ? 'bg-[#21262d] text-white shadow-sm border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]/50'
              }`}
            >
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>Diff Playground</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'rules'
                  ? 'bg-[#21262d] text-white shadow-sm border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]/50'
              }`}
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Rules & Settings</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-lg bg-[#21262d] border border-[#30363d] text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[#8b949e]">Engine:</span>
            <span className="font-mono font-semibold text-emerald-400 uppercase">{aiProvider || 'MOCK'}</span>
          </div>

          <button
            onClick={() => setActiveTab('playground')}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            title="Inspect a raw Git diff or GitHub PR URL"
          >
            <Play className="w-4 h-4 fill-current text-white" />
            <span>Review Diff / PR</span>
          </button>
        </div>
      </div>
    </header>
  );
};
