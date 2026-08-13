/**
 * GEO Monitoring Dashboard (Module C) — v2
 * P0-1: Perplexity citations[] URL 표시
 * P0-2: 반복 실행 (1/3/5회) + 인용률 % + 신뢰도
 * P0-3: 브랜드 동의어 온톨로지 1단계
 */

import { Fragment, useState, useCallback, useEffect } from 'react'
import {
  Play, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp,
  AlertCircle, TrendingUp, Eye, Zap, Globe, Clock, BarChart2,
  Link2, Repeat2, Tag, Info, Quote,
} from 'lucide-react'
import type { GeoEngine, GeoQuery, GeoMonitoringState, GeoAggregatedResult, GeoConfidence } from '../types'
import {
  loadGeoState, saveGeoState,
  runGeoCheck, summarizeByQuery, topCompetitors,
} from '../lib/geoMonitorLib'
import type { GeoStreamEvent } from '../lib/geoMonitorLib'
import { GeoActionPanel } from './GeoActionPanel'

// ── 상수 ─────────────────────────────────────────────────────────────────

const ENGINE_META: Record<GeoEngine, { label: string; color: string; bg: string; border: string }> = {
  perplexity: { label: 'Perplexity', color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  chatgpt   : { label: 'ChatGPT',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  claude    : { label: 'Claude',     color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
  gemini    : { label: 'Gemini',     color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
}

const ALL_ENGINES: GeoEngine[] = ['perplexity', 'chatgpt', 'claude', 'gemini']

const CATEGORY_LABELS: Record<GeoQuery['category'], string> = {
  brand     : '브랜드',
  product   : '상품/서비스',
  industry  : '업계 일반',
  competitor: '경쟁사',
}

const REPEAT_OPTIONS: { value: 1 | 3 | 5; label: string; desc: string }[] = [
  { value: 1, label: '1회',  desc: '빠른 단발 측정' },
  { value: 3, label: '3회',  desc: '통계 신뢰도 중간' },
  { value: 5, label: '5회',  desc: '통계 신뢰도 높음' },
]

// ── P0-2: 인용률 셀 (% + 신뢰도) ─────────────────────────────────────────

function RateCell({
  rate, confidence, error,
}: {
  rate      : number
  confidence: GeoConfidence
  error?    : string
}) {
  if (error) return (
    <span className="flex items-center justify-center gap-0.5 text-[10px] text-[#737c9c]">
      <AlertCircle className="w-3 h-3" /> 오류
    </span>
  )

  const textColor =
    rate >= 60 ? 'text-emerald-600' :
    rate >= 30 ? 'text-amber-600' :
    rate > 0   ? 'text-rose-500' :
                 'text-slate-300'

  const confDot =
    confidence === 'high'   ? 'bg-emerald-400' :
    confidence === 'medium' ? 'bg-amber-400' :
                              'bg-slate-300'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-black font-mono ${textColor}`}>{rate}%</span>
      <span
        title={`신뢰도: ${confidence}`}
        className={`w-1.5 h-1.5 rounded-full ${confDot}`}
      />
    </div>
  )
}

// ── P0-1: 인용 URL 뱃지 ───────────────────────────────────────────────────

function CitedUrlBadge({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {urls.slice(0, 3).map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={url}
          className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 transition-colors truncate max-w-[120px]"
        >
          <Link2 className="w-2 h-2 shrink-0" />
          {new URL(url).hostname.replace('www.', '')}
        </a>
      ))}
      {urls.length > 3 && (
        <span className="text-[9px] text-[#737c9c]">+{urls.length - 3}</span>
      )}
    </div>
  )
}

// ── 엔진 인용률 카드 ───────────────────────────────────────────────────────

function EngineRateCard({
  engine, rate, available,
}: { engine: GeoEngine; rate: number; available: boolean }) {
  const m   = ENGINE_META[engine]
  const bar = rate >= 60 ? 'bg-emerald-500' : rate >= 30 ? 'bg-amber-500' : 'bg-rose-400'

  return (
    <div className={`rounded-xl border p-3 ${available ? m.border + ' ' + m.bg : 'border-slate-200 bg-slate-50 opacity-50'}`}>
      <div className={`text-[11px] font-bold mb-1 ${m.color}`}>{m.label}</div>
      {available ? (
        <>
          <div className={`text-xl font-black font-mono ${m.color}`}>{rate}<span className="text-sm font-normal">%</span></div>
          <div className="h-1.5 bg-white/60 rounded-full mt-1.5 overflow-hidden">
            <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${rate}%` }} />
          </div>
        </>
      ) : (
        <div className="text-[10px] text-slate-400 mt-1">API 키 미설정</div>
      )}
    </div>
  )
}

// ── P0-3: 브랜드 동의어 입력 ─────────────────────────────────────────────

function SynonymsEditor({
  synonyms,
  onChange,
}: {
  synonyms: string[]
  onChange: (s: string[]) => void
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const t = input.trim()
    if (!t || synonyms.includes(t)) return
    onChange([...synonyms, t])
    setInput('')
  }

  return (
    <div>
      <label className="text-[11px] font-semibold text-[#526078] mb-1.5 flex items-center gap-1.5">
        <Tag className="w-3 h-3" />
        브랜드 동의어
        <span
          title="브랜드를 다르게 부르는 이름들을 등록하면 AI 응답에서 더 정확하게 감지됩니다 (온톨로지 1단계)"
          className="cursor-help"
        >
          <Info className="w-3 h-3 text-[#737c9c]" />
        </span>
      </label>

      {/* 등록된 동의어 칩 */}
      {synonyms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {synonyms.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 font-medium"
            >
              {s}
              <button
                onClick={() => onChange(synonyms.filter((_, idx) => idx !== i))}
                className="text-violet-400 hover:text-violet-600"
              >✕</button>
            </span>
          ))}
        </div>
      )}

      {/* 입력 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="예: 퓨어텍, PureTech Korea"
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[#1b2559] placeholder-slate-400 focus:outline-none focus:border-[#4f6df5]"
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-[11px] font-bold disabled:opacity-40 hover:bg-violet-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 추가
        </button>
      </div>
      <p className="text-[10px] text-[#737c9c] mt-1">
        동의어 등록 시 감지 정확도가 2~3배 향상됩니다
      </p>
    </div>
  )
}

// ── 쿼리 편집기 ──────────────────────────────────────────────────────────

function QueryEditor({
  queries,
  onChange,
}: {
  queries : GeoQuery[]
  onChange: (queries: GeoQuery[]) => void
}) {
  const [newText, setNewText]         = useState('')
  const [newCategory, setNewCategory] = useState<GeoQuery['category']>('brand')

  const add = () => {
    const t = newText.trim()
    if (!t) return
    onChange([...queries, { id: `q_${Date.now()}`, text: t, synonyms: [], category: newCategory }])
    setNewText('')
  }

  return (
    <div className="space-y-2">
      {queries.map(q => (
        <div key={q.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            q.category === 'brand'      ? 'bg-violet-50 border-violet-200 text-violet-700' :
            q.category === 'product'    ? 'bg-blue-50 border-blue-200 text-blue-700' :
            q.category === 'industry'   ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                          'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {CATEGORY_LABELS[q.category]}
          </span>
          <span className="flex-1 text-[#1b2559] truncate">{q.text}</span>
          <button
            onClick={() => onChange(queries.filter(x => x.id !== q.id))}
            className="text-slate-300 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <select
          value={newCategory}
          onChange={e => setNewCategory(e.target.value as GeoQuery['category'])}
          className="shrink-0 text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[#1b2559] focus:outline-none focus:border-[#4f6df5]"
        >
          {(Object.entries(CATEGORY_LABELS) as [GeoQuery['category'], string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="예: 한국 최고의 AI SEO 도구는?"
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[#1b2559] placeholder-slate-400 focus:outline-none focus:border-[#4f6df5]"
        />
        <button
          onClick={add}
          disabled={!newText.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4f6df5] text-white text-[11px] font-bold disabled:opacity-40 hover:bg-[#354fce] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 추가
        </button>
      </div>
    </div>
  )
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────

export function GeoMonitoringDashboard() {
  const [state, setState]               = useState<GeoMonitoringState>(loadGeoState)
  const [engines, setEngines]           = useState<GeoEngine[]>(['perplexity', 'claude'])
  const [isRunning, setIsRunning]       = useState(false)
  const [progress, setProgress]         = useState<{ done: number; total: number; engine: string; query: string } | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [expandedRun, setExpandedRun]   = useState<string | null>(null)
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null)

  useEffect(() => { saveGeoState(state) }, [state])

  const update = useCallback((patch: Partial<GeoMonitoringState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const toggleEngine = (engine: GeoEngine) =>
    setEngines(prev => prev.includes(engine) ? prev.filter(e => e !== engine) : [...prev, engine])

  const handleRun = async () => {
    if (!state.targetDomain || !state.targetBrand) {
      setError('도메인과 브랜드명을 입력해주세요.')
      return
    }
    if (state.queries.length === 0) {
      setError('모니터링할 질의를 1개 이상 추가해주세요.')
      return
    }
    if (engines.length === 0) {
      setError('AI 엔진을 1개 이상 선택해주세요.')
      return
    }

    setIsRunning(true)
    setError(null)
    setProgress({ done: 0, total: state.queries.length * engines.length, engine: '', query: '' })

    try {
      const run = await runGeoCheck(
        {
          targetDomain  : state.targetDomain,
          targetBrand   : state.targetBrand,
          brandSynonyms : state.brandSynonyms,
          queries       : state.queries,
          engines,
          repeatCount   : state.repeatCount,
        },
        (e: GeoStreamEvent) => {
          if (e.type === 'geo-progress') {
            setProgress({ done: e.done, total: e.total, engine: e.engine, query: e.query })
          }
        },
      )
      setState(prev => ({ ...prev, runs: [run, ...prev.runs].slice(0, 30) }))
      setExpandedRun(run.id)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
  }

  const latestRun = state.runs[0]
  const latestSummary = latestRun ? summarizeByQuery(latestRun.aggregated ?? []) : []
  const latestCompetitors = latestRun ? topCompetitors(latestRun.aggregated ?? []) : []

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── 헤더 ── */}
      <div className="v03-score-overview">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <span className="v03-eyebrow flex items-center gap-1.5">
              <BarChart2 className="w-3 h-3" /> GEO 모니터링
            </span>
            <h2 className="text-lg font-black text-[#1b2559] mt-1">AI 인용률 실측 대시보드</h2>
            <p className="text-sm text-[#737c9c] mt-0.5">
              실제 AI 엔진에 질의하여 내 사이트가 인용되는지 측정합니다
            </p>
          </div>
          {latestRun && (
            <div className="text-right shrink-0">
              <div className="text-3xl font-black font-mono text-[#1b2559]">
                {latestRun.overallCitationRate}
                <span className="text-sm font-normal text-[#737c9c]">%</span>
              </div>
              <div className="text-[11px] text-[#737c9c] mt-0.5">전체 인용률</div>
              {latestRun.repeatCount > 1 && (
                <div className="text-[10px] text-[#4f6df5] mt-0.5 font-medium">
                  {latestRun.repeatCount}회 반복 평균
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 설정 패널 ── */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-[#4f6df5]" />
          <span className="text-sm font-bold text-[#1b2559]">모니터링 설정</span>
        </div>

        {/* 도메인 + 브랜드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#526078] mb-1 block">타깃 도메인</label>
            <input
              type="text"
              placeholder="예: puretechstore.com"
              value={state.targetDomain}
              onChange={e => update({ targetDomain: e.target.value.trim() })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-[#1b2559] placeholder-slate-400 focus:outline-none focus:border-[#4f6df5]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#526078] mb-1 block">브랜드명</label>
            <input
              type="text"
              placeholder="예: Pure Tech"
              value={state.targetBrand}
              onChange={e => update({ targetBrand: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-[#1b2559] placeholder-slate-400 focus:outline-none focus:border-[#4f6df5]"
            />
          </div>
        </div>

        {/* P0-3: 브랜드 동의어 */}
        <SynonymsEditor
          synonyms={state.brandSynonyms}
          onChange={brandSynonyms => update({ brandSynonyms })}
        />

        {/* AI 엔진 + P0-2: 반복 횟수 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 엔진 선택 */}
          <div>
            <label className="text-[11px] font-semibold text-[#526078] mb-2 block">AI 엔진 선택</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ENGINES.map(engine => {
                const m       = ENGINE_META[engine]
                const checked = engines.includes(engine)
                return (
                  <button
                    key={engine}
                    onClick={() => toggleEngine(engine)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                      checked
                        ? `${m.border} ${m.bg} ${m.color}`
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${checked ? 'bg-current' : 'bg-slate-300'}`} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* P0-2: 반복 횟수 */}
          <div>
            <label className="text-[11px] font-semibold text-[#526078] mb-2 flex items-center gap-1.5">
              <Repeat2 className="w-3 h-3" /> 반복 실행 횟수
            </label>
            <div className="flex gap-2">
              {REPEAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ repeatCount: opt.value })}
                  title={opt.desc}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                    state.repeatCount === opt.value
                      ? 'border-[#4f6df5] bg-[#eef3ff] text-[#4f6df5]'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#737c9c] mt-1">
              {state.repeatCount === 1 ? '단발 측정 — 빠르지만 LLM 비결정성 영향 큼' :
               state.repeatCount === 3 ? '3회 평균 — 균형잡힌 신뢰도' :
               '5회 평균 — 높은 통계 신뢰도'}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-[#737c9c]">
          ※ 각 엔진은 서버 환경변수(PPLX_API_KEY, OPENAI_API_KEY 등)가 설정된 경우만 작동합니다.
        </p>
      </div>

      {/* ── 질의 패널 ── */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-[#1b2559]">질의 패널 ({state.queries.length}개)</span>
        </div>
        <QueryEditor queries={state.queries} onChange={queries => update({ queries })} />
      </div>

      {/* ── 오류 + 진행 상태 ── */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {isRunning && progress && (
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[#1b2559] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#4f6df5]" />
              AI 엔진에 질의 중 {state.repeatCount > 1 ? `(각 ${state.repeatCount}회 반복)` : ''}…
            </span>
            <span className="font-mono text-[#526078] text-xs">{progress.done}/{progress.total}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4f6df5] rounded-full transition-all duration-500"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
          {progress.engine && (
            <div className="text-[11px] text-[#737c9c]">
              <span className={`font-bold ${ENGINE_META[progress.engine as GeoEngine]?.color ?? ''}`}>
                {ENGINE_META[progress.engine as GeoEngine]?.label ?? progress.engine}
              </span>
              {' '}에 질의: <span className="italic">"{progress.query.slice(0, 50)}{progress.query.length > 50 ? '…' : ''}"</span>
            </div>
          )}
        </div>
      )}

      {/* ── 실행 버튼 ── */}
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4f6df5] text-white font-bold text-sm hover:bg-[#354fce] disabled:opacity-50 transition-colors shadow-lg"
      >
        {isRunning
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> 모니터링 실행 중…</>
          : <><Play className="w-4 h-4" /> AI 인용률 측정 시작</>
        }
      </button>

      {/* ── 최신 결과 ── */}
      {latestRun && (
        <div className="space-y-4">

          {/* 엔진별 인용률 카드 */}
          <div>
            <div className="text-[11px] font-semibold text-[#526078] uppercase tracking-wider mb-2">
              엔진별 인용률
              {latestRun.repeatCount > 1 && (
                <span className="ml-2 normal-case font-normal text-[#4f6df5]">({latestRun.repeatCount}회 평균)</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_ENGINES.map(engine => (
                <EngineRateCard
                  key={engine}
                  engine={engine}
                  rate={latestRun.citationRates[engine] ?? 0}
                  available={engine in latestRun.citationRates}
                />
              ))}
            </div>
          </div>

          {/* 질의별 결과 매트릭스 */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#4f6df5]" />
              <span className="text-sm font-bold text-[#1b2559]">질의별 인용 현황</span>
              {latestRun.repeatCount > 1 && (
                <span className="text-[10px] text-[#4f6df5] font-medium">
                  {latestRun.repeatCount}회 반복 · 신뢰도: 점 색상
                </span>
              )}
              <span className="text-[10px] text-[#737c9c] ml-auto">
                {new Date(latestRun.runAt).toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2 text-[11px] font-bold text-[#526078] min-w-[200px]">질의</th>
                    {engines.map(e => (
                      <th key={e} className={`px-3 py-2 text-[11px] font-bold text-center ${ENGINE_META[e].color}`}>
                        {ENGINE_META[e].label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-[11px] font-bold text-center text-[#526078]">평균</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSummary.map((row, i) => {
                    const open = expandedQuery === row.queryId
                    // P0-1: citedUrls 수집 for this query
                    const citedUrls = Array.from(new Set(
                      (latestRun.aggregated ?? [])
                        .filter(r => r.queryId === row.queryId)
                        .flatMap(r => r.allCitedUrls ?? [])
                    ))
                    return (
                      <Fragment key={row.queryId}>
                        <tr className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-4 py-2.5 max-w-[240px]">
                            <button
                              onClick={() => setExpandedQuery(open ? null : row.queryId)}
                              className="text-xs text-left text-[#1b2559] hover:text-[#4f6df5] transition-colors"
                            >
                              {open ? <ChevronUp className="w-3 h-3 inline mr-1" /> : <ChevronDown className="w-3 h-3 inline mr-1" />}
                              <span className="truncate">{row.queryText}</span>
                            </button>
                            {/* P0-1: 인용 URL (Perplexity 전용) */}
                            {citedUrls.length > 0 && <CitedUrlBadge urls={citedUrls} />}
                          </td>
                          {engines.map(engine => {
                            const info = row.engines[engine]
                            return (
                              <td key={engine} className="px-3 py-2 text-center">
                                {info
                                  ? <RateCell rate={info.rate} confidence={info.confidence as GeoConfidence} error={info.error} />
                                  : <span className="text-slate-300">—</span>
                                }
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-center">
                            <span className={`text-sm font-black font-mono ${
                              row.avgCitationRate >= 60 ? 'text-emerald-600' :
                              row.avgCitationRate >= 30 ? 'text-amber-600' :
                              row.avgCitationRate > 0   ? 'text-rose-500' :
                                                          'text-slate-300'
                            }`}>
                              {row.avgCitationRate}%
                            </span>
                          </td>
                        </tr>
                        {open && (
                          <tr key={`${row.queryId}-detail`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td colSpan={engines.length + 2} className="px-4 pb-3 pt-0">
                              <div className="bg-slate-50 rounded-lg p-3 text-[11px] space-y-3">
                                {/* P1-2: 인용 컨텍스트 — bestSnippet 우선, 없으면 responsePreview */}
                                {(latestRun.aggregated ?? [])
                                  .filter(r => r.queryId === row.queryId && engines.includes(r.engine))
                                  .filter(r => r.bestSnippet || r.responsePreview)
                                  .slice(0, 2)
                                  .map(r => {
                                    const hasCited = r.citationRate > 0
                                    return (
                                      <div key={r.engine}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className={`text-[10px] font-bold ${ENGINE_META[r.engine].color}`}>
                                            {ENGINE_META[r.engine].label}
                                          </span>
                                          {hasCited && r.bestSnippet && (
                                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                              <Quote className="w-2.5 h-2.5" /> 인용 문맥
                                            </span>
                                          )}
                                        </div>
                                        {/* 인용 문맥이 있으면 강조, 없으면 응답 미리보기 */}
                                        {hasCited && r.bestSnippet ? (
                                          <blockquote className="border-l-2 border-emerald-400 pl-3 py-1 bg-white rounded-r-lg">
                                            <p className="text-[#1b2559] leading-relaxed italic">
                                              "…{r.bestSnippet}…"
                                            </p>
                                          </blockquote>
                                        ) : r.responsePreview ? (
                                          <p className="text-[#737c9c] italic leading-relaxed">
                                            "{r.responsePreview.slice(0, 180)}{r.responsePreview.length > 180 ? '…' : ''}"
                                          </p>
                                        ) : null}
                                      </div>
                                    )
                                  })
                                }
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* P0-2 신뢰도 범례 */}
            {latestRun.repeatCount > 1 && (
              <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-[10px] text-[#737c9c]">
                <span className="font-semibold">신뢰도 표시:</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> 높음</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 중간</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> 낮음</span>
              </div>
            )}
          </div>

          {/* 경쟁 도메인 */}
          {latestCompetitors.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-bold text-[#1b2559]">AI가 함께 언급한 경쟁 도메인</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {latestCompetitors.map(({ domain, count }) => (
                  <span
                    key={domain}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-medium"
                  >
                    {domain}
                    <span className="font-mono bg-rose-100 px-1 rounded">{count}회</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* P1-3: GEO 개선 액션 플랜 */}
          <GeoActionPanel run={latestRun} />
        </div>
      )}

      {/* ── 실행 기록 ── */}
      {state.runs.length > 1 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#526078]" />
            <span className="text-sm font-bold text-[#1b2559]">실행 기록</span>
          </div>
          <div className="divide-y divide-slate-100">
            {state.runs.slice(1).map(run => (
              <div key={run.id}>
                <button
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#737c9c]">
                      {new Date(run.runAt).toLocaleString('ko-KR')}
                    </span>
                    <span className={`text-sm font-bold font-mono ${
                      run.overallCitationRate >= 60 ? 'text-emerald-600' :
                      run.overallCitationRate >= 30 ? 'text-amber-600' : 'text-rose-500'
                    }`}>
                      {run.overallCitationRate}%
                    </span>
                    {run.repeatCount > 1 && (
                      <span className="text-[10px] text-[#737c9c]">× {run.repeatCount}회</span>
                    )}
                  </div>
                  {expandedRun === run.id
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                </button>
                {expandedRun === run.id && (
                  <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.entries(run.citationRates) as [GeoEngine, number][]).map(([engine, rate]) => (
                      <EngineRateCard key={engine} engine={engine} rate={rate} available />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 데이터 없음 */}
      {state.runs.length === 0 && !isRunning && (
        <div className="glass-card p-10 text-center">
          <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <div className="text-sm font-semibold text-[#526078]">아직 측정 기록이 없습니다</div>
          <div className="text-[12px] text-[#737c9c] mt-1">
            도메인과 질의를 설정한 뒤 "AI 인용률 측정 시작"을 눌러보세요
          </div>
        </div>
      )}
    </div>
  )
}
