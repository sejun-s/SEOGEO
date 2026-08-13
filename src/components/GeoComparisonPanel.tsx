/**
 * GEO 전후 비교 패널 (P2-3)
 * 두 실행 결과를 비교하고 공유 가능한 리포트를 생성합니다.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  GitCompareArrows, TrendingUp, TrendingDown, Minus,
  Clipboard, ClipboardCheck, Download, FileText, Printer, X, AlertTriangle,
} from 'lucide-react'
import type { GeoMonitoringRun } from '../types'
import {
  compareRuns, buildComparisonHtml, buildComparisonMarkdown,
  comparisonFileName, engineLabel, formatDelta,
} from '../lib/geoCompareLib'
import type { GeoComparison, QueryDelta } from '../lib/geoCompareLib'

// ── 표기 헬퍼 ────────────────────────────────────────────────────────────────

function deltaClasses(delta: number): { text: string; bg: string; border: string } {
  if (delta > 0) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
  if (delta < 0) return { text: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' }
  return { text: 'text-[#737c9c]', bg: 'bg-slate-50', border: 'border-slate-200' }
}

function DeltaIcon({ delta, className = 'w-3.5 h-3.5' }: { delta: number; className?: string }) {
  if (delta > 0) return <TrendingUp className={className} />
  if (delta < 0) return <TrendingDown className={className} />
  return <Minus className={className} />
}

function rateText(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`
}

// ── 리포트 모달 ──────────────────────────────────────────────────────────────

function ReportModal({ cmp, onClose }: { cmp: GeoComparison; onClose: () => void }) {
  const iframeRef  = useRef<HTMLIFrameElement>(null)
  const previewHtml  = useMemo(() => buildComparisonHtml(cmp, { showToolbar: false }), [cmp])
  const downloadHtml = useMemo(() => buildComparisonHtml(cmp), [cmp])

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const print = () => {
    const w = iframeRef.current?.contentWindow
    if (!w) return
    w.focus()
    w.print()
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([downloadHtml], { type: 'text/html;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = comparisonFileName(cmp)
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  return (
    <div
      className="v04-report-modal"
      role="dialog"
      aria-modal="true"
      aria-label="AI 인용률 전후 비교 리포트 미리보기"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="v04-report-window">
        <header>
          <div>
            <strong>전후 비교 리포트</strong>
            <span>{cmp.current.targetDomain}</span>
          </div>
          <div>
            <button onClick={download}><Download size={15} /> HTML 저장</button>
            <button className="primary" onClick={print}><Printer size={15} /> PDF로 인쇄</button>
            <button className="close" onClick={onClose} aria-label="리포트 닫기"><X size={18} /></button>
          </div>
        </header>
        <iframe ref={iframeRef} title="AI 인용률 전후 비교 리포트" srcDoc={previewHtml} />
      </div>
    </div>
  )
}

// ── 질의별 비교 행 ───────────────────────────────────────────────────────────

function QueryRow({ q, index }: { q: QueryDelta; index: number }) {
  const isUncomparable = q.status === 'new' || q.status === 'removed'
  const c = deltaClasses(q.delta)
  return (
    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
      <td className="px-4 py-2.5 max-w-[280px]">
        <div className="text-xs text-[#1b2559] truncate" title={q.queryText}>
          {q.queryText}
        </div>
        {q.status === 'new' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold mt-1 inline-block">
            신규 질의
          </span>
        )}
        {q.status === 'removed' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold mt-1 inline-block">
            이번 측정에서 제외
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center text-xs font-mono text-[#737c9c]">{rateText(q.baselineRate)}</td>
      <td className="px-3 py-2 text-center text-xs font-mono font-bold text-[#1b2559]">{rateText(q.currentRate)}</td>
      <td className="px-3 py-2 text-center">
        {isUncomparable ? (
          <span className="text-[10px] text-[#737c9c]" title="이전 측정에 없던 질의라 변화를 계산할 수 없습니다">
            비교 불가
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 text-xs font-black font-mono ${c.text}`}>
            <DeltaIcon delta={q.delta} className="w-3 h-3" />
            {q.delta === 0 ? '변화 없음' : formatDelta(q.delta)}
          </span>
        )}
      </td>
    </tr>
  )
}

// ── 메인 패널 ────────────────────────────────────────────────────────────────

export function GeoComparisonPanel({ runs }: { runs: GeoMonitoringRun[] }) {
  // runs[0]이 최신. 기본 비교 대상은 그 다음 실행
  const [baselineId, setBaselineId] = useState<string>(() => runs[1]?.id ?? '')
  const [copied, setCopied]         = useState(false)
  const [showReport, setShowReport] = useState(false)

  const current  = runs[0]
  const baseline = runs.find(r => r.id === baselineId) ?? runs[1]

  const cmp = useMemo(
    () => (current && baseline ? compareRuns(baseline, current) : null),
    [current, baseline],
  )

  if (runs.length < 2 || !cmp || !baseline) {
    return (
      <div className="glass-card p-6 text-center">
        <GitCompareArrows className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <div className="text-sm font-semibold text-[#526078]">전후 비교는 측정 2회부터 가능합니다</div>
        <div className="text-[12px] text-[#737c9c] mt-1">
          개선 작업을 적용한 뒤 다시 측정하면 변화를 리포트로 확인할 수 있습니다
        </div>
      </div>
    )
  }

  const copyMarkdown = async () => {
    const md = buildComparisonMarkdown(cmp)
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = md
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const oc = deltaClasses(cmp.overallDelta)

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <GitCompareArrows className="w-4 h-4 text-[#4f6df5]" />
          <span className="text-sm font-bold text-[#1b2559]">전후 비교 리포트</span>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-[10px] text-[#737c9c] font-semibold">비교 기준</label>
            <select
              value={baseline.id}
              onChange={e => setBaselineId(e.target.value)}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white text-[#1b2559] focus:outline-none focus:border-[#4f6df5]"
            >
              {runs.slice(1).map(r => (
                <option key={r.id} value={r.id}>
                  {new Date(r.runAt).toLocaleString('ko-KR')} ({r.overallCitationRate}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 전체 델타 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold text-[#737c9c]">이전</div>
              <div className="text-2xl font-black font-mono text-[#526078] mt-1">
                {baseline.overallCitationRate}<span className="text-sm font-normal">%</span>
              </div>
              <div className="text-[10px] text-[#737c9c] mt-0.5">
                {new Date(baseline.runAt).toLocaleDateString('ko-KR')} · {baseline.repeatCount ?? 1}회
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-semibold text-[#737c9c]">현재</div>
              <div className="text-2xl font-black font-mono text-[#1b2559] mt-1">
                {current.overallCitationRate}<span className="text-sm font-normal">%</span>
              </div>
              <div className="text-[10px] text-[#737c9c] mt-0.5">
                {new Date(current.runAt).toLocaleDateString('ko-KR')} · {current.repeatCount ?? 1}회
              </div>
            </div>

            <div className={`rounded-xl border p-3 ${oc.bg} ${oc.border}`}>
              <div className="text-[10px] font-semibold text-[#737c9c]">변화</div>
              <div className={`text-2xl font-black font-mono mt-1 flex items-center gap-1 ${oc.text}`}>
                <DeltaIcon delta={cmp.overallDelta} className="w-4 h-4" />
                {cmp.overallDelta === 0 ? '0' : (cmp.overallDelta > 0 ? `+${cmp.overallDelta}` : cmp.overallDelta)}
                <span className="text-sm font-normal">%p</span>
              </div>
              <div className="text-[10px] text-[#737c9c] mt-0.5">{cmp.daysBetween}일 간격</div>
            </div>
          </div>

          {/* 신뢰도 경고 */}
          {cmp.lowConfidence && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                두 측정 중 하나 이상이 <strong>1회 실행</strong>입니다. LLM 응답은 같은 질의에도 매번 달라지므로
                이 변화는 실제 개선이 아닌 <strong>측정 노이즈</strong>일 수 있습니다. 3회 이상 반복 측정을 권장합니다.
              </span>
            </div>
          )}

          {/* 엔진 구성 변화 경고 */}
          {cmp.engineSetChanged && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                두 측정의 <strong>AI 엔진 구성이 다릅니다.</strong> 위 전체 인용률은 각 실행의 엔진 조합 전체를
                반영하므로, 엔진이 추가·제외된 것만으로도 수치가 움직일 수 있습니다.
                아래 질의별 비교는 공통 엔진(
                {cmp.commonEngines.map(engineLabel).join(', ') || '없음'}
                )만으로 계산했습니다.
              </span>
            </div>
          )}

          {/* 변화 요약 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              개선 {cmp.summary.improvedCount}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              하락 {cmp.summary.regressedCount}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[#737c9c] font-semibold">
              유지 {cmp.summary.unchangedCount}
            </span>
            {cmp.summary.newCount > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                신규 질의 {cmp.summary.newCount}
              </span>
            )}
          </div>

          {/* 엔진별 변화 */}
          <div>
            <div className="text-[11px] font-semibold text-[#526078] uppercase tracking-wider mb-2">엔진별 변화</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {cmp.engineDeltas.map(e => {
                const c = deltaClasses(e.delta)
                return (
                  <div key={e.engine} className={`rounded-xl border p-2.5 ${c.bg} ${c.border}`}>
                    <div className="text-[10px] font-bold text-[#526078]">{engineLabel(e.engine)}</div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-[11px] font-mono text-[#737c9c]">{rateText(e.baselineRate)}</span>
                      <span className="text-[10px] text-slate-300">→</span>
                      <span className="text-sm font-black font-mono text-[#1b2559]">{rateText(e.currentRate)}</span>
                    </div>
                    {e.status === 'new' || e.status === 'removed' ? (
                      <div className="text-[10px] text-[#737c9c] mt-0.5">
                        {e.status === 'new' ? '이번에 추가된 엔진' : '이번 측정에서 제외'}
                      </div>
                    ) : (
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold mt-0.5 ${c.text}`}>
                        <DeltaIcon delta={e.delta} className="w-2.5 h-2.5" />
                        {e.delta === 0 ? '변화 없음' : formatDelta(e.delta)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 질의별 변화 */}
          <div>
            <div className="text-[11px] font-semibold text-[#526078] uppercase tracking-wider mb-2 flex items-center gap-2">
              질의별 변화
              {cmp.engineSetChanged && (
                <span className="normal-case font-normal text-[10px] text-amber-700">
                  공통 엔진 {cmp.commonEngines.length}개 기준
                </span>
              )}
            </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2 text-[11px] font-bold text-[#526078] min-w-[200px]">질의</th>
                    <th className="px-3 py-2 text-[11px] font-bold text-center text-[#737c9c]">이전</th>
                    <th className="px-3 py-2 text-[11px] font-bold text-center text-[#526078]">현재</th>
                    <th className="px-3 py-2 text-[11px] font-bold text-center text-[#526078]">변화</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.queryDeltas.map((q, i) => <QueryRow key={q.queryText} q={q} index={i} />)}
                </tbody>
              </table>
            </div>
          </div>
          </div>

          {/* 인용 URL 변화 */}
          {(cmp.summary.newCitedUrls.length > 0 || cmp.summary.lostCitedUrls.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cmp.summary.newCitedUrls.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-[11px] font-bold text-emerald-700 mb-1.5">
                    새로 인용된 URL ({cmp.summary.newCitedUrls.length})
                  </div>
                  <div className="space-y-1">
                    {cmp.summary.newCitedUrls.slice(0, 4).map(u => (
                      <div key={u} className="text-[10px] text-emerald-800 truncate" title={u}>{u}</div>
                    ))}
                  </div>
                </div>
              )}
              {cmp.summary.lostCitedUrls.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="text-[11px] font-bold text-rose-700 mb-1.5">
                    인용이 사라진 URL ({cmp.summary.lostCitedUrls.length})
                  </div>
                  <div className="space-y-1">
                    {cmp.summary.lostCitedUrls.slice(0, 4).map(u => (
                      <div key={u} className="text-[10px] text-rose-800 truncate" title={u}>{u}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 액션 */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={copyMarkdown}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[#526078] text-[11px] font-bold hover:bg-slate-50 transition-colors"
            >
              {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5" />}
              {copied ? '복사됨!' : 'Markdown 복사'}
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4f6df5] text-white text-[11px] font-bold hover:bg-[#354fce] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> 리포트 보기 · PDF 저장
            </button>
          </div>
        </div>
      </div>

      {showReport && <ReportModal cmp={cmp} onClose={() => setShowReport(false)} />}
    </>
  )
}
