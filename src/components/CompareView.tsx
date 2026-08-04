import React from 'react';
import type { AuditResult, CriteriaItem } from '../types';
import { ArrowRight, CheckCircle2, MessageSquareText, Star, TrendingDown, TrendingUp, X } from 'lucide-react';

const CATEGORIES = [
  { key: 'technicalScore', category: 'technical', label: 'Technical SEO' },
  { key: 'chatGptSearchScore', category: 'chatgpt', label: 'ChatGPT Search' },
  { key: 'academicGeoScore', category: 'geo', label: '학술 GEO' },
  { key: 'eeatScore', category: 'eeat', label: 'E-E-A-T' },
  { key: 'schemaScore', category: 'schema', label: 'Schema.org' },
  { key: 'bingScore', category: 'bing', label: 'Bing & AEO' },
] as const;

const PRIORITY_ORDER: Record<CriteriaItem['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 };

function scoreTone(score: number) {
  return score >= 85 ? 'text-emerald-700' : score >= 70 ? 'text-amber-700' : 'text-rose-700';
}

function domain(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function firstAction(item?: CriteriaItem) {
  if (!item) return '세부 평가 항목을 확인하고 낮은 점수의 기준부터 개선하세요.';
  return item.improvement.split('\n').map(line => line.replace(/^\s*[①②③④⑤⑥\d.\-)]+\s*/, '').trim()).find(Boolean)
    ?? item.improvement;
}

function topIssue(audit: AuditResult, category: string) {
  return (audit.criteria ?? [])
    .filter(item => item.category === category && item.status !== 'pass')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.score - b.score)[0];
}

interface Props {
  audits: AuditResult[];
  onClose: () => void;
  myCompanyUrl?: string | null;
}

export const CompareView: React.FC<Props> = ({ audits, onClose, myCompanyUrl }) => {
  const myCompanyAudit = myCompanyUrl ? audits.find(audit => audit.url === myCompanyUrl) : undefined;
  const baseline = myCompanyAudit ?? audits[0];
  const isMyCompanyMode = !!myCompanyAudit;

  const priorities = CATEGORIES
    .map(category => {
      const myScore = baseline[category.key] as number;
      const bestCompetitor = audits
        .filter(audit => audit.url !== baseline.url)
        .sort((a, b) => (b[category.key] as number) - (a[category.key] as number))[0];
      const competitorScore = bestCompetitor ? bestCompetitor[category.key] as number : myScore;
      return { ...category, gap: competitorScore - myScore, issue: topIssue(baseline, category.category) };
    })
    .filter(item => item.gap > 0 || item.issue)
    .sort((a, b) => b.gap - a.gap || (a.issue?.score ?? 100) - (b.issue?.score ?? 100))
    .slice(0, 3);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="glass-card p-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">사이트 비교분석</h2>
            {isMyCompanyMode && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 flex items-center gap-1 font-bold">
                <Star className="w-3 h-3 fill-blue-700 text-blue-700" /> 우리 회사 기준
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">점수 차이, 원인, 실행할 작업을 항목별로 비교합니다.</p>
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-all">
          <X className="w-3.5 h-3.5" /> 닫기
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${audits.length}, minmax(0, 1fr))` }}>
        {audits.map(audit => {
          const isMe = audit.url === baseline.url;
          const delta = audit.overallScore - baseline.overallScore;
          return (
            <div key={audit.url} className={`glass-card p-4 ${isMe ? 'ring-2 ring-blue-700/20' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-600 uppercase">{isMe ? (isMyCompanyMode ? '우리 회사' : '비교 기준') : '비교 사이트'}</div>
                  <div className="text-sm font-bold text-slate-900 truncate mt-1">{audit.title || domain(audit.url)}</div>
                  <div className="text-[10px] text-slate-600 font-mono truncate mt-1">{domain(audit.url)}</div>
                </div>
                <div className={`text-3xl font-black font-mono ${scoreTone(audit.overallScore)}`}>{audit.overallScore}</div>
              </div>
              {!isMe && (
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  {delta > 0 ? <TrendingUp className="w-4 h-4 text-rose-700" /> : <TrendingDown className="w-4 h-4 text-emerald-700" />}
                  기준 사이트보다 {Math.abs(delta)}점 {delta > 0 ? '높음' : delta < 0 ? '낮음' : '동일'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {priorities.length > 0 && (
        <section className="glass-card p-5">
          <div className="text-xs font-extrabold text-slate-900 mb-3">먼저 개선할 항목</div>
          <div className="grid gap-2 md:grid-cols-3">
            {priorities.map((item, index) => (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="text-[10px] font-bold text-blue-800">우선순위 {index + 1}</div>
                <div className="text-sm font-extrabold text-slate-900 mt-1">{item.label}</div>
                <div className="text-[11px] text-slate-700 leading-relaxed mt-2">{firstAction(item.issue)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="px-1">
          <h3 className="text-base font-extrabold text-slate-900">항목별 상세 비교</h3>
          <p className="text-xs text-slate-600 mt-1">각 항목에서 누가 앞서는지와 실제 조치사항을 함께 확인하세요.</p>
        </div>

        {CATEGORIES.map(({ key, category, label }, index) => {
          const scores = audits.map(audit => audit[key] as number);
          const bestScore = Math.max(...scores);
          const baselineScore = baseline[key] as number;
          const leader = audits[scores.indexOf(bestScore)];
          const gap = bestScore - baselineScore;
          const issue = topIssue(baseline, category);
          const isLeading = baselineScore === bestScore;

          return (
            <article key={key} className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-black grid place-items-center">{index + 1}</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{label}</h4>
                    <p className="text-[10px] text-slate-600 mt-0.5">최고 점수 {bestScore}점 · {domain(leader.url)}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${isLeading ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : gap >= 15 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  {isLeading ? '우위·공동 선두' : gap >= 15 ? `열세 -${gap}` : `근소 열세 -${gap}`}
                </span>
              </div>

              <div className="px-5 py-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${audits.length}, minmax(0, 1fr))` }}>
                {audits.map(audit => {
                  const score = audit[key] as number;
                  return (
                    <div key={audit.url} className={`rounded-xl border p-3 ${audit.url === baseline.url ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-700 truncate">{audit.url === baseline.url ? '기준 사이트' : domain(audit.url)}</span>
                        <strong className={`text-lg font-black font-mono ${scoreTone(score)}`}>{score}</strong>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2"><div className="h-full bg-blue-800 rounded-full" style={{ width: `${score}%` }} /></div>
                    </div>
                  );
                })}
              </div>

              <div className="mx-5 mb-5 rounded-xl border border-slate-300 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-300 flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <MessageSquareText className="w-4 h-4 text-blue-800" /> 비교 코멘트
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[13px] text-slate-800 leading-6">
                    {isLeading
                      ? issue
                        ? `${label}은 비교 사이트보다 앞서지만 자체 평가 기준에서는 ‘${issue.name}’ 항목이 남아 있습니다. 상대적 우위와 별개로 이 항목을 보완해야 합니다.`
                        : `${label}은 현재 비교 사이트 중 가장 높은 수준이며 주요 세부 기준도 충족하고 있습니다.`
                      : `${domain(leader.url)}이 기준 사이트보다 ${gap}점 높습니다. ${issue ? `기준 사이트의 주요 문제는 ‘${issue.name}’ 항목입니다.` : '세부 평가 기준의 충족 여부를 다시 확인해야 합니다.'}`}
                  </p>
                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-3">
                    {isLeading ? <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" /> : <ArrowRight className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />}
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-900">{isLeading ? (issue ? '추가 개선' : '유지할 내용') : '지금 해야 할 일'}</div>
                      <p className="text-xs text-slate-800 leading-5 mt-1">{isLeading && !issue ? '현재 설정을 유지하고 정기적으로 재검사하세요.' : firstAction(issue)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
