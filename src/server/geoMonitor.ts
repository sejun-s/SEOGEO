/**
 * GEO Monitoring Engine (Module C) — v2
 * AI 인용률 실측 엔진 — Perplexity / ChatGPT / Claude / Gemini
 *
 * P0-1: Perplexity citations[] URL 기반 정확도 향상
 * P0-2: 반복 실행 (1/3/5회) + 인용률 % + 신뢰도 레벨
 * P0-3: 브랜드 동의어 등록 → 감지 정확도 2~3x
 */

import type { GeoEngine, GeoQuery, GeoCheckResult, GeoAggregatedResult, GeoConfidence } from '../types.ts'

// ── 공통 타입 ──────────────────────────────────────────────────────────────

interface PerplexityResponse {
  choices?  : Array<{ message?: { content?: string } }>
  citations?: string[]   // P0-1: 실제 인용 URL 배열
}

// ── P0-1: 인용 감지 (텍스트 + citations[] URL + 동의어) ──────────────────

function buildSearchTerms(
  targetDomain  : string,
  targetBrand   : string,
  brandSynonyms : string[],
): string[] {
  const domain     = targetDomain.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
  const domainRoot = domain.replace(/^www\./, '').split('.')[0]
  const terms      = new Set<string>()

  // 도메인 변형
  if (domain)     terms.add(domain)
  if (domainRoot) terms.add(domainRoot)

  // 브랜드 + 동의어
  if (targetBrand) terms.add(targetBrand.toLowerCase())
  for (const syn of brandSynonyms) {
    if (syn.trim()) terms.add(syn.trim().toLowerCase())
  }

  return Array.from(terms).filter(t => t.length > 1)
}

function detectCitation(
  text          : string,
  targetDomain  : string,
  targetBrand   : string,
  brandSynonyms : string[],
  citationUrls  : string[],   // P0-1: Perplexity API citations[]
): { cited: boolean; mentionCount: number; snippet: string | undefined; citedUrls: string[] } {
  const terms = buildSearchTerms(targetDomain, targetBrand, brandSynonyms)
  const lower = text.toLowerCase()

  let totalCount   = 0
  let firstMatchIdx = -1

  for (const term of terms) {
    let idx = 0
    while ((idx = lower.indexOf(term, idx)) !== -1) {
      totalCount++
      if (firstMatchIdx === -1) firstMatchIdx = idx
      idx += term.length
    }
  }

  // P0-1: citations[] URL에서도 도메인 감지
  const matchedUrls: string[] = []
  for (const url of citationUrls) {
    const urlLower = url.toLowerCase()
    if (terms.some(t => urlLower.includes(t))) {
      matchedUrls.push(url)
      totalCount++  // URL 인용도 카운트
      if (firstMatchIdx === -1) firstMatchIdx = 0  // URL 인용이면 응답 시작부터
    }
  }

  const snippet =
    firstMatchIdx !== -1
      ? text.slice(Math.max(0, firstMatchIdx - 80), firstMatchIdx + 150).trim()
      : undefined

  return {
    cited       : totalCount > 0,
    mentionCount: totalCount,
    snippet,
    citedUrls   : matchedUrls,
  }
}

function extractCompetitorDomains(text: string, excludeDomain: string): string[] {
  const domainRegex = /https?:\/\/([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/g
  const plain       = /\b([a-zA-Z0-9-]+\.(?:com|co\.kr|io|net|org|kr))\b/g
  const found       = new Set<string>()
  const exclude     = excludeDomain.replace(/^www\./, '').toLowerCase()

  for (const rx of [domainRegex, plain]) {
    let m: RegExpExecArray | null
    while ((m = rx.exec(text)) !== null) {
      const d = m[1].replace(/^www\./, '').toLowerCase()
      if (d && !d.includes(exclude) && !['google.com', 'bing.com', 'naver.com'].includes(d)) {
        found.add(d)
        if (found.size >= 5) break
      }
    }
  }

  return Array.from(found)
}

// ── Perplexity (P0-1: citations[] 추출) ────────────────────────────────────

async function queryPerplexity(
  queryText: string,
  apiKey   : string,
): Promise<{ text: string; citationUrls: string[] }> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model           : 'sonar',
      messages        : [
        {
          role   : 'system',
          content: '당신은 웹 검색 기반 AI 어시스턴트입니다. 사용자의 질문에 대해 관련 웹사이트와 출처를 명시하며 상세히 답변하세요.',
        },
        { role: 'user', content: queryText },
      ],
      max_tokens      : 800,
      return_citations: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Perplexity API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as PerplexityResponse
  return {
    text       : data.choices?.[0]?.message?.content ?? '',
    citationUrls: data.citations ?? [],   // P0-1: 실제 인용 URL 배열
  }
}

// ── OpenAI (ChatGPT) ───────────────────────────────────────────────────────

async function queryOpenAI(
  queryText: string,
  apiKey   : string,
): Promise<{ text: string; citationUrls: string[] }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model     : 'gpt-4o-mini',
      messages  : [
        {
          role   : 'system',
          content: '당신은 검색 어시스턴트입니다. 사용자의 질문에 대해 관련 웹사이트와 브랜드를 구체적으로 언급하며 답변하세요.',
        },
        { role: 'user', content: queryText },
      ],
      max_tokens: 600,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return { text: data.choices?.[0]?.message?.content ?? '', citationUrls: [] }
}

// ── Claude ─────────────────────────────────────────────────────────────────

async function queryClaude(
  queryText: string,
  apiKey   : string,
): Promise<{ text: string; citationUrls: string[] }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method : 'POST',
    headers: {
      'Content-Type'     : 'application/json',
      'x-api-key'        : apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model     : 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system    : '당신은 웹 검색 기반 AI 어시스턴트입니다. 사용자의 질문에 관련 웹사이트, 브랜드, 도메인을 포함하여 답변하세요.',
      messages  : [{ role: 'user', content: queryText }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { content?: Array<{ type: string; text?: string }> }
  return {
    text: (data.content ?? []).filter(b => b.type === 'text').map(b => b.text ?? '').join(''),
    citationUrls: [],
  }
}

// ── Gemini ─────────────────────────────────────────────────────────────────

async function queryGemini(
  queryText: string,
  apiKey   : string,
): Promise<{ text: string; citationUrls: string[] }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        contents       : [{ parts: [{ text: `당신은 웹 검색 기반 AI 어시스턴트입니다. 관련 웹사이트와 브랜드를 명시하며 답변하세요.\n\n${queryText}` }] }],
        generationConfig: { maxOutputTokens: 600 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '', citationUrls: [] }
}

// ── 단일 실행 ───────────────────────────────────────────────────────────────

async function runSingleCheck(
  query        : GeoQuery,
  engine       : GeoEngine,
  target       : { domain: string; brand: string; synonyms: string[] },
  apiKeys      : Partial<Record<GeoEngine, string>>,
): Promise<GeoCheckResult> {
  const now = new Date().toISOString()
  const key = apiKeys[engine]

  if (!key) {
    return {
      queryId          : query.id,
      queryText        : query.text,
      engine,
      cited            : false,
      mentionCount     : 0,
      citedUrls        : [],
      competitorMentions: [],
      responsePreview  : '',
      checkedAt        : now,
      error            : `${engine} API 키가 설정되지 않았습니다.`,
    }
  }

  try {
    let responseText = ''
    let apiCitationUrls: string[] = []

    switch (engine) {
      case 'perplexity': {
        const r = await queryPerplexity(query.text, key)
        responseText    = r.text
        apiCitationUrls = r.citationUrls
        break
      }
      case 'chatgpt': {
        const r = await queryOpenAI(query.text, key)
        responseText = r.text
        break
      }
      case 'claude': {
        const r = await queryClaude(query.text, key)
        responseText = r.text
        break
      }
      case 'gemini': {
        const r = await queryGemini(query.text, key)
        responseText = r.text
        break
      }
    }

    const { cited, mentionCount, snippet, citedUrls } = detectCitation(
      responseText, target.domain, target.brand, target.synonyms, apiCitationUrls,
    )

    return {
      queryId            : query.id,
      queryText          : query.text,
      engine,
      cited,
      mentionCount,
      citationSnippet    : snippet,
      citedUrls,
      competitorMentions : extractCompetitorDomains(responseText, target.domain),
      responsePreview    : responseText.slice(0, 300),
      checkedAt          : now,
    }
  } catch (err) {
    return {
      queryId            : query.id,
      queryText          : query.text,
      engine,
      cited              : false,
      mentionCount       : 0,
      citedUrls          : [],
      competitorMentions : [],
      responsePreview    : '',
      checkedAt          : now,
      error              : String(err),
    }
  }
}

// ── P0-2: 반복 실행 집계 ────────────────────────────────────────────────────

function getConfidence(repeatCount: number, citedCount: number): GeoConfidence {
  if (repeatCount <= 1) return 'low'
  if (repeatCount <= 3) return citedCount === 0 || citedCount === repeatCount ? 'medium' : 'low'
  // 5회 이상
  return 'high'
}

async function runWithRepeat(
  query       : GeoQuery,
  engine      : GeoEngine,
  target      : { domain: string; brand: string; synonyms: string[] },
  apiKeys     : Partial<Record<GeoEngine, string>>,
  repeatCount : number,
): Promise<GeoAggregatedResult> {
  const runs: GeoCheckResult[] = []

  for (let i = 0; i < repeatCount; i++) {
    const r = await runSingleCheck(query, engine, target, apiKeys)
    runs.push(r)
    // 오류면 즉시 중단
    if (r.error && i === 0) break
  }

  const errored    = runs.filter(r => !!r.error)
  const valid      = runs.filter(r => !r.error)
  const citedRuns  = valid.filter(r => r.cited)
  const citedCount = citedRuns.length
  const actualN    = valid.length || 1

  const allCitedUrls = Array.from(
    new Set(citedRuns.flatMap(r => r.citedUrls ?? []))
  )
  const allCompetitors = Array.from(
    new Set(runs.flatMap(r => r.competitorMentions))
  ).slice(0, 5)

  // P1-2: 가장 잘 인용된 run의 snippet 선택
  const bestSnippet = citedRuns.find(r => r.citationSnippet)?.citationSnippet

  return {
    queryId        : query.id,
    queryText      : query.text,
    engine,
    repeatCount    : actualN,
    citedCount,
    citationRate   : Math.round((citedCount / actualN) * 100),
    confidence     : getConfidence(actualN, citedCount),
    allCitedUrls,
    competitorMentions: allCompetitors,
    responsePreview : runs[0]?.responsePreview ?? '',
    bestSnippet,
    error           : errored.length === runs.length ? runs[0]?.error : undefined,
  }
}

// ── 퍼블릭 API ─────────────────────────────────────────────────────────────

export interface RunGeoMonitorOptions {
  targetDomain  : string
  targetBrand   : string
  brandSynonyms : string[]        // P0-3
  queries       : GeoQuery[]
  engines       : GeoEngine[]
  repeatCount   : number          // P0-2: 1 | 3 | 5
  apiKeys       : Partial<Record<GeoEngine, string>>
  emit?         : (event: object) => void
}

export async function runGeoMonitor(opts: RunGeoMonitorOptions): Promise<GeoAggregatedResult[]> {
  const { targetDomain, targetBrand, brandSynonyms, queries, engines, repeatCount, apiKeys, emit } = opts
  const aggregated: GeoAggregatedResult[] = []
  const total = queries.length * engines.length
  let done    = 0

  const target = { domain: targetDomain, brand: targetBrand, synonyms: brandSynonyms }

  for (const query of queries) {
    for (const engine of engines) {
      emit?.({
        type  : 'geo-progress',
        done,
        total,
        engine,
        query : query.text,
        pct   : Math.round((done / total) * 100),
        ts    : Date.now(),
      })

      // P0-2: repeatCount 회 반복 실행
      const result = await runWithRepeat(query, engine, target, apiKeys, repeatCount)
      aggregated.push(result)
      done++
    }
  }

  emit?.({ type: 'geo-progress', done: total, total, pct: 100, ts: Date.now() })
  return aggregated
}

/** 엔진별·전체 평균 인용률 계산 */
export function calcCitationRates(
  aggregated: GeoAggregatedResult[],
  engines   : GeoEngine[],
): { rates: Partial<Record<GeoEngine, number>>; overall: number } {
  const rates: Partial<Record<GeoEngine, number>> = {}

  for (const engine of engines) {
    const engineResults = aggregated.filter(r => r.engine === engine && !r.error)
    rates[engine] = engineResults.length > 0
      ? Math.round(engineResults.reduce((sum, r) => sum + r.citationRate, 0) / engineResults.length)
      : 0
  }

  const valid   = aggregated.filter(r => !r.error)
  const overall = valid.length > 0
    ? Math.round(valid.reduce((sum, r) => sum + r.citationRate, 0) / valid.length)
    : 0

  return { rates, overall }
}
