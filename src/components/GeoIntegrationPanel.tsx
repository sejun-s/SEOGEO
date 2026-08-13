/**
 * GeoIntegrationPanel — P1-1: SEO ↔ GEO 직접 연동
 *
 * SEO 분석 결과 화면 안에서 동일 도메인의 GEO 인용률을 바로 표시.
 * "GEO 모니터링 시작" 버튼으로 도메인 자동 입력 후 탭 전환.
 */

import { useMemo, useState } from 'react'
import { BarChart2, Play, ChevronDown, ChevronUp, Link2, AlertTriangle } from 'lucide-react'
import type { AuditResult, GeoEngine, GeoMonitoringState } from '../types'
import { loadGeoState, saveGeoState } from '../lib/geoMonitorLib'

const ENGINE_META: Record<GeoEngine, { label: string; color: string; bg: string; border: string }> = {
  perplexity: { label: 'Perplexity', color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200'  },
  chatgpt   : { label: 'ChatGPT',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  claude    : { label: 'Claude',     color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
  gemini    : { label: 'Gemini',     color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'  },
  naver     : { label: '네이버 AI',   color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200' },
}

interface Props {
  audit   : AuditResult
  onGoToGeo: () => void   // GEO 모니터링 탭으로 전환
}

function domainOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`)
      .hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')
  }
}

function rateColor(rate: number) {
  if (rate >= 60) return 'text-emerald-600'
  if (rate >= 30) return 'text-amber-600'
  if (rate > 0)   return 'text-rose-500'
  return 'text-slate-400'
}

export function GeoIntegrationPanel({ audit, onGoToGeo }: Props) {
  const [open, setOpen] = useState(true)

  const { matchedRun, geoState } = useMemo(() => {
    const state = loadGeoState()
    const auditDomain = domainOf(audit.url)

    // 동일 도메인의 가장 최근 GEO 실행 찾기
    const matched = state.runs.find(r => {
      const runDomain = domainOf(r.targetDomain)
      return runDomain === auditDomain || r.targetDomain.includes(auditDomain) || auditDomain.includes(runDomain)
    })
    return { matchedRun: matched, geoState: state }
  }, [audit.url])

  // GEO 모니터링 도메인 자동 세팅 후 탭 전환
  const handleStartGeo = () => {
    const auditDomain = domainOf(audit.url)
    if (!geoState.targetDomain || !geoState.targetDomain.includes(auditDomain)) {
      const nextState: GeoMonitoringState = {
        ...geoState,
        targetDomain: auditDomain,
        targetBrand : geoState.targetBrand || (audit.title ?? ''),
      }
      saveGeoState(nextState)
    }
    onGoToGeo()
  }

  // 표시할 엔진 목록 (실행 기록에 있는 엔진만)
  const engines = matchedRun
    ? (Object.keys(matchedRun.citationRates) as GeoEngine[])
    : []

  return (
    <div className="glass-card overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#eef3ff]">
          <BarChart2 className="w-4 h-4 text-[#4f6df5]" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-[#1b2559]">GEO 인용률 연동</div>
          <div className="text-[11px] text-[#737c9c]">
            {matchedRun
              ? `${new Date(matchedRun.runAt).toLocaleDateString('ko-KR')} 측정 · 전체 ${matchedRun.overallCitationRate}%`
              : 'AI가 이 사이트를 얼마나 인용하는지 실측'}
          </div>
        </div>
        {matchedRun && (
          <span className={`text-lg font-black font-mono ${rateColor(matchedRun.overallCitationRate)}`}>
            {matchedRun.overallCitationRate}%
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {matchedRun ? (
            /* ── 측정 기록 있음 ── */
            <div className="p-4 space-y-4">
              {/* 엔진별 인용률 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {engines.map(engine => {
                  const m    = ENGINE_META[engine]
                  const rate = matchedRun.citationRates[engine] ?? 0
                  const bar  = rate >= 60 ? 'bg-emerald-500' : rate >= 30 ? 'bg-amber-500' : 'bg-rose-400'
                  return (
                    <div key={engine} className={`rounded-xl border p-2.5 ${m.border} ${m.bg}`}>
                      <div className={`text-[10px] font-bold mb-0.5 ${m.color}`}>{m.label}</div>
                      <div className={`text-lg font-black font-mono ${m.color}`}>
                        {rate}<span className="text-xs font-normal">%</span>
                      </div>
                      <div className="h-1 bg-white/60 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full ${bar} rounded-full`} style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 인사이트 */}
              <div className={`rounded-xl p-3 text-sm flex items-start gap-2.5 ${
                matchedRun.overallCitationRate >= 40
                  ? 'bg-emerald-50 border border-emerald-200'
                  : matchedRun.overallCitationRate >= 15
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-rose-50 border border-rose-200'
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  matchedRun.overallCitationRate >= 40 ? 'text-emerald-600' :
                  matchedRun.overallCitationRate >= 15 ? 'text-amber-600' : 'text-rose-600'
                }`} />
                <div>
                  <div className={`font-semibold text-sm ${
                    matchedRun.overallCitationRate >= 40 ? 'text-emerald-800' :
                    matchedRun.overallCitationRate >= 15 ? 'text-amber-800' : 'text-rose-800'
                  }`}>
                    {matchedRun.overallCitationRate >= 40
                      ? 'AI 인용 우수 — 현재 전략 유지'
                      : matchedRun.overallCitationRate >= 15
                      ? 'AI 인용 개선 필요 — 아래 SEO 항목 수정 후 재측정'
                      : 'AI 인용 매우 낮음 — E-E-A-T·Schema 보강이 최우선'}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${
                    matchedRun.overallCitationRate >= 40 ? 'text-emerald-700' :
                    matchedRun.overallCitationRate >= 15 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {matchedRun.repeatCount > 1
                      ? `${matchedRun.repeatCount}회 반복 평균 · 측정 신뢰도 양호`
                      : '반복 실행(3회)으로 더 정확한 수치를 얻을 수 있습니다'}
                  </div>
                </div>
              </div>

              {/* 인용 URL (Perplexity) */}
              {(() => {
                const allUrls = Array.from(new Set(
                  (matchedRun.aggregated ?? []).flatMap(r => r.allCitedUrls ?? [])
                ))
                return allUrls.length > 0 ? (
                  <div>
                    <div className="text-[11px] font-semibold text-[#526078] mb-1.5 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Perplexity가 인용한 페이지
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allUrls.slice(0, 6).map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 transition-colors max-w-[180px] truncate"
                          title={url}
                        >
                          <Link2 className="w-2.5 h-2.5 shrink-0" />
                          {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 35)}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={handleStartGeo}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#4f6df5] text-[#4f6df5] text-[12px] font-bold hover:bg-[#eef3ff] transition-colors"
                >
                  <Play className="w-3.5 h-3.5" /> GEO 재측정
                </button>
                <button
                  onClick={onGoToGeo}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#4f6df5] text-white text-[12px] font-bold hover:bg-[#354fce] transition-colors"
                >
                  <BarChart2 className="w-3.5 h-3.5" /> 전체 대시보드
                </button>
              </div>
            </div>
          ) : (
            /* ── 측정 기록 없음 ── */
            <div className="p-5 flex flex-col items-center text-center gap-3">
              <div className="text-3xl">📡</div>
              <div>
                <div className="text-sm font-semibold text-[#1b2559]">아직 인용률을 측정하지 않았어요</div>
                <div className="text-[11px] text-[#737c9c] mt-1">
                  AI가 이 사이트를 얼마나 자주 인용하는지<br />Perplexity·ChatGPT·Claude·Gemini에 직접 물어봅니다
                </div>
              </div>
              <button
                onClick={handleStartGeo}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f6df5] text-white text-sm font-bold hover:bg-[#354fce] transition-colors shadow-lg shadow-indigo-200"
              >
                <Play className="w-4 h-4" /> AI 인용률 지금 측정하기
              </button>
              <div className="text-[10px] text-[#737c9c]">
                도메인이 자동 입력됩니다 · 1분 내 결과
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
