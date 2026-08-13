/**
 * GEO 전후 비교 (P2-3)
 * 두 개의 모니터링 실행 결과를 비교해 인용률 변화를 산출하고
 * 공유 가능한 리포트(HTML / Markdown)를 생성합니다.
 */

import type { GeoEngine, GeoMonitoringRun, GeoAggregatedResult } from '../types'

// ── 타입 ────────────────────────────────────────────────────────────────────

/** 변화 상태 — new/removed는 한쪽 실행에만 존재하는 항목 */
export type DeltaStatus = 'improved' | 'regressed' | 'unchanged' | 'new' | 'removed'

export interface EngineDelta {
  engine      : GeoEngine
  baselineRate: number | null   // null = 해당 실행에서 미측정
  currentRate : number | null
  delta       : number
  status      : DeltaStatus
}

export interface QueryDelta {
  queryText   : string
  baselineRate: number | null
  currentRate : number | null
  delta       : number
  status      : DeltaStatus
  engines     : Array<{
    engine  : GeoEngine
    baseline: number | null
    current : number | null
    delta   : number
  }>
}

export interface GeoComparison {
  baseline    : GeoMonitoringRun
  current     : GeoMonitoringRun
  daysBetween : number
  overallDelta: number
  engineDeltas: EngineDelta[]
  queryDeltas : QueryDelta[]
  /** 두 실행 중 하나라도 1회 측정이면 델타가 노이즈일 수 있음 */
  lowConfidence: boolean
  /**
   * 두 실행의 엔진 구성이 다름 — 질의 평균이 엔진 조합 변화만으로도 움직이므로
   * 델타를 실제 개선/하락으로 읽으면 안 됨
   */
  engineSetChanged: boolean
  /** 양쪽 실행에 공통으로 존재하는 엔진 (동일 조건 비교 가능한 집합) */
  commonEngines: GeoEngine[]
  summary: {
    improvedCount : number
    regressedCount: number
    unchangedCount: number
    newCount      : number
    removedCount  : number
    biggestGain?  : QueryDelta
    biggestLoss?  : QueryDelta
    newCitedUrls  : string[]
    lostCitedUrls : string[]
    newCompetitors: string[]
  }
}

// ── 내부 헬퍼 ───────────────────────────────────────────────────────────────

/** 질의의 의미적 동일성은 텍스트로 판단 (queryId는 재생성 시 바뀜) */
function queryKey(text: string): string {
  return text.trim().toLowerCase()
}

function classify(baseline: number | null, current: number | null): DeltaStatus {
  if (baseline === null && current !== null) return 'new'
  if (baseline !== null && current === null) return 'removed'
  if (baseline === null || current === null) return 'unchanged'
  if (current > baseline) return 'improved'
  if (current < baseline) return 'regressed'
  return 'unchanged'
}

function safeDelta(baseline: number | null, current: number | null): number {
  if (baseline === null || current === null) return 0
  return current - baseline
}

/** 질의 텍스트 → 엔진별 집계 결과 맵 */
function indexByQuery(aggregated: GeoAggregatedResult[]): Map<string, {
  text   : string
  engines: Map<GeoEngine, GeoAggregatedResult>
}> {
  const map = new Map<string, { text: string; engines: Map<GeoEngine, GeoAggregatedResult> }>()
  for (const r of aggregated) {
    const key = queryKey(r.queryText)
    if (!map.has(key)) map.set(key, { text: r.queryText, engines: new Map() })
    map.get(key)!.engines.set(r.engine, r)
  }
  return map
}

/**
 * 오류가 아닌 결과의 평균 인용률 — 전부 오류면 null.
 * `only`가 주어지면 해당 엔진만 집계한다(양쪽 실행의 공통 엔진으로 맞추기 위함).
 */
function avgRate(results: GeoAggregatedResult[], only?: Set<GeoEngine>): number | null {
  const valid = results.filter(r => !r.error && (!only || only.has(r.engine)))
  if (valid.length === 0) return null
  return Math.round(valid.reduce((s, r) => s + r.citationRate, 0) / valid.length)
}

function collectCitedUrls(run: GeoMonitoringRun): Set<string> {
  return new Set((run.aggregated ?? []).flatMap(r => r.allCitedUrls ?? []))
}

function collectCompetitors(run: GeoMonitoringRun): Set<string> {
  return new Set((run.aggregated ?? []).flatMap(r => r.competitorMentions ?? []))
}

// ── 비교 ────────────────────────────────────────────────────────────────────

export function compareRuns(baseline: GeoMonitoringRun, current: GeoMonitoringRun): GeoComparison {
  const baseIdx = indexByQuery(baseline.aggregated ?? [])
  const currIdx = indexByQuery(current.aggregated ?? [])

  // ── 엔진별 델타 ──────────────────────────────────────────────
  const allEngines = Array.from(new Set([
    ...Object.keys(baseline.citationRates ?? {}),
    ...Object.keys(current.citationRates ?? {}),
  ])) as GeoEngine[]

  const engineDeltas: EngineDelta[] = allEngines.map(engine => {
    const b = baseline.citationRates?.[engine] ?? null
    const c = current.citationRates?.[engine] ?? null
    return { engine, baselineRate: b, currentRate: c, delta: safeDelta(b, c), status: classify(b, c) }
  })

  // ── 공통 엔진 ────────────────────────────────────────────────
  // 엔진 구성이 다르면 질의 평균이 조합 변화만으로도 움직인다.
  // 동일 조건 비교를 위해 양쪽에 모두 존재하는 엔진으로만 질의 평균을 낸다.
  const commonEngines = engineDeltas
    .filter(e => e.baselineRate !== null && e.currentRate !== null)
    .map(e => e.engine)
  const engineSetChanged = commonEngines.length !== allEngines.length
  // 겹치는 엔진이 아예 없으면 필터링이 무의미하므로 전체를 사용
  const engineFilter = commonEngines.length > 0 ? new Set(commonEngines) : undefined

  // ── 질의별 델타 ──────────────────────────────────────────────
  const allKeys = Array.from(new Set([...baseIdx.keys(), ...currIdx.keys()]))

  const queryDeltas: QueryDelta[] = allKeys.map(key => {
    const b = baseIdx.get(key)
    const c = currIdx.get(key)
    const text = c?.text ?? b?.text ?? key

    const baselineRate = b ? avgRate(Array.from(b.engines.values()), engineFilter) : null
    const currentRate  = c ? avgRate(Array.from(c.engines.values()), engineFilter) : null

    const engineKeys = Array.from(new Set([
      ...(b ? Array.from(b.engines.keys()) : []),
      ...(c ? Array.from(c.engines.keys()) : []),
    ]))

    const engines = engineKeys.map(engine => {
      const br = b?.engines.get(engine)
      const cr = c?.engines.get(engine)
      const bv = br && !br.error ? br.citationRate : null
      const cv = cr && !cr.error ? cr.citationRate : null
      return { engine, baseline: bv, current: cv, delta: safeDelta(bv, cv) }
    })

    return {
      queryText: text,
      baselineRate,
      currentRate,
      delta : safeDelta(baselineRate, currentRate),
      status: classify(baselineRate, currentRate),
      engines,
    }
  }).sort((a, b) => b.delta - a.delta)

  // ── 요약 ────────────────────────────────────────────────────
  const changed  = queryDeltas.filter(q => q.status === 'improved' || q.status === 'regressed')
  const gains    = changed.filter(q => q.delta > 0)
  const losses   = changed.filter(q => q.delta < 0)

  const baseUrls = collectCitedUrls(baseline)
  const currUrls = collectCitedUrls(current)
  const baseComp = collectCompetitors(baseline)
  const currComp = collectCompetitors(current)

  const daysBetween = Math.max(0, Math.round(
    (new Date(current.runAt).getTime() - new Date(baseline.runAt).getTime()) / 86_400_000
  ))

  return {
    baseline,
    current,
    daysBetween,
    overallDelta: current.overallCitationRate - baseline.overallCitationRate,
    engineDeltas,
    queryDeltas,
    lowConfidence: (baseline.repeatCount ?? 1) === 1 || (current.repeatCount ?? 1) === 1,
    engineSetChanged,
    commonEngines,
    summary: {
      improvedCount : gains.length,
      regressedCount: losses.length,
      unchangedCount: queryDeltas.filter(q => q.status === 'unchanged').length,
      newCount      : queryDeltas.filter(q => q.status === 'new').length,
      removedCount  : queryDeltas.filter(q => q.status === 'removed').length,
      biggestGain   : gains[0],
      biggestLoss   : losses[losses.length - 1],
      newCitedUrls  : Array.from(currUrls).filter(u => !baseUrls.has(u)),
      lostCitedUrls : Array.from(baseUrls).filter(u => !currUrls.has(u)),
      newCompetitors: Array.from(currComp).filter(d => !baseComp.has(d)),
    },
  }
}

// ── 표기 헬퍼 ───────────────────────────────────────────────────────────────

const ENGINE_LABEL: Record<GeoEngine, string> = {
  perplexity: 'Perplexity',
  chatgpt   : 'ChatGPT',
  claude    : 'Claude',
  gemini    : 'Gemini',
  naver     : '네이버 AI',
}

export function engineLabel(engine: GeoEngine): string {
  return ENGINE_LABEL[engine] ?? engine
}

export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}%p`
  if (delta < 0) return `${delta}%p`
  return '변화 없음'
}

/**
 * 변화량 표기 — 신규/제외 항목은 비교 대상이 없으므로 델타 대신 사유를 표시.
 * (delta 0을 "변화 없음"으로 적으면 실제로 비교되지 않은 항목을 오독하게 됨)
 */
export function formatDeltaWithStatus(delta: number, status: DeltaStatus): string {
  if (status === 'new')     return '신규 (비교 불가)'
  if (status === 'removed') return '제외 (비교 불가)'
  return formatDelta(delta)
}

function rateText(rate: number | null): string {
  return rate === null ? '미측정' : `${rate}%`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR')
}

// ── Markdown 리포트 ─────────────────────────────────────────────────────────

export function buildComparisonMarkdown(cmp: GeoComparison): string {
  const { baseline, current, summary } = cmp
  const arrow = cmp.overallDelta > 0 ? '📈' : cmp.overallDelta < 0 ? '📉' : '➡️'

  const lines: string[] = [
    `# AI 인용률 전후 비교 — ${current.targetBrand}`,
    ``,
    `**도메인:** ${current.targetDomain}`,
    `**비교 기간:** ${fmtDate(baseline.runAt)} → ${fmtDate(current.runAt)} (${cmp.daysBetween}일)`,
    ``,
    `## ${arrow} 전체 인용률`,
    ``,
    `| 구분 | 인용률 | 반복 |`,
    `| --- | ---: | ---: |`,
    `| 이전 | ${baseline.overallCitationRate}% | ${baseline.repeatCount ?? 1}회 |`,
    `| 현재 | ${current.overallCitationRate}% | ${current.repeatCount ?? 1}회 |`,
    `| **변화** | **${formatDelta(cmp.overallDelta)}** | |`,
    ``,
  ]

  if (cmp.lowConfidence) {
    lines.push(
      `> ⚠️ 두 측정 중 하나 이상이 1회 실행입니다. LLM 응답의 비결정성 때문에 이 변화는 실제 개선이 아닌 노이즈일 수 있습니다. 3회 이상 반복 측정을 권장합니다.`,
      ``,
    )
  }

  if (cmp.engineSetChanged) {
    lines.push(
      `> ⚠️ 두 측정의 **AI 엔진 구성이 다릅니다**. 전체 인용률은 각 실행의 엔진 조합 전체를 반영하므로 그 차이만으로도 수치가 움직일 수 있습니다.`,
      `> 아래 **질의별 상세**는 양쪽에 공통으로 측정된 엔진(${cmp.commonEngines.map(engineLabel).join(', ') || '없음'})만으로 계산해 동일 조건으로 비교했습니다.`,
      ``,
    )
  }

  // 엔진별
  lines.push(`## 엔진별 변화`, ``, `| 엔진 | 이전 | 현재 | 변화 |`, `| --- | ---: | ---: | ---: |`)
  for (const e of cmp.engineDeltas) {
    lines.push(`| ${engineLabel(e.engine)} | ${rateText(e.baselineRate)} | ${rateText(e.currentRate)} | ${formatDeltaWithStatus(e.delta, e.status)} |`)
  }
  lines.push(``)

  // 요약
  lines.push(
    `## 질의 변화 요약`,
    ``,
    `- 개선: ${summary.improvedCount}개`,
    `- 하락: ${summary.regressedCount}개`,
    `- 유지: ${summary.unchangedCount}개`,
  )
  if (summary.newCount > 0)     lines.push(`- 신규 질의: ${summary.newCount}개`)
  if (summary.removedCount > 0) lines.push(`- 제외된 질의: ${summary.removedCount}개`)
  lines.push(``)

  if (summary.biggestGain) {
    lines.push(`**가장 크게 개선된 질의**`, `> "${summary.biggestGain.queryText}" — ${formatDelta(summary.biggestGain.delta)}`, ``)
  }
  if (summary.biggestLoss) {
    lines.push(`**가장 크게 하락한 질의**`, `> "${summary.biggestLoss.queryText}" — ${formatDelta(summary.biggestLoss.delta)}`, ``)
  }

  // 질의별 상세
  lines.push(`## 질의별 상세`, ``, `| 질의 | 이전 | 현재 | 변화 |`, `| --- | ---: | ---: | ---: |`)
  for (const q of cmp.queryDeltas) {
    const label = q.status === 'new' ? ' *(신규)*' : q.status === 'removed' ? ' *(제외)*' : ''
    lines.push(`| ${q.queryText.replace(/\|/g, '\\|')}${label} | ${rateText(q.baselineRate)} | ${rateText(q.currentRate)} | ${formatDeltaWithStatus(q.delta, q.status)} |`)
  }
  lines.push(``)

  if (summary.newCitedUrls.length > 0) {
    lines.push(`## 🆕 새로 인용된 URL`, ``, ...summary.newCitedUrls.slice(0, 10).map(u => `- ${u}`), ``)
  }
  if (summary.lostCitedUrls.length > 0) {
    lines.push(`## ⚠️ 인용이 사라진 URL`, ``, ...summary.lostCitedUrls.slice(0, 10).map(u => `- ${u}`), ``)
  }
  if (summary.newCompetitors.length > 0) {
    lines.push(`## 신규 등장 경쟁 도메인`, ``, ...summary.newCompetitors.slice(0, 10).map(d => `- ${d}`), ``)
  }

  lines.push(
    `---`,
    ``,
    `본 수치는 AI 엔진 응답을 실측한 SEOGEO 자체 지표이며, 각 AI 서비스의 공식 노출 지표가 아닙니다.`,
    `생성: ${new Date().toLocaleString('ko-KR')} · AI SEO Analyzer (SEOGEO)`,
  )

  return lines.join('\n')
}

// ── HTML 리포트 ─────────────────────────────────────────────────────────────

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function deltaColor(delta: number): string {
  return delta > 0 ? '#16a085' : delta < 0 ? '#dd5b67' : '#8891a3'
}

export function buildComparisonHtml(cmp: GeoComparison, options: { showToolbar?: boolean } = {}): string {
  const { baseline, current, summary } = cmp
  const generatedAt = new Date().toLocaleString('ko-KR')
  const dc = deltaColor(cmp.overallDelta)

  const engineRows = cmp.engineDeltas.map(e => {
    const uncomparable = e.status === 'new' || e.status === 'removed'
    return `<tr>
<td>${escapeHtml(engineLabel(e.engine))}</td>
<td class="num">${rateText(e.baselineRate)}</td>
<td class="num">${rateText(e.currentRate)}</td>
<td class="num" style="color:${uncomparable ? '#8891a3' : deltaColor(e.delta)};font-weight:${uncomparable ? '500' : '800'}">${escapeHtml(formatDeltaWithStatus(e.delta, e.status))}</td>
</tr>`
  }).join('')

  const queryRows = cmp.queryDeltas.map(q => {
    const badge =
      q.status === 'new'      ? '<span class="badge new">신규</span>' :
      q.status === 'removed'  ? '<span class="badge removed">제외</span>' : ''
    const isUncomparable = q.status === 'new' || q.status === 'removed'
    return `<tr>
<td>${escapeHtml(q.queryText)} ${badge}</td>
<td class="num">${rateText(q.baselineRate)}</td>
<td class="num">${rateText(q.currentRate)}</td>
<td class="num" style="color:${isUncomparable ? '#8891a3' : deltaColor(q.delta)};font-weight:${isUncomparable ? '500' : '800'}">${escapeHtml(formatDeltaWithStatus(q.delta, q.status))}</td>
</tr>`
  }).join('')

  const noiseHtml = cmp.lowConfidence
    ? `<div class="warn">⚠️ 두 측정 중 하나 이상이 <b>1회 실행</b>입니다. LLM 응답의 비결정성 때문에 이 변화는 실제 개선이 아닌 측정 노이즈일 수 있습니다. 3회 이상 반복 측정을 권장합니다.</div>`
    : ''

  const engineChangeHtml = cmp.engineSetChanged
    ? `<div class="warn">⚠️ 두 측정의 <b>AI 엔진 구성이 다릅니다.</b> 위 전체 인용률은 각 실행의 엔진 조합 전체를 반영하므로, 엔진이 추가·제외된 것만으로도 수치가 움직일 수 있습니다.
아래 <b>질의별 인용률 변화</b>는 양쪽에 공통으로 측정된 엔진(${escapeHtml(cmp.commonEngines.map(engineLabel).join(', ') || '없음')})만으로 계산해 동일 조건으로 비교했습니다.</div>`
    : ''

  const urlSection = (title: string, urls: string[], cls: string) => urls.length
    ? `<section class="section"><h2>${escapeHtml(title)}</h2><ul class="urls ${cls}">${
        urls.slice(0, 12).map(u => `<li>${escapeHtml(u)}</li>`).join('')
      }</ul></section>`
    : ''

  const competitorSection = summary.newCompetitors.length
    ? `<section class="section"><h2>신규 등장 경쟁 도메인</h2><div class="chips">${
        summary.newCompetitors.slice(0, 12).map(d => `<span>${escapeHtml(d)}</span>`).join('')
      }</div><p class="note">이전 측정에는 없었으나 이번 측정에서 AI가 함께 언급한 도메인입니다.</p></section>`
    : ''

  const highlightHtml = [
    summary.biggestGain ? `<div class="hl gain"><span>가장 크게 개선</span><b>${escapeHtml(summary.biggestGain.queryText)}</b><i>${formatDelta(summary.biggestGain.delta)}</i></div>` : '',
    summary.biggestLoss ? `<div class="hl loss"><span>가장 크게 하락</span><b>${escapeHtml(summary.biggestLoss.queryText)}</b><i>${formatDelta(summary.biggestLoss.delta)}</i></div>` : '',
  ].filter(Boolean).join('')

  const toolbarHtml = options.showToolbar === false ? '' : '<div class="toolbar"><button onclick="window.print()">PDF로 인쇄</button></div>'

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(current.targetBrand)} AI 인용률 전후 비교</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f4f6fa;color:#17213f;font-family:'Segoe UI',Manrope,'Noto Sans KR',system-ui,sans-serif}
.toolbar{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;padding:12px 24px;background:#fff;border-bottom:1px solid #e5e8ef}
.toolbar button{border:0;border-radius:8px;background:#3157d5;color:#fff;padding:10px 16px;font-weight:700;cursor:pointer}
.report{width:min(1040px,calc(100% - 32px));margin:24px auto 48px;background:#fff;border:1px solid #e2e6ee;border-radius:12px;box-shadow:0 12px 36px rgba(28,39,76,.08);overflow:hidden}
.cover{padding:42px 48px 34px;border-top:7px solid #3157d5;border-bottom:1px solid #e5e8ef}
.cover small{color:#3157d5;letter-spacing:.14em;font-weight:800;font-size:10px}
.cover h1{font-size:28px;line-height:1.35;margin:16px 0 6px}
.cover p{margin:0;color:#737d91;font-size:13px}
.cover .meta{display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:26px;color:#7f899c;font-size:11px}
.section{padding:30px 48px;border-bottom:1px solid #e8ebf1}
.section h2{font-size:17px;margin:0 0 16px}
.hero{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:12px}
.hero div{padding:20px;border-radius:9px;background:#f7f8fb;border:1px solid #e4e7ee}
.hero span{font-size:10px;color:#727d91;font-weight:700;display:block}
.hero b{display:block;font-size:40px;margin-top:10px;line-height:1;font-variant-numeric:tabular-nums}
.hero b small{font-size:13px;color:#929aab;font-weight:500}
.hero .cap{font-size:10px;color:#8891a3;margin-top:8px;display:block}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:10px 12px;background:#f7f8fb;color:#59647b;font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e9ef}
td{padding:10px 12px;border-bottom:1px solid #eef0f5}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.badge{font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;margin-left:4px}
.badge.new{background:#e8f6f1;color:#16a085}
.badge.removed{background:#f1f3f7;color:#8891a3}
.warn{padding:14px 16px;border-radius:8px;background:#fff8e8;border:1px solid #f2dfae;color:#7a5c17;font-size:12px;line-height:1.6;margin-top:16px}
.hls{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.hl{padding:16px;border-radius:9px;border:1px solid #e4e7ee}
.hl.gain{background:#f2fbf8;border-color:#c6e9de}
.hl.loss{background:#fdf4f5;border-color:#f2ccd1}
.hl span{font-size:10px;font-weight:700;color:#727d91;display:block}
.hl b{display:block;font-size:13px;margin:6px 0;line-height:1.5}
.hl i{font-style:normal;font-weight:800;font-size:16px}
.hl.gain i{color:#16a085}
.hl.loss i{color:#dd5b67}
.urls{list-style:none;padding:0;margin:0;display:grid;gap:6px}
.urls li{font-size:11px;padding:8px 12px;border-radius:6px;background:#f7f8fb;border:1px solid #e8ebf1;word-break:break-all}
.urls.lost li{background:#fdf4f5;border-color:#f2ccd1}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chips span{font-size:11px;padding:5px 10px;border-radius:99px;background:#fdf4f5;border:1px solid #f2ccd1;color:#b4515e;font-weight:600}
.note{color:#8a93a5;font-size:10px;margin-top:10px}
.footer{padding:22px 48px;color:#8891a3;font-size:9px;line-height:1.65;background:#fafbfc}
@media(max-width:700px){.cover,.section{padding:24px}.cover h1{font-size:23px}.hero,.hls{grid-template-columns:1fr}}
@media print{body{background:#fff}.toolbar{display:none}.report{width:100%;margin:0;box-shadow:none;border:0;border-radius:0}.section{break-inside:avoid}}
</style></head><body>${toolbarHtml}<main class="report">

<section class="cover">
<small>SEOGEO · AI 인용률 전후 비교 리포트</small>
<h1>${escapeHtml(current.targetBrand)}</h1>
<p>${escapeHtml(current.targetDomain)}</p>
<div class="meta">
<span>이전 측정 ${escapeHtml(fmtDate(baseline.runAt))}</span>
<span>현재 측정 ${escapeHtml(fmtDate(current.runAt))}</span>
<span>측정 간격 ${cmp.daysBetween}일</span>
<span>리포트 생성 ${escapeHtml(generatedAt)}</span>
</div>
</section>

<section class="section">
<h2>전체 인용률 변화</h2>
<div class="hero">
<div><span>이전</span><b>${baseline.overallCitationRate}<small>%</small></b><span class="cap">${baseline.repeatCount ?? 1}회 반복 측정</span></div>
<div><span>현재</span><b>${current.overallCitationRate}<small>%</small></b><span class="cap">${current.repeatCount ?? 1}회 반복 측정</span></div>
<div><span>변화</span><b style="color:${dc}">${escapeHtml(formatDelta(cmp.overallDelta))}</b><span class="cap">${cmp.daysBetween}일간 · 개선 ${summary.improvedCount} / 하락 ${summary.regressedCount} / 유지 ${summary.unchangedCount}</span></div>
</div>
${noiseHtml}
${engineChangeHtml}
</section>

${highlightHtml ? `<section class="section"><h2>주요 변화</h2><div class="hls">${highlightHtml}</div></section>` : ''}

<section class="section">
<h2>엔진별 인용률 변화</h2>
<table><thead><tr><th>엔진</th><th class="num">이전</th><th class="num">현재</th><th class="num">변화</th></tr></thead>
<tbody>${engineRows}</tbody></table>
</section>

<section class="section">
<h2>질의별 인용률 변화</h2>
<table><thead><tr><th>질의</th><th class="num">이전</th><th class="num">현재</th><th class="num">변화</th></tr></thead>
<tbody>${queryRows}</tbody></table>
</section>

${urlSection('🆕 새로 인용된 URL', summary.newCitedUrls, 'new')}
${urlSection('⚠️ 인용이 사라진 URL', summary.lostCitedUrls, 'lost')}
${competitorSection}

<section class="footer">
본 리포트의 인용률은 Perplexity·ChatGPT·Claude·Gemini·네이버 AI 등 생성형 검색엔진에 실제로 질의하여 응답에 브랜드/도메인이 등장하는 비율을 측정한 SEOGEO 자체 지표입니다.
각 AI 서비스의 공식 노출·순위 지표가 아니며, LLM 응답은 동일 질의에도 매번 달라질 수 있습니다. 신뢰할 수 있는 추세 판단을 위해 3회 이상 반복 측정과 2주 이상의 측정 간격을 권장합니다.
</section>
</main></body></html>`
}

export function comparisonFileName(cmp: GeoComparison): string {
  const domain = cmp.current.targetDomain.replace(/^https?:\/\//, '').split('/')[0].replace(/[^a-zA-Z0-9.-]/g, '_')
  const date   = new Date(cmp.current.runAt).toISOString().slice(0, 10)
  return `geo-comparison-${domain}-${date}.html`
}
