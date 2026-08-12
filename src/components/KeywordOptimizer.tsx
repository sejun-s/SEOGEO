import React, { useState } from 'react';
import type { AuditResult } from '../types';
import { Tag, X, Plus, Copy, Check, Target } from 'lucide-react';

interface Props {
  audit: AuditResult;
  keywords: string[];
  onAddKeyword: (kw: string) => void;
  onRemoveKeyword: (kw: string) => void;
}

function coverage(kw: string, signals: AuditResult['pageSignals']) {
  if (!signals) return { title: false, meta: false, heading: false };
  const k = kw.toLowerCase();
  return {
    title: signals.title.toLowerCase().includes(k),
    meta: signals.metaDescription.toLowerCase().includes(k),
    heading: [...signals.h1s, ...signals.h2s].some((h) => h.toLowerCase().includes(k)),
  };
}

function buildHtml(keywords: string[], signals: AuditResult['pageSignals']): string {
  if (!keywords.length) return '';
  const domain = signals?.url.replace(/^https?:\/\//, '').split('/')[0] ?? '';
  const top2 = keywords.slice(0, 2).join(' | ');
  const title = domain ? `${top2} - ${domain}` : top2;
  const desc = `${keywords.slice(0, 3).join(', ')} 전문 서비스. 지금 바로 확인하세요.`;
  const kwMeta = keywords.join(', ');
  return `<!-- HTML <head> 안에 붙여넣기 -->\n<title>${title}</title>\n<meta name="description" content="${desc}">\n<meta name="keywords" content="${kwMeta}">`;
}

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300">
        <span className="text-[11px] font-mono font-semibold text-slate-700">HTML — 복사 후 &lt;head&gt;에 붙여넣기</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre className="p-4 text-[12px] text-slate-900 font-mono overflow-x-auto leading-6 whitespace-pre-wrap bg-white selection:bg-blue-200">
        {code}
      </pre>
    </div>
  );
}

export const KeywordOptimizer: React.FC<Props> = ({ audit, keywords, onAddKeyword, onRemoveKeyword }) => {
  const [input, setInput] = useState('');
  const signals = audit.pageSignals;

  const commit = () => {
    const trimmed = input.trim().replace(/,$/, '');
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 10) {
      onAddKeyword(trimmed);
      setInput('');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    if (e.key === 'Backspace' && !input && keywords.length > 0) {
      onRemoveKeyword(keywords[keywords.length - 1]);
    }
  };

  const html = buildHtml(keywords, signals);

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-purple-400 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-white">타겟 검색어</div>
          <div className="text-[11px] text-slate-500">유입을 원하는 검색어를 추가하면 최적화 HTML을 생성합니다</div>
        </div>
      </div>

      {/* Tag input */}
      <div className="flex flex-wrap items-center gap-2 min-h-[40px] px-3 py-2 bg-slate-900/70 border border-white/10 rounded-xl focus-within:border-purple-500/50 transition-all">
        {keywords.map((kw) => {
          const cov = coverage(kw, signals);
          const hit = cov.title || cov.meta || cov.heading;
          return (
            <span
              key={kw}
              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                hit
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              }`}
            >
              <Tag className="w-2.5 h-2.5 opacity-60" />
              {kw}
              {hit && <span className="text-emerald-400 text-[9px] ml-0.5">✓</span>}
              <button onClick={() => onRemoveKeyword(kw)} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={keywords.length === 0 ? '검색어 입력 후 Enter  예: AI SEO 분석, 검색엔진최적화' : '검색어 추가...'}
          className="flex-1 min-w-[160px] bg-transparent text-xs text-white placeholder-slate-600 outline-none"
        />
        {input && (
          <button onClick={commit} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> 추가
          </button>
        )}
      </div>

      {keywords.length > 0 && (
        <>
          {/* Coverage table */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-500 font-medium px-1">현재 페이지 키워드 포함 여부</div>
            <div className="grid gap-1">
              {keywords.map((kw) => {
                const cov = coverage(kw, signals);
                const Cell = ({ ok }: { ok: boolean }) => (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>
                    {ok ? '✓' : '—'}
                  </span>
                );
                return (
                  <div key={kw} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/6">
                    <span className="text-[11px] text-slate-300 flex-1 truncate font-medium">{kw}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-600">Title</span>
                        <Cell ok={cov.title} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-600">Meta</span>
                        <Cell ok={cov.meta} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-600">H1/H2</span>
                        <Cell ok={cov.heading} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generated HTML */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-500 font-medium px-1">키워드 최적화 HTML 생성</div>
            <CopyBlock code={html} />
          </div>
        </>
      )}
    </div>
  );
};
