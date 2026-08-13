/**
 * GEO 모니터링 — 클라이언트 사이드 API 호출 및 localStorage 관리 (v2)
 *
 * P0-1: citedUrls 처리 (Perplexity citations[])
 * P0-2: repeatCount 파라미터 + GeoAggregatedResult 집계
 * P0-3: brandSynonyms 등록 및 전달
 */

import type {
  GeoEngine,
  GeoQuery,
  GeoAggregatedResult,
  GeoMonitoringRun,
  GeoMonitoringState,
} from '../types'

const STORAGE_KEY = 'geo-monitoring-state'

// ── localStorage 헬퍼 ───────────────────────────────────────────────────────

const DEFAULT_STATE: GeoMonitoringState = {
  targetDomain : '',
  targetBrand  : '',
  brandSynonyms: [],
  repeatCount  : 1,
  queries      : [],
  runs         : [],
}

export function loadGeoState(): GeoMonitoringState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as Partial<GeoMonitoringState>
    // 이전 버전 마이그레이션: 없는 필드 기본값으로 채우기
    return {
      ...DEFAULT_STATE,
      ...parsed,
      brandSynonyms: parsed.brandSynonyms ?? [],
      repeatCount  : (parsed.repeatCount as 1 | 3 | 5) ?? 1,
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function saveGeoState(state: GeoMonitoringState): void {
  try {
    const trimmed = { ...state, runs: state.runs.slice(0, 30) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch { /* quota */ }
}

// ── 스트리밍 이벤트 타입 ────────────────────────────────────────────────────

export type GeoProgressEvent = {
  type  : 'geo-progress'
  done  : number
  total : number
  pct   : number
  engine: GeoEngine
  query : string
  ts    : number
}

export type GeoResultEvent = {
  type               : 'geo-result'
  aggregated         : GeoAggregatedResult[]
  citationRates      : Partial<Record<GeoEngine, number>>
  overallCitationRate: number
  ts                 : number
}

export type GeoStreamEvent =
  | GeoProgressEvent
  | GeoResultEvent
  | { type: 'error'; msg: string; ts: number }

// ── GEO 모니터링 실행 ───────────────────────────────────────────────────────

export async function runGeoCheck(
  params: {
    targetDomain  : string
    targetBrand   : string
    brandSynonyms : string[]
    queries       : GeoQuery[]
    engines       : GeoEngine[]
    repeatCount   : number
  },
  onEvent?: (e: GeoStreamEvent) => void,
): Promise<GeoMonitoringRun> {
  const res = await fetch('/api/geo-monitor', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(params),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(`GEO API 오류 (${res.status}): ${message.slice(0, 200)}`)
  }

  if (!res.body) throw new Error('스트리밍 응답을 받지 못했습니다.')

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''
  let finalRun: GeoMonitoringRun | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      let event: Record<string, unknown>
      try { event = JSON.parse(line) } catch { continue }

      const type = event.type as string

      if (type === 'error') {
        const e = event as { type: 'error'; msg: string; ts: number }
        onEvent?.(e)
        throw new Error(e.msg)
      }

      if (type === 'geo-progress') {
        onEvent?.(event as GeoProgressEvent)
        continue
      }

      if (type === 'geo-result') {
        const e = event as GeoResultEvent
        onEvent?.(e)

        finalRun = {
          id                 : `run_${Date.now()}`,
          targetDomain       : params.targetDomain,
          targetBrand        : params.targetBrand,
          brandSynonyms      : params.brandSynonyms,
          repeatCount        : params.repeatCount,
          runAt              : new Date().toISOString(),
          aggregated         : e.aggregated,
          citationRates      : e.citationRates,
          overallCitationRate: e.overallCitationRate,
        }
      }
    }
  }

  if (!finalRun) throw new Error('GEO 모니터링 결과를 받지 못했습니다.')
  const validResults = finalRun.aggregated.filter(result => !result.error)
  if (validResults.length === 0) {
    const firstError = finalRun.aggregated.find(result => result.error)?.error
    throw new Error(firstError ?? '선택한 AI 엔진에서 유효한 결과를 받지 못했습니다.')
  }
  return finalRun
}

// ── P2-2: LLM 기반 질의 자동 확장 ──────────────────────────────────────────

export async function expandQueries(params: {
  targetDomain : string
  targetBrand  : string
  brandSynonyms: string[]
  existingTexts: string[]
  count?       : number
}): Promise<GeoQuery[]> {
  const res = await fetch('/api/geo-expand-queries', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(params),
  })

  const data = await res.json() as {
    queries?: Array<{ text: string; category: GeoQuery['category'] }>
    error?  : string
  }

  if (!res.ok || data.error) throw new Error(data.error ?? '질의 생성에 실패했습니다.')

  return (data.queries ?? []).map((q, i) => ({
    id      : `q_ai_${Date.now()}_${i}`,
    text    : q.text,
    synonyms: [],
    category: q.category,
  }))
}

// ── 통계 헬퍼 ───────────────────────────────────────────────────────────────

/** 질의별 집계 요약 */
export function summarizeByQuery(aggregated: GeoAggregatedResult[]): Array<{
  queryId        : string
  queryText      : string
  avgCitationRate: number
  engines        : Partial<Record<GeoEngine, { rate: number; confidence: string; error?: string }>>
}> {
  const map = new Map<string, {
    queryText      : string
    total          : number
    rateSum        : number
    engines        : Partial<Record<GeoEngine, { rate: number; confidence: string; error?: string }>>
  }>()

  for (const r of aggregated) {
    if (!map.has(r.queryId)) {
      map.set(r.queryId, { queryText: r.queryText, total: 0, rateSum: 0, engines: {} })
    }
    const entry = map.get(r.queryId)!
    entry.total++
    entry.rateSum += r.citationRate
    entry.engines[r.engine] = { rate: r.citationRate, confidence: r.confidence, error: r.error }
  }

  return Array.from(map.entries()).map(([queryId, v]) => ({
    queryId,
    queryText      : v.queryText,
    avgCitationRate: v.total > 0 ? Math.round(v.rateSum / v.total) : 0,
    engines        : v.engines,
  }))
}

/** 가장 많이 나타난 경쟁 도메인 Top 5 */
export function topCompetitors(aggregated: GeoAggregatedResult[]): Array<{ domain: string; count: number }> {
  const counter = new Map<string, number>()
  for (const r of aggregated) {
    for (const d of r.competitorMentions ?? []) {
      counter.set(d, (counter.get(d) ?? 0) + 1)
    }
  }
  return Array.from(counter.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
