import React, { useEffect, useRef } from 'react';
import type { AnalysisEvent, PageSignals } from '../types';
import { Terminal, CheckCircle, AlertCircle, Info, Database } from 'lucide-react';

interface AnalysisLogProps {
  events: AnalysisEvent[];
  signals: PageSignals | null;
  isScanning: boolean;
}

function SignalRow({ label, value, good }: { label: string; value: string | number | boolean; good?: boolean }) {
  const isGood = good === undefined ? undefined : Boolean(good);
  return (
    <div className="flex items-start gap-2 py-1 border-b border-white/5 last:border-0">
      <span className="text-slate-500 text-[11px] w-28 shrink-0">{label}</span>
      <span className={`text-[11px] font-mono break-all ${
        isGood === true ? 'text-emerald-400' :
        isGood === false ? 'text-rose-400' :
        'text-slate-300'
      }`}>{String(value) || '—'}</span>
    </div>
  );
}

export const AnalysisLog: React.FC<AnalysisLogProps> = ({ events, signals, isScanning }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  if (events.length === 0 && !signals) return null;

  const steps = events.filter(e => e.type === 'step');

  return (
    <div className="space-y-4">
      {/* 실시간 로그 */}
      {steps.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-white">분석 로그</span>
            {isScanning && (
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                진행 중
              </span>
            )}
            {!isScanning && steps.length > 0 && (
              <span className="ml-auto text-[10px] text-emerald-400">완료</span>
            )}
          </div>
          <div
            ref={logRef}
            className="p-3 space-y-1.5 max-h-52 overflow-y-auto font-mono text-[11px]"
          >
            {steps.map((e, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-600 shrink-0 tabular-nums">
                  {new Date(e.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {e.level === 'success'
                  ? <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  : e.level === 'warn'
                  ? <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  : <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                }
                <span className={
                  e.level === 'success' ? 'text-slate-200' :
                  e.level === 'warn' ? 'text-amber-300' :
                  'text-slate-400'
                }>{e.msg}</span>
              </div>
            ))}
            {isScanning && (
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-slate-600">——</span>
                <span className="animate-pulse">대기 중...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 실측 데이터 패널 */}
      {signals && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">실측 데이터</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">
              HTTP {signals.statusCode} · {signals.responseTime}ms
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            {/* 기본 */}
            <div>
              <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">기본 정보</div>
              <SignalRow label="HTTPS" value={signals.isHttps ? '✅ 적용됨' : '❌ 없음'} good={signals.isHttps} />
              <SignalRow label="HTTP 상태" value={signals.statusCode} good={signals.statusCode === 200} />
              <SignalRow label="응답 시간" value={`${signals.responseTime}ms`} good={signals.responseTime < 3000} />
              <SignalRow label="단어 수" value={`${signals.wordCount}개`} good={signals.wordCount > 500} />
              <SignalRow label="내부 링크" value={`${signals.internalLinks}개`} />
              <SignalRow label="외부 링크" value={`${signals.externalLinks}개`} />
              <SignalRow label="이미지" value={`${signals.imageCount}개 (alt: ${signals.imagesWithAlt}개)`} />
            </div>

            {/* 메타 */}
            <div>
              <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">메타 태그</div>
              <SignalRow label="Title" value={signals.title ? `"${signals.title.slice(0, 45)}${signals.title.length > 45 ? '…' : ''}" (${signals.title.length}자)` : '없음'} good={!!signals.title && signals.title.length >= 10 && signals.title.length <= 70} />
              <SignalRow label="Meta Desc" value={signals.metaDescription ? `${signals.metaDescription.length}자` : '없음'} good={signals.metaDescription.length >= 50} />
              <SignalRow label="Canonical" value={signals.canonical || '없음'} good={!!signals.canonical} />
              <SignalRow label="Robots" value={signals.metaRobots || '없음 (색인 허용)'} />
              <SignalRow label="Viewport" value={signals.hasViewport ? '있음' : '없음'} good={signals.hasViewport} />
              <SignalRow label="OG 태그" value={signals.ogTitle ? '있음' : '없음'} good={!!signals.ogTitle} />
            </div>

            {/* 구조 */}
            <div className="mt-3">
              <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">콘텐츠 구조</div>
              <SignalRow label={`H1 (${signals.h1s.length}개)`} value={signals.h1s[0] ? `"${signals.h1s[0].slice(0, 40)}"` : '없음'} good={signals.h1s.length === 1} />
              <SignalRow label={`H2 (${signals.h2s.length}개)`} value={signals.h2s.slice(0, 2).map(h => `"${h.slice(0, 25)}"`).join(', ') || '없음'} good={signals.h2s.length >= 2} />
              <SignalRow label="Hreflang" value={signals.hasHreflang ? '있음' : '없음'} />
            </div>

            {/* AI/Schema */}
            <div className="mt-3">
              <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">AI 검색 최적화</div>
              <SignalRow label="JSON-LD" value={signals.hasSchema ? `있음 (${signals.jsonLdRaw.length}개)` : '없음'} good={signals.hasSchema} />
              <SignalRow label="Sitemap" value={signals.hasSitemap ? 'robots.txt에 명시됨' : '없음'} good={signals.hasSitemap} />
              <SignalRow label="OAI-SearchBot" value={/oai-searchbot/i.test(signals.robotsTxt) ? '명시됨' : '미명시'} />
              <SignalRow label="GPTBot" value={/gptbot/i.test(signals.robotsTxt) ? '명시됨' : '미명시'} />
              {signals.fetchError && <SignalRow label="접속 오류" value={signals.fetchError} good={false} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
