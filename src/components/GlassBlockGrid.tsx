import React from 'react';
import type { AuditResult, DetailTabType } from '../types';
import { ArrowRight } from 'lucide-react';

interface GlassBlockGridProps {
  audit: AuditResult;
  onSelectDetailTab: (tab: DetailTabType) => void;
  /** 표시할 카테고리 ID 목록. 생략 시 전체 표시 */
  filterIds?: DetailTabType[];
}

const BLOCKS: {
  id: DetailTabType;
  title: string;
  subtitle: string;
  scoreKey: keyof AuditResult;
  accent: string;
  bar: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'technical', title: 'Technical SEO', subtitle: 'Google/Bing 기술 가이드 준수',
    scoreKey: 'technicalScore', accent: 'text-blue-400', bar: 'bg-blue-500',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg>,
  },
  {
    id: 'chatgpt', title: 'ChatGPT Search', subtitle: 'OAI-SearchBot 접근 · Citation 준비도',
    scoreKey: 'chatGptSearchScore', accent: 'text-emerald-400', bar: 'bg-emerald-500',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  },
  {
    id: 'geo', title: 'GEO (AI 인용 최적화)', subtitle: 'arXiv:2311.09735 기반 9대 지수',
    scoreKey: 'academicGeoScore', accent: 'text-purple-400', bar: 'bg-purple-500',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  },
  {
    id: 'eeat', title: 'E-E-A-T', subtitle: '전문성 · 경험 · 권위성 · 신뢰도',
    scoreKey: 'eeatScore', accent: 'text-teal-400', bar: 'bg-teal-500',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    id: 'schema', title: 'Schema.org', subtitle: 'JSON-LD · @graph · sameAs 엔티티',
    scoreKey: 'schemaScore', accent: 'text-cyan-400', bar: 'bg-cyan-500',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>,
  },
  {
    id: 'cms', title: 'Bing / AEO', subtitle: 'IndexNow · Copilot · Perplexity 준비',
    scoreKey: 'bingScore', accent: 'text-pink-400', bar: 'bg-pink-500',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
];

type PrevScores = NonNullable<AuditResult['previousCategoryScores']>;

export const GlassBlockGrid: React.FC<GlassBlockGridProps> = ({ audit, onSelectDetailTab, filterIds }) => {
  const visibleBlocks = filterIds ? BLOCKS.filter(b => filterIds.includes(b.id)) : BLOCKS;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleBlocks.map((block) => {
          const score = audit[block.scoreKey] as number;
          const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400';
          const categoryCriteria = audit.criteria?.filter((c) => c.category === block.id) ?? [];
          const topIssue = categoryCriteria.find((c) => c.status !== 'pass');

          // 이전 스캔 대비 델타
          const prevScore = audit.previousCategoryScores?.[block.scoreKey as keyof PrevScores];
          const delta = prevScore !== undefined ? Math.round(score - prevScore) : null;

          return (
            <button
              key={block.id}
              onClick={() => onSelectDetailTab(block.id)}
              className="glass-card p-4 text-left flex flex-col gap-3 hover:border-white/20 transition-all group"
            >
              {/* 헤더: 아이콘 + 제목 + 점수 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`${block.accent}`}>{block.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{block.title}</div>
                    <div className="text-[10px] text-slate-500">{block.subtitle}</div>
                  </div>
                </div>
                {/* 점수 + 델타 뱃지 */}
                <div className="flex items-end gap-1 shrink-0">
                  <span className={`text-xl font-black font-mono ${scoreColor}`}>{score}</span>
                  {delta !== null && delta !== 0 && (
                    <span
                      title={`이전 스캔 대비 ${delta > 0 ? '+' : ''}${delta}점`}
                      className={`text-[10px] font-bold mb-0.5 leading-none ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {delta > 0 ? `+${delta}` : `${delta}`}
                    </span>
                  )}
                </div>
              </div>

              {/* 점수 바 */}
              <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full ${block.bar} opacity-60 rounded-full transition-all duration-700`}
                  style={{ width: `${score}%` }} />
              </div>

              {/* 주요 개선 항목 */}
              {topIssue ? (
                <div className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  <span className="text-amber-400 font-medium">→ </span>{topIssue.improvement}
                </div>
              ) : (
                <div className="text-[11px] text-slate-600">개선 항목 없음</div>
              )}

              {/* 상세 보기 링크 */}
              <div className={`flex items-center gap-1 text-[11px] ${block.accent} opacity-0 group-hover:opacity-100 transition-opacity mt-auto`}>
                <span>상세 분석 보기</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

