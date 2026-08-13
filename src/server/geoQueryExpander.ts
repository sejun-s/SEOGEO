/**
 * GEO Query Expander (P2-2) — LLM 기반 질의 자동 확장
 * Claude API를 사용해 브랜드/도메인에 최적화된 GEO 모니터링 질의를 자동 생성합니다.
 */

import type { GeoQuery } from '../types.ts'

export interface ExpandedQuery {
  text    : string
  category: GeoQuery['category']
}

interface ClaudeMessage {
  content?: Array<{ type: string; text?: string }>
}
interface GeminiMessage {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

/**
 * 도메인·브랜드 기반으로 GEO 모니터링 질의를 자동 생성
 */
export async function expandGeoQueries(opts: {
  targetDomain  : string
  targetBrand   : string
  brandSynonyms : string[]
  existingTexts : string[]   // 기존 질의 (중복 방지용)
  apiKey        : string
  provider      : 'claude' | 'gemini'
  count         : number     // 생성할 질의 수 (기본 6)
}): Promise<ExpandedQuery[]> {
  const { targetDomain, targetBrand, brandSynonyms, existingTexts, apiKey, provider, count } = opts

  const synonymPart = brandSynonyms.length > 0
    ? `\n- 브랜드 동의어: ${brandSynonyms.join(', ')}`
    : ''

  const existingPart = existingTexts.length > 0
    ? `\n\n**기존 질의 (중복 제외해주세요):**\n${existingTexts.slice(0, 10).map(t => `- ${t}`).join('\n')}`
    : ''

  const prompt = `당신은 한국 AI SEO/GEO(Generative Engine Optimization) 전문가입니다.

다음 브랜드가 Perplexity, ChatGPT, Claude, Gemini, 네이버 AI 같은 AI 검색엔진에서 인용될 가능성이 높은 한국어 검색 질의 ${count}개를 생성해주세요.

**브랜드 정보:**
- 도메인: ${targetDomain}
- 브랜드명: ${targetBrand}${synonymPart}${existingPart}

**카테고리 정의:**
- brand: 브랜드명을 직접 포함한 질의 (예: "${targetBrand} 리뷰", "${targetBrand} 가격")
- product: 제품/서비스를 묻는 질의 (예: "가장 좋은 SEO 도구 추천")
- industry: 업계·업종 일반 질의 (예: "한국 최고의 디지털 마케팅 에이전시")
- competitor: 경쟁사 비교 질의 (예: "SEO 도구 비교 추천")

**중요 지침:**
- 실제 사용자가 AI에 물어볼 법한 자연스러운 한국어 질문
- 브랜드 카테고리: 브랜드명을 명시적으로 포함
- 나머지 카테고리: 브랜드명 없이 업계·제품 중심
- 다양한 카테고리 혼합 (brand 2개, product 2개, industry 1개, competitor 1개 권장)

**응답 형식 (JSON만, 마크다운 없이):**
[
  { "text": "...", "category": "brand" },
  { "text": "...", "category": "product" }
]`

  let res: Response
  if (provider === 'gemini') {
    let candidate: Response | null = null
    for (const model of ['gemini-3.6-flash', 'gemini-3.5-flash']) {
      candidate = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        })
      if (candidate.ok || ![403, 404].includes(candidate.status)) break
    }
    res = candidate!
  } else {
    res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
      })
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${provider === 'gemini' ? 'Gemini' : 'Claude'} API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as ClaudeMessage & GeminiMessage
  const raw = provider === 'gemini'
    ? (data.candidates?.[0]?.content?.parts ?? []).map(part => part.text ?? '').join('')
    : (data.content ?? []).filter(block => block.type === 'text').map(block => block.text ?? '').join('')

  // JSON 파싱 — 코드 블록이 있으면 제거
  const jsonStr = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    const parsed = JSON.parse(jsonStr) as Array<{ text?: string; category?: string }>
    const VALID_CATEGORIES = new Set<GeoQuery['category']>(['brand', 'product', 'industry', 'competitor'])

    return parsed
      .filter(q => typeof q.text === 'string' && q.text.trim().length > 0)
      .map(q => ({
        text    : q.text!.trim(),
        category: (VALID_CATEGORIES.has(q.category as GeoQuery['category'])
          ? q.category
          : 'industry') as GeoQuery['category'],
      }))
      .filter(q => !existingTexts.includes(q.text))
      .slice(0, count)
  } catch {
    throw new Error(`질의 생성 JSON 파싱 실패: ${jsonStr.slice(0, 300)}`)
  }
}
