import React, { useEffect, useState } from 'react';
import type { AuditResult } from '../types';
import { ExternalLink, Info } from 'lucide-react';
import { EligibilityBanner } from './StatusBadge';

interface ScoreOverviewProps {
  audit: AuditResult;
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    setVal(0);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function RadialScore({ score, size = 116, strokeWidth = 9 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';
  const glowColor = score >= 80 ? 'rgba(52,211,153,0.3)' : score >= 60 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

const CATEGORIES = [
  { key: 'technicalScore',     label: 'Technical SEO',  color: 'bg-blue-500',    dot: 'bg-blue-400' },
  { key: 'chatGptSearchScore', label: 'ChatGPT Search', color: 'bg-emerald-500', dot: 'bg-emerald-400' },
  { key: 'academicGeoScore',   label: 'GEO',            color: 'bg-purple-500',  dot: 'bg-purple-400' },
  { key: 'eeatScore',          label: 'E-E-A-T',        color: 'bg-teal-500',    dot: 'bg-teal-400' },
  { key: 'schemaScore',        label: 'Schema.org',     color: 'bg-cyan-500',    dot: 'bg-cyan-400' },
  { key: 'bingScore',          label: 'Bing / AEO',     color: 'bg-pink-500',    dot: 'bg-pink-400' },
] as const;

function gradeOf(score: number) {
  if (score >= 90) return { label: 'S', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' };
  if (score >= 80) return { label: 'A', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' };
  if (score >= 65) return { label: 'B', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
  if (score >= 50) return { label: 'C', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/25' };
  return { label: 'D', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/25' };
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ audit }) => {
  const animatedScore = useCountUp(audit.overallScore);
  const overallColor = audit.overallScore >= 80 ? 'text-emerald-400' : audit.overallScore >= 60 ? 'text-amber-400' : 'text-rose-400';
  const grade = gradeOf(audit.overallScore);
  const eligibility = audit.searchEligibility;

  return (
    <div className="glass-card p-5 space-y-5">
      {/* 검색 자격 게이트 — fail/warning 시 이유 상단 즉시 노출 (Block 4) */}
      {eligibility && eligibility.status !== 'pass' && (
        <div className="space-y-2">
          <EligibilityBanner
            status={eligibility.status}
            detail={
              eligibility.checks
                .filter(c => c.status !== 'pass')
                .map(c => c.detail || c.label)
                .join(' · ') || '검색 자격 확인 필요'
            }
          />
          <div className="text-[10px] text-amber-300/80 pl-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>
              <strong>검색 자격 주의 이유:</strong>{' '}
              {eligibility.checks
                .filter(c => c.status !== 'pass')
                .map(c => `${c.label}(${c.detail || '검토 필요'})`)
                .join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* v2 신규 대표 점수 (SEO Foundation / AI Citation / AI Visibility) */}
      {(audit.seoFoundationScore != null || audit.aiCitationReadinessScore != null) ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">대표 진단 모델 (v2.0)</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
                Official Standard
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {new Date(audit.lastScanned).toLocaleString('ko-KR')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. SEO Foundation */}
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">1. SEO Foundation</div>
                <div className="text-[11px] text-slate-400">검색엔진 색인 및 크롤링 기본기</div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className={`text-3xl font-black font-mono ${audit.seoFoundationScore != null && audit.seoFoundationScore >= 70 ? 'text-emerald-400' : (audit.seoFoundationScore ?? 0) >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {audit.seoFoundationScore ?? 0}
                  <span className="text-xs text-slate-500 font-normal ml-0.5">/ 100</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">기반 점수</span>
              </div>
            </div>

            {/* 2. AI Citation Readiness */}
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">2. AI Citation Readiness</div>
                <div className="text-[11px] text-slate-400">생성형 AI 인용 준비도 (정적 추정)</div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className={`text-3xl font-black font-mono ${audit.aiCitationReadinessScore != null && audit.aiCitationReadinessScore >= 70 ? 'text-emerald-400' : (audit.aiCitationReadinessScore ?? 0) >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {audit.aiCitationReadinessScore ?? 0}
                  <span className="text-xs text-slate-500 font-normal ml-0.5">/ 100</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">인용 대기</span>
              </div>
            </div>

            {/* 3. AI Visibility */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">3. AI Visibility</div>
                <div className="text-[11px] text-slate-400">실제 AI 답변 노출 모니터링</div>
              </div>
              <div className="mt-2">
                <div className="text-[11px] text-slate-400 bg-white/5 p-2 rounded border border-white/5">
                  아직 실제 AI 질문 모니터링을 실행하지 않았습니다.
                </div>
                {audit.measurementConfidence && (
                  <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between">
                    <span>측정 신뢰도:</span>
                    <span className="font-semibold text-slate-300">
                      {audit.measurementConfidence === 'high' ? '높음' : audit.measurementConfidence === 'medium' ? '보통' : '낮음'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 메타/도메인 정보 및 Legacy 참고 점수 소형 노출 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 mt-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-white truncate leading-tight">{audit.title}</h2>
              <a href={audit.url} target="_blank" rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 font-mono mt-0.5 w-fit">
                {audit.url.replace(/^https?:\/\//, '')}<ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            {/* 기존 구형 종합 점수 (Legacy Score) 참고용 작게 표시 */}
            <div className="flex items-center gap-3 shrink-0 border-l border-white/10 pl-4">
              <div className="text-right">
                <div className="text-[9px] text-slate-500 font-mono uppercase">Legacy Ref.</div>
                <div className="text-[10px] text-slate-400">구형 가중합산</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-bold font-mono ${overallColor}`}>{animatedScore}점</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${grade.cls}`}>{grade.label}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 기존 렌더링 유지 */
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate leading-tight">{audit.title}</h2>
            <a href={audit.url} target="_blank" rel="noreferrer"
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 font-mono mt-0.5 w-fit">
              {audit.url.replace(/^https?:\/\//, '')}<ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="relative flex items-center justify-center">
              <RadialScore score={audit.overallScore} size={100} strokeWidth={8} />
              <div className="absolute text-center">
                <div className={`text-3xl font-black font-mono leading-none ${overallColor}`}>{animatedScore}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 구분선 */}
      <div className="border-t border-white/6" />

      {/* 6개 카테고리 점수 바 */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        {CATEGORIES.map(({ key, label, color, dot }) => {
          const score = audit[key] as number;
          const textColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400';
          return (
            <div key={key} className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0 opacity-70`} />
              <span className="text-[11px] text-slate-500 w-[88px] shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full opacity-75 transition-all duration-1000`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`text-[11px] font-mono font-bold w-6 text-right shrink-0 ${textColor}`}>{score}</span>
            </div>
          );
        })}
      </div>

      {/* 점수 면책 고지 (Block 2 — required_copy.score_disclaimer) */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/2 border border-white/6">
        <Info className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-600 leading-relaxed">
          이 결과는 Google 또는 AI 서비스의 내부 랭킹 점수가 아닙니다. 공개된 공식 지침, 웹 표준, 연구 결과와 현재 확인 가능한 데이터를 기반으로 계산한 자체 준비도 지표입니다. 현재 결과는 분석한 페이지와 확인 가능한 공개 데이터만을 기준으로 합니다.
        </p>
      </div>
    </div>
  );
};
