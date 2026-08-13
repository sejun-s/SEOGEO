/**
 * GEO Monitoring Engine (Module C)
 * AI 인용률 실측 엔진 — Perplexity / ChatGPT / Claude / Gemini
 *
 * 각 LLM에 실제 질의를 날려 도메인/브랜드 언급 여부를 감지한다.
 */

import type { GeoEngine, GeoQuery, GeoCheckResult } from '../types.ts'

// ── 인용 감지 ──────────────────────────────────────────────────────────────

function detectCitation(
  text: string,
  targetDomain: string,
  targetBrand: string,
): { cited: boolean; mentionCount: number; snippet: string | undefined } {
  const domain = targetDomain.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
  const brand  = targetBrand.toLowerCase()
  const lower  = text.toLowerCase()

  // 도메인 패턴 (puretechstore.com, puretechstore, www.puretechstore.com)
  const domainRoot = domain.replace(/^www\./, '').split('.')[0]
  const patterns   = [domain, domainRoot, brand].filter(Boolean)

  let totalCount = 0
  let firstMatchIdx = -1

  for (const pat of patterns) {
    if (!pat) continue
    let idx = 0
    while ((idx = lower.indexOf(pat, idx)) !== -1) {
      totalCount++
      if (firstMatchIdx === -1) firstMatchIdx = idx
      idx += pat.length
    }
  }

  const snippet =
    firstMatchIdx !== -1
      ? text.slice(Math.max(0, firstMatchIdx - 80), firstMatchIdx + 150).trim()
      : undefined

  return { cited: totalCount > 0, mentionCount: totalCount, snippet }
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

// ── Perplexity ─────────────────────────────────────────────────────────────

async function queryPerplexity(
  queryText: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method : 'POST',
    headers: {
      'Content-Type' : 'application/json',
      Authorization  : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model   : 'sonar',
      messages: [
        {
          role   : 'system',
          content: '당신은 웹 검색 기반 AI 어시스턴트입니다. 사용자의 질문에 대해 관련 웹사이트와 출처를 명시하며 상세히 답변하세요.',
        },
        { role: 'user', content: queryText },
      ],
      max_tokens       : 800,
      return_citations : true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Perplexity API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}

// ── OpenAI (ChatGPT) ───────────────────────────────────────────────────────

async function queryOpenAI(
  queryText: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method : 'POST',
    headers: {
      'Content-Type' : 'application/json',
      Authorization  : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model   : 'gpt-4o-mini',
      messages: [
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

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Claude ─────────────────────────────────────────────────────────────────

async function queryClaude(
  queryText: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method : 'POST',
    headers: {
      'Content-Type'      : 'application/json',
      'x-api-key'         : apiKey,
      'anthropic-version' : '2023-06-01',
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

  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>
  }
  return (data.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('')
}

// ── Gemini ─────────────────────────────────────────────────────────────────

async function queryGemini(
  queryText: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        contents: [{
          parts: [{
            text: `당신은 웹 검색 기반 AI 어시스턴트입니다. 관련 웹사이트와 브랜드를 명시하며 답변하세요.\n\n${queryText}`,
          }],
        }],
        generationConfig: { maxOutputTokens: 600 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── 단일 쿼리 × 단일 엔진 실행 ────────────────────────────────────────────

async function runSingleCheck(
  query    : GeoQuery,
  engine   : GeoEngine,
  target   : { domain: string; brand: string },
  apiKeys  : Partial<Record<GeoEngine, string>>,
): Promise<GeoCheckResult> {
  const now = new Date().toISOString()
  const key = apiKeys[engine]

  if (!key) {
    return {
      queryId         : query.id,
      queryText       : query.text,
      engine,
      cited           : false,
      mentionCount    : 0,
      competitorMentions: [],
      responsePreview : '',
      checkedAt       : now,
      error           : `${engine} API 키가 설정되지 않았습니다.`,
    }
  }

  try {
    let responseText = ''

    switch (engine) {
      case 'perplexity': responseText = await queryPerplexity(query.text, key); break
      case 'chatgpt'   : responseText = await queryOpenAI(query.text, key);     break
      case 'claude'    : responseText = await queryClaude(query.text, key);     break
      case 'gemini'    : responseText = await queryGemini(query.text, key);     break
    }

    const { cited, mentionCount, snippet } = detectCitation(
      responseText, target.domain, target.brand,
    )

    return {
      queryId            : query.id,
      queryText          : query.text,
      engine,
      cited,
      mentionCount,
      citationSnippet    : snippet,
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
      competitorMentions : [],
      responsePreview    : '',
      checkedAt          : now,
      error              : String(err),
    }
  }
}

// ── 퍼블릭 API ─────────────────────────────────────────────────────────────

export interface RunGeoMonitorOptions {
  targetDomain : string
  targetBrand  : string
  queries      : GeoQuery[]
  engines      : GeoEngine[]
  apiKeys      : Partial<Record<GeoEngine, string>>
  emit?        : (event: object) => void
}

export async function runGeoMonitor(opts: RunGeoMonitorOptions): Promise<GeoCheckResult[]> {
  const { targetDomain, targetBrand, queries, engines, apiKeys, emit } = opts
  const results: GeoCheckResult[] = []
  const total = queries.length * engines.length
  let done    = 0

  for (const query of queries) {
    for (const engine of engines) {
      emit?.({
        type    : 'geo-progress',
        done,
        total,
        engine,
        query   : query.text,
        pct     : Math.round((done / total) * 100),
        ts      : Date.now(),
      })

      const result = await runSingleCheck(
        query, engine,
        { domain: targetDomain, brand: targetBrand },
        apiKeys,
      )
      results.push(result)
      done++
    }
  }

  emit?.({ type: 'geo-progress', done: total, total, pct: 100, ts: Date.now() })
  return results
}

/** 엔진별·전체 인용률 계산 */
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
