import React, { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';

interface HeaderProps {
  onScanUrl: (url: string) => void;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onScanUrl, isScanning }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isScanning) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    onScanUrl(normalized);
    setUrl('');
  };

  return (
    <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-40">
      <div className="px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="다른 URL 분석하기"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isScanning}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all disabled:opacity-50"
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
            <span className="hidden sm:inline">{isScanning ? '분석 중...' : '분석'}</span>
          </button>
        </form>
      </div>
    </header>
  );
};
