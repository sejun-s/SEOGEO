import React from 'react';
import type { AuditResult } from '../types';
import { X, Star, TrendingUp, TrendingDown } from 'lucide-react';

const CATEGORIES = [
  { key: 'technicalScore',     label: 'Technical SEO',  color: 'bg-blue-500' },
  { key: 'chatGptSearchScore', label: 'ChatGPT Search', color: 'bg-emerald-500' },
  { key: 'academicGeoScore',   label: '학술 GEO',        color: 'bg-purple-500' },
  { key: 'eeatScore',          label: 'E-E-A-T',         color: 'bg-teal-500' },
  { key: 'schemaScore',        label: 'Schema.org',      color: 'bg-cyan-500' },
  { key: 'bingScore',          label: 'Bing & AEO',      color: 'bg-pink-500' },
] as const;

function scoreCls(score: number) {
  return score >= 85 ? 'text-emerald-300' : score >= 70 ? 'text-amber-300' : 'text-rose-300';
}

interface Props {
  audits: AuditResult[];
  onClose: () => void;
  myCompanyUrl?: string | null;
}

export const CompareView: React.FC<Props> = ({ audits, onClose, myCompanyUrl }) => {
  const myCompanyAudit = myCompanyUrl ? audits.find(a => a.url === myCompanyUrl) : null;
  const isMyCompanyMode = !!myCompanyAudit;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">비교 분석</span>
            {isMyCompanyMode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                우리 회사 기준
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isMyCompanyMode
              ? `우리 회사 vs 경쟁사 ${audits.length - 1}개 비교`
              : `${audits.length}개 사이트 SEO 점수 비교`}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-all"
        >
          <X className="w-3 h-3" /> 닫기
        </button>
      </div>

      {/* Score cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${audits.length}, minmax(0, 1fr))` }}>
        {audits.map((audit) => {
          const isMe = audit.url === myCompanyUrl;
          return (
            <div
              key={audit.url}
              className={`glass-card p-4 text-center space-y-2 ${
                isMe ? 'ring-1 ring-amber-500/40' : ''
              }`}
            >
              {isMe ? (
                <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-semibold">
                  <Star className="w-3 h-3 fill-amber-400" /> 우리 회사
                </div>
              ) : isMyCompanyMode ? (
                <div className="text-[10px] text-slate-500 font-medium">경쟁사</div>
              ) : null}
              <div className="text-[10px] text-slate-500 font-mono truncate">
                {audit.url.replace(/^https?:\/\//, '')}
              </div>
              <div className="text-xs text-slate-400 truncate font-medium">{audit.title}</div>
              <div className={`text-4xl font-black mt-2 ${scoreCls(audit.overallScore)}`}>
                {audit.overallScore}
              </div>
              <div className="text-[10px] text-slate-600">종합 점수</div>
              {/* vs my company delta */}
              {isMyCompanyMode && !isMe && myCompanyAudit && (() => {
                const delta = audit.overallScore - myCompanyAudit.overallScore;
                return delta !== 0 ? (
                  <div className={`text-[11px] font-semibold flex items-center justify-center gap-0.5 ${
                    delta > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {delta > 0
                      ? <><TrendingUp className="w-3 h-3" /> +{delta} 앞서있음</>
                      : <><TrendingDown className="w-3 h-3" /> {delta} 뒤처짐</>
                    }
                  </div>
                ) : null;
              })()}
            </div>
          );
        })}
      </div>

      {/* Category comparison */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <span className="text-xs font-semibold text-slate-300">카테고리별 점수 비교</span>
        </div>
        <div className="divide-y divide-white/5">
          {CATEGORIES.map(({ key, label, color }) => {
            const scores = audits.map(a => a[key] as number);
            const myScore = myCompanyAudit ? myCompanyAudit[key] as number : null;

            return (
              <div
                key={key}
                className="px-4 py-3 grid gap-3"
                style={{ gridTemplateColumns: `120px repeat(${audits.length}, minmax(0, 1fr))` }}
              >
                <div className="text-[11px] text-slate-500 self-center">{label}</div>
                {audits.map((audit, i) => {
                  const score = scores[i];
                  const isMe = audit.url === myCompanyUrl;
                  let barColor: string = color;
                  if (isMyCompanyMode && !isMe && myScore !== null) {
                    barColor = score > myScore ? 'bg-rose-500' : score < myScore ? 'bg-emerald-600' : 'bg-white/20';
                  } else if (isMyCompanyMode && isMe) {
                    barColor = color;
                  } else if (!isMyCompanyMode) {
                    const maxScore = Math.max(...scores);
                    barColor = score === maxScore ? color : 'bg-white/20';
                  }

                  return (
                    <div key={audit.url} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`text-xs font-mono font-bold w-8 text-right ${
                        isMyCompanyMode && !isMe && myScore !== null
                          ? score > myScore ? 'text-rose-400' : score < myScore ? 'text-emerald-400' : 'text-slate-400'
                          : 'text-white'
                      }`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom section — my company mode vs neutral */}
      {isMyCompanyMode && myCompanyAudit ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${audits.filter(a => a.url !== myCompanyUrl).length}, minmax(0, 1fr))` }}>
          {audits.filter(a => a.url !== myCompanyUrl).map((competitor) => {
            const gaps = CATEGORIES
              .filter(({ key }) => (competitor[key] as number) > (myCompanyAudit[key] as number))
              .map(({ label, key }) => ({ label, diff: (competitor[key] as number) - (myCompanyAudit[key] as number) }))
              .sort((a, b) => b.diff - a.diff);
            const strengths = CATEGORIES
              .filter(({ key }) => (myCompanyAudit[key] as number) > (competitor[key] as number))
              .map(({ label, key }) => ({ label, diff: (myCompanyAudit[key] as number) - (competitor[key] as number) }))
              .sort((a, b) => b.diff - a.diff);

            return (
              <div key={competitor.url} className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8 text-[10px] text-slate-500 font-mono truncate">
                  vs {competitor.url.replace(/^https?:\/\//, '')}
                </div>
                {gaps.length > 0 && (
                  <div className="px-4 pt-3 pb-2">
                    <div className="text-[11px] font-semibold text-rose-400 mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> 경쟁사가 앞서는 항목
                    </div>
                    {gaps.map(({ label, diff }) => (
                      <div key={label} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-rose-400 font-mono font-bold">+{diff}</span>
                      </div>
                    ))}
                  </div>
                )}
                {strengths.length > 0 && (
                  <div className="px-4 pt-2 pb-3 border-t border-white/5">
                    <div className="text-[11px] font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> 우리가 앞서는 항목
                    </div>
                    {strengths.map(({ label, diff }) => (
                      <div key={label} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-emerald-400 font-mono font-bold">+{diff}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Neutral mode — critical issues */
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8">
            <span className="text-xs font-semibold text-slate-300">즉시 개선 필요 항목</span>
          </div>
          <div className="grid divide-x divide-white/5" style={{ gridTemplateColumns: `repeat(${audits.length}, minmax(0, 1fr))` }}>
            {audits.map((audit) => {
              const critical = (audit.criteria ?? []).filter(c => c.priority === 'critical' && c.status !== 'pass').slice(0, 4);
              return (
                <div key={audit.url} className="p-4 space-y-2">
                  <div className="text-[10px] text-slate-500 font-mono truncate mb-2">
                    {audit.url.replace(/^https?:\/\//, '')}
                  </div>
                  {critical.length === 0 ? (
                    <div className="text-[11px] text-emerald-400">즉시 개선 항목 없음</div>
                  ) : (
                    critical.map(item => (
                      <div key={item.id} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                        <span className="leading-relaxed">[{item.name}]</span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
