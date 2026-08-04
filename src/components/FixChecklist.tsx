import React, { useState } from 'react';
import type { AuditResult, CriteriaItem } from '../types';
import { CheckSquare, Square, RefreshCw, Sparkles, Copy, Check, ListChecks } from 'lucide-react';

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  critical: { label: '즉시', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  high:     { label: '높음', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  medium:   { label: '중간', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  low:      { label: '낮음', cls: 'bg-slate-600/20 text-slate-400 border-slate-500/20' },
};

const CATEGORY_LABEL: Record<string, string> = {
  technical: 'Technical', chatgpt: 'ChatGPT', geo: 'GEO',
  eeat: 'E-E-A-T', schema: 'Schema', bing: 'Bing/AEO',
};

function CodeSnippet({ code, codeType }: { code: string; codeType?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(code).then(() => {
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  });
  const label = codeType === 'robots' ? 'robots.txt' : codeType === 'json' ? 'JSON-LD' : 'HTML';
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300">
        <span className="text-[10px] font-mono font-semibold text-slate-700 uppercase tracking-wider">{label} — 복사 후 붙여넣기</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 transition-all">
          {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre className="p-4 text-[12px] font-mono text-slate-900 overflow-x-auto whitespace-pre-wrap leading-6 bg-white selection:bg-blue-200">
        {code}
      </pre>
    </div>
  );
}

interface Props {
  audit: AuditResult;
  onReanalyze: (url: string) => void;
  isScanning: boolean;
}

export const FixChecklist: React.FC<Props> = ({ audit, onReanalyze, isScanning }) => {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const items: CriteriaItem[] = (audit.criteria ?? [])
    .filter((c) => c.status !== 'pass')
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]));

  if (items.length === 0) return null;

  const toggle = (id: string) => setChecked((p) => {
    const s = new Set(p);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });
  const toggleExpand = (id: string) => setExpanded((p) => {
    const s = new Set(p);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  const doneCount = checked.size;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListChecks className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">개선 액션</div>
            <div className="text-[11px] text-slate-500 mt-0.5">중요한 문제부터 수정하고 바로 재검사하세요</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono">
            <span className={doneCount > 0 ? 'text-emerald-400 font-bold' : 'text-slate-600'}>{doneCount}</span>
            <span className="text-slate-700">/{items.length}</span>
          </span>
          {doneCount > 0 && (
            <button
              onClick={() => onReanalyze(audit.url)}
              disabled={isScanning}
              className="btn-purple text-xs px-3 py-1.5 gap-1.5 !rounded-xl"
            >
              {isScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {doneCount}개 검증
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {doneCount > 0 && (
          <div className="text-[10px] text-emerald-500 text-right font-mono">{pct}% 완료</div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((item) => {
          const done = checked.has(item.id);
          const open = expanded.has(item.id);
          const p = PRIORITY_LABEL[item.priority];
          const impactText = `예상 +${item.estimatedScoreGain}점`;
          return (
            <div
              key={item.id}
              id={`checklist-${item.id}`}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                done ? 'border-emerald-500/20 bg-emerald-500/4' : 'border-white/8 bg-white/3 hover:border-white/12'
              }`}
            >
              {/* Row */}
              <div className="flex items-start gap-3 px-3.5 py-3">
                <button
                  onClick={() => toggle(item.id)}
                  className={`mt-0.5 shrink-0 transition-colors ${done ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  {done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[12px] font-medium transition-all ${done ? 'line-through text-slate-600' : 'text-slate-100'}`}>
                      {item.name}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${p.cls}`}>{p.label}</span>
                    <span className="text-[9px] text-slate-600 font-mono">{CATEGORY_LABEL[item.category]}</span>
                    <span className="text-[9px] text-purple-400/80 font-mono">{impactText}</span>
                  </div>

                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-[11px] text-left transition-colors text-slate-600 hover:text-slate-400"
                  >
                    {open
                      ? '▾ 접기'
                      : `▸ ${item.improvement.split('\n')[0].replace(/^①\s*/, '').slice(0, 60)}${item.improvement.length > 60 ? '…' : ''}`}
                  </button>
                </div>
              </div>

              {/* Expandable content — CSS grid trick for smooth animation */}
              <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="px-3.5 pb-3 pt-0 border-t border-white/6 space-y-2">
                    <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line pt-2.5">{item.improvement}</p>
                    {item.codeSnippet && <CodeSnippet code={item.codeSnippet} codeType={item.codeType} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
