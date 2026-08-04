import type { AuditResult } from '../types';
import { AlertTriangle, CheckCircle2, Clock3, Files, Gauge, Info } from 'lucide-react';

export function SiteCrawlPanel({ audit }: { audit: AuditResult }) {
  const crawl = audit.siteCrawl;
  if (!crawl) return null;

  const scoreColor = crawl.healthScore >= 90
    ? 'text-emerald-400'
    : crawl.healthScore >= 70
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <section className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Gauge className="w-4 h-4 text-cyan-400" /> 사이트 전체 Health
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sitemap과 내부 링크를 따라 탐색한 실측 결과입니다.</p>
        </div>
        <div className={`text-3xl font-black ${scoreColor}`}>{crawl.healthScore}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
        {[
          { label: '분석 페이지', value: crawl.scannedPages, icon: Files, color: 'text-cyan-400' },
          { label: '정상 페이지', value: crawl.healthyPages, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: '오류', value: crawl.errorCount, icon: AlertTriangle, color: 'text-rose-400' },
          { label: '소요 시간', value: `${(crawl.durationMs / 1000).toFixed(1)}초`, icon: Clock3, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-950/50 px-4 py-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Icon className={`w-3 h-3 ${color}`} />{label}</div>
            <div className="text-lg font-bold text-white mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-2">
        {crawl.issues.length === 0 ? (
          <div className="text-xs text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> 주요 사이트 전체 오류를 찾지 못했습니다.</div>
        ) : crawl.issues.slice(0, 8).map(issue => (
          <div key={issue.id} className="rounded-lg border border-white/7 bg-white/3 px-3 py-2.5 flex items-start gap-3">
            {issue.severity === 'error'
              ? <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              : <Info className={`w-4 h-4 mt-0.5 shrink-0 ${issue.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'}`} />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-200">{issue.title}</span>
                <span className="text-[10px] font-mono text-slate-500">{issue.count}페이지</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{issue.recommendation}</p>
            </div>
          </div>
        ))}
        {crawl.truncated && (
          <p className="text-[10px] text-slate-600 pt-1">성능 보호를 위해 최대 {crawl.limits.maxPages}페이지 또는 제한 시간에서 탐색을 종료했습니다.</p>
        )}
      </div>
    </section>
  );
}
