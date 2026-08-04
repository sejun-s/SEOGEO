import React, { useState } from 'react';
import type { AuditResult, MetricItem } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Zap, Sparkles, Filter, ArrowUpRight } from 'lucide-react';

interface AnalysisSummaryTableProps {
  audit: AuditResult;
  onToggleFix: (metricId: string) => void;
}

export const AnalysisSummaryTable: React.FC<AnalysisSummaryTableProps> = ({ audit, onToggleFix }) => {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  const filteredMetrics = audit.metrics.filter((m) => {
    if (filter === 'unresolved') return !m.isResolved;
    if (filter === 'resolved') return m.isResolved;
    return true;
  });

  const resolvedCount = audit.metrics.filter((m) => m.isResolved).length;
  const totalCount = audit.metrics.length;

  const getCategoryBadge = (category: MetricItem['category']) => {
    switch (category) {
      case 'technical':
        return <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono text-[10px]">Technical SEO</span>;
      case 'chatgpt':
        return <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono text-[10px]">OpenAI ChatGPT Search</span>;
      case 'geo':
        return <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono text-[10px]">arXiv GEO 학술</span>;
      case 'schema':
        return <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono text-[10px]">Schema.org @graph</span>;
      case 'eeat':
        return <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60 font-mono text-[10px]">Google E-E-A-T</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">General</span>;
    }
  };

  return (
    <div className="glass-card p-5 border-indigo-500/30 space-y-4">
      {/* Table Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">분석 결과 정밀 종합 리포트</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono border border-indigo-800/60">
              총 {totalCount}개 진단 항목 (완료 {resolvedCount}개)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            원클릭 [개선 적용] 버튼을 누르면 실시간으로 항목이 반영되며 종합 점수가 상승합니다.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 px-2 flex items-center gap-1 font-mono">
            <Filter className="w-3 h-3" /> 필터:
          </span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              filter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            전체 ({totalCount})
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              filter === 'unresolved' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            미해결 ({totalCount - resolvedCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              filter === 'resolved' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            조치 완료 ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Neat Item List / Table Rows */}
      <div className="space-y-3">
        {filteredMetrics.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              item.isResolved
                ? 'bg-emerald-950/15 border-emerald-500/30'
                : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            {/* Left: Status, Category, Title & Recommendation */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {item.isResolved ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 조치 완료
                  </span>
                ) : item.status === 'fail' ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> 시급한 수정 필요
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 권장 개선 항목
                  </span>
                )}

                {getCategoryBadge(item.category)}

                {item.referenceDoc && (
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                    ({item.referenceDoc})
                  </span>
                )}
              </div>

              <div className="font-bold text-sm text-slate-100">
                {item.title}
              </div>

              <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-indigo-300 font-semibold">💡 조치 방법: </span>
                {item.recommendation}
              </div>
            </div>

            {/* Right: Score Boost & One-Click Fix Action Button */}
            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-mono">가산 점수</div>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  +{item.scoreBoost}점
                </div>
              </div>

              <button
                onClick={() => onToggleFix(item.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                  item.isResolved
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${item.isResolved ? 'text-slate-400' : 'text-yellow-300'}`} />
                {item.isResolved ? '개선 상태 원복' : `원클릭 개선 적용 (+${item.scoreBoost}점)`}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
