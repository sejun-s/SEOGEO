/**
 * GEO 모니터링 — 클라이언트 사이드 API 호출 및 localStorage 관리
 */

import type {
  GeoEngine,
  GeoQuery,
  GeoCheckResult,
  GeoMonitoringRun,
  GeoMonitoringState,
} from '../types'

const STORAGE_KEY = 'geo-monitoring-state'

// ── localStorage 헬퍼 ───────────────────────────────────────────────────────

export function loadGeoState(): GeoMonitoringState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw
      ? (JSON.parse(raw) as GeoMonitoringState)
      : { targetDomain: '', targetBrand: '', queries: [], runs: [] }
  } catch {
    return { targetDomain: '', targetBrand: '', queries: [], runs: [] }
  }
}

export function saveGeoState(state: GeoMonitoringState): void {
  try {
    // 최근 30회 실행만 보관
    const trimmed = { ...state, runs: state.runs.slice(0, 30) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch { /* quota */ }
}

// ── GEO 모니터링 실행 ───────────────────────────────────────────────────────

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
  results            : GeoCheckResult[]
  citationRates      : Record<GeoEngine, number>
  overallCitationRate: number
  ts                 : number
}

export type GeoStreamEvent = GeoProgressEvent | GeoResultEvent | { type: 'error'; msg: string; ts: number }

export async function runGeoCheck(
  params: {
    targetDomain: string
    targetBrand : string
    queries     : GeoQuery[]
    engines     : GeoEngine[]
  },
  onEvent?: (e: GeoStreamEvent) => void,
): Promise<GeoMonitoringRun> {
  const res = await fetch('/api/geo-monitor', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(params),
  })

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
          runAt              : new Date().toISOString(),
          results            : e.results,
          citationRates      : e.citationRates,
          overallCitationRate: e.overallCitationRate,
        }
      }
    }
  }

  if (!finalRun) throw new Error('GEO 모니터링 결과를 받지 못했습니다.')
  return finalRun
}

// ── 통계 헬퍼 ───────────────────────────────────────────────────────────────

/** 엔진별·전체 인용률 계산 (클라이언트 사이드 버전) */
export function calcCitationRates(
  results : GeoCheckResult[],
  engines : GeoEngine[],
): { rates: Record<GeoEngine, number>; overall: number } {
  const rates = {} as Record<GeoEngine, number>

  for (const engine of engines) {
    const engineResults = results.filter(r => r.engine === engine && !r.error)
    rates[engine] = engineResults.length > 0
      ? Math.round((engineResults.filter(r => r.cited).length / engineResults.length) * 100)
      : 0
  }

  const valid   = results.filter(r => !r.error)
  const overall = valid.length > 0
    ? Math.round((valid.filter(r => r.cited).length / valid.length) * 100)
    : 0

  return { rates, overall }
}

/** 질의별 인용 요약 */
export function summarizeByQuery(results: GeoCheckResult[]): Array<{
  queryId   : string
  queryText : string
  citedCount: number
  totalCount: number
  engines   : Partial<Record<GeoEngine, { cited: boolean; error?: string }>>
}> {
  const map = new Map<string, {
    queryText : string
    citedCount: number
    totalCount: number
    engines   : Partial<Record<GeoEngine, { cited: boolean; error?: string }>>
  }>()

  for (const r of results) {
    if (!map.has(r.queryId)) {
      map.set(r.queryId, { queryText: r.queryText, citedCount: 0, totalCount: 0, engines: {} })
    }
    const entry = map.get(r.queryId)!
    entry.totalCount++
    if (r.cited) entry.citedCount++
    entry.engines[r.engine] = { cited: r.cited, error: r.error }
  }

  return Array.from(map.entries()).map(([queryId, v]) => ({ queryId, ...v }))
}

/** 가장 많이 나타난 경쟁 도메인 Top 5 */
export function topCompetitors(results: GeoCheckResult[]): Array<{ domain: string; count: number }> {
  const counter = new Map<string, number>()
  for (const r of results) {
    for (const d of r.competitorMentions ?? []) {
      counter.set(d, (counter.get(d) ?? 0) + 1)
    }
  }
  return Array.from(counter.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
