import React, { useState } from 'react';
import { Search, Sparkles, Loader2, BarChart3 } from 'lucide-react';

type TopTab = 'seo-geo' | 'geo-monitoring';

interface HeaderProps {
  onScanUrl: (url: string) => void;
  isScanning: boolean;
  topTab: TopTab;
  onTopTabChange: (tab: TopTab) => void;
}

const TOP_TABS: { id: TopTab; label: string; soon?: boolean }[] = [
  { id: 'seo-geo',        label: 'SEO·GEO 분석' },
  { id: 'geo-monitoring', label: 'GEO 모니터링' },
];

export const Header: React.FC<HeaderProps> = ({ onScanUrl, isScanning, topTab, onTopTabChange }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isScanning) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    // URL 분석 시작 시 SEO·GEO 분석 탭으로 이동
    onTopTabChange('seo-geo');
    onScanUrl(normalized);
    setUrl('');
  };

  return (
    <header className="v03-header sticky top-0 z-40">
      <div className="px-4 py-0">
        <div className="flex items-stretch gap-0 max-w-full">

          {/* ── 왼쪽: 최상단 탭 ── */}
          <nav className="flex items-end gap-0 shrink-0">
            {TOP_TABS.map(({ id, label, soon }) => (
              <button
                key={id}
                onClick={() => onTopTabChange(id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
                  topTab === id
                    ? 'border-[#4f6df5] text-[#1b2559]'
                    : 'border-transparent text-[#737c9c] hover:text-[#1b2559] hover:border-[#dce6e9]'
                }`}
              >
                {id === 'geo-monitoring' && <BarChart3 className="w-3.5 h-3.5" />}
                {label}
                {soon && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700/60 border border-white/10 text-slate-600 font-bold leading-none">
                    준비 중
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* ── 구분선 ── */}
          <div className="w-px bg-white/8 mx-3 my-2 self-stretch" />

          {/* ── 오른쪽: URL 분석하기 입력폼 ── */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="URL 분석하기  (예: yourstore.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isScanning}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isScanning || !url.trim()}
              className="btn-purple px-4 py-2 text-sm shrink-0"
            >
              {isScanning
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />
              }
              <span className="hidden sm:inline">{isScanning ? '분석 중...' : 'URL 분석하기'}</span>
            </button>
          </form>

        </div>
      </div>
    </header>
  );
};
