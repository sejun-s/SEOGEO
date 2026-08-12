import React, { useState } from 'react';
import type { PageSignals } from '../types';
import { BarChart3, Check, X, AlertTriangle, Copy, ChevronDown } from 'lucide-react';

interface Props {
  signals: PageSignals;
}

const GA4_SNIPPET = (id = 'G-XXXXXXXXXX') =>
  `<!-- HTML <head> 안에 추가 -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${id}');\n</script>`;

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-900 transition-all"
    >
      {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
      {copied ? '복사됨' : '복사'}
    </button>
  );
}

type ToolStatus = 'ok' | 'warn' | 'missing' | 'legacy';

function ToolRow({ label, status, detail }: { label: string; status: ToolStatus; detail?: string }) {
  const icon = status === 'ok'
    ? <Check className="w-3 h-3 text-emerald-400" />
    : status === 'warn'
    ? <AlertTriangle className="w-3 h-3 text-amber-400" />
    : status === 'legacy'
    ? <AlertTriangle className="w-3 h-3 text-orange-400" />
    : <X className="w-3 h-3 text-slate-600" />;

  const labelCls = status === 'ok'
    ? 'text-emerald-300'
    : status === 'warn'
    ? 'text-amber-300'
    : status === 'legacy'
    ? 'text-orange-300'
    : 'text-slate-600';

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-3.5 shrink-0 flex justify-center">{icon}</div>
      <span className={`text-[12px] font-medium ${labelCls} w-[130px] shrink-0`}>{label}</span>
      {detail && <span className="text-[11px] text-slate-500 font-mono truncate">{detail}</span>}
    </div>
  );
}

export const AnalyticsCard: React.FC<Props> = ({ signals }) => {
  const [open, setOpen] = useState(true);

  const hasAny = signals.hasGA4 || signals.hasGTM || signals.hasUALegacy || signals.hasFbPixel || signals.hasNaverAnalytics;

  const statusLine = signals.hasGA4
    ? `GA4 설치됨${signals.ga4MeasurementId ? ` — ${signals.ga4MeasurementId}` : ''}`
    : signals.hasGTM
    ? `GTM 감지됨${signals.gtmId ? ` — ${signals.gtmId}` : ''} (GA4 태그 설정 필요)`
    : signals.hasUALegacy
    ? 'UA(구버전) 감지됨 — GA4로 전환 필요'
    : '분석 도구 없음 — 데이터 수집 불가';

  const headerCls = signals.hasGA4
    ? 'text-emerald-400'
    : signals.hasGTM || signals.hasUALegacy
    ? 'text-amber-400'
    : 'text-rose-400';

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors ${open ? 'border-b border-slate-200' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 grid place-items-center shadow-sm"><BarChart3 className="w-4 h-4 text-blue-800" /></span>
          <span className="text-sm font-extrabold text-slate-900">분석 도구 감지</span>
          {!open && (
            <span className={`text-[11px] ml-1 ${headerCls}`}>{statusLine}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-4 space-y-4 animate-fadeIn">
          {/* Tool status grid */}
          <div className="grid sm:grid-cols-2 gap-x-8">
            <div className="space-y-0 divide-y divide-white/5">
              <ToolRow
                label="Google Analytics 4"
                status={signals.hasGA4 ? 'ok' : 'missing'}
                detail={signals.hasGA4 ? (signals.ga4MeasurementId ?? '감지됨') : '미설치'}
              />
              <ToolRow
                label="Google Tag Manager"
                status={signals.hasGTM ? (signals.hasGA4 ? 'ok' : 'warn') : 'missing'}
                detail={signals.hasGTM ? (signals.gtmId ?? '감지됨') : '미감지'}
              />
              <ToolRow
                label="UA (구버전)"
                status={signals.hasUALegacy ? 'legacy' : 'missing'}
                detail={signals.hasUALegacy ? '감지됨 — 2023년 종료됨' : '없음'}
              />
            </div>
            <div className="space-y-0 divide-y divide-white/5">
              <ToolRow
                label="Facebook Pixel"
                status={signals.hasFbPixel ? 'ok' : 'missing'}
                detail={signals.hasFbPixel ? '감지됨' : '미설치'}
              />
              <ToolRow
                label="Naver Analytics"
                status={signals.hasNaverAnalytics ? 'ok' : 'missing'}
                detail={signals.hasNaverAnalytics ? '감지됨' : '미설치'}
              />
            </div>
          </div>

          {/* GA4 not installed → show install guide */}
          {!signals.hasGA4 && (
            <div className="rounded-xl border border-slate-300 overflow-hidden bg-white">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300">
                <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">GA4 설치 코드</span>
                <CopyBtn text={GA4_SNIPPET()} />
              </div>
              <pre className="p-4 text-[12px] font-mono text-slate-900 overflow-x-auto whitespace-pre-wrap leading-6 bg-white">
                {GA4_SNIPPET()}
              </pre>
            </div>
          )}

          {/* GTM installed but no GA4 → show GTM guide */}
          {signals.hasGTM && !signals.hasGA4 && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-300 leading-relaxed">
              <span className="font-semibold">GTM이 설치되어 있습니다.</span> GTM 컨테이너에서 <span className="font-mono">GA4 구성 태그</span>를 추가하면 별도 코드 없이 GA4를 활성화할 수 있습니다.
            </div>
          )}

          {/* Legacy UA warning */}
          {signals.hasUALegacy && !signals.hasGA4 && (
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/15 text-[11px] text-orange-300 leading-relaxed">
              <span className="font-semibold">유니버설 애널리틱스(UA)가 감지됩니다.</span> UA는 2023년 7월 종료되었습니다. 위 GA4 코드로 교체하세요.
            </div>
          )}

          {/* All good */}
          {signals.hasGA4 && (
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-emerald-300 leading-relaxed space-y-1">
              <div className="font-semibold">GA4 설치 확인됨 {signals.ga4MeasurementId && <span className="font-mono">({signals.ga4MeasurementId})</span>}</div>
              <div className="text-emerald-500">다음 단계: 전환 이벤트 설정 → Search Console 연결 → 맞춤 보고서 구성</div>
            </div>
          )}

          {/* Summary stats row */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: '분석 도구', value: [signals.hasGA4 && 'GA4', signals.hasGTM && 'GTM', signals.hasFbPixel && 'Pixel', signals.hasNaverAnalytics && 'Naver'].filter(Boolean).join(' · ') || '없음', ok: hasAny },
              { label: '데이터 수집', value: signals.hasGA4 ? '가능' : signals.hasGTM ? 'GTM 설정 필요' : '불가', ok: signals.hasGA4 },
              { label: '구버전 잔재', value: signals.hasUALegacy ? 'UA 감지됨' : '없음', ok: !signals.hasUALegacy },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-white/3 border border-white/8">
                <div className="text-[9px] text-slate-600 mb-0.5 uppercase tracking-wider">{label}</div>
                <div className={`text-[12px] font-medium ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
