const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface InsightSection {
  title: string
  content: string
  tips: string[]
}

export interface InsightResult {
  sections: InsightSection[]
}

export type InsightPersona = 'marketer' | 'executive' | 'operator'

const SCORE_LABELS: Record<string, string> = {
  technical: 'Technical SEO',
  chatgpt: 'ChatGPT Search',
  geo: '학술 GEO',
  eeat: 'E-E-A-T',
  schema: 'Schema.org',
  bing: 'Bing & AEO',
}

export interface SiteContext {
  description: string    // 사이트 소개
  purpose: string[]      // 주요 목적 (복수 선택)
  targetAudience: string // 타겟 고객
}

export interface SiteAuditInput {
  url: string
  title: string
  overallScore: number
  scores: {
    technical: number
    chatgpt: number
    geo: number
    eeat: number
    schema: number
    bing: number
  }
  criteria: Array<{
    name: string
    status: string
    priority: string
    improvement: string
    estimatedScoreGain: number
    category: string
  }>
  summary?: string
  criticalIssues?: string[]
  quickWins?: string[]
  siteContext?: SiteContext
}

function buildContextBlock(ctx: SiteContext | undefined): string {
  if (!ctx) return ''
  const lines: string[] = []
  if (ctx.description) lines.push(`사이트 소개: ${ctx.description}`)
  if (ctx.purpose.length) lines.push(`주요 목적: ${ctx.purpose.join(', ')}`)
  if (ctx.targetAudience) lines.push(`타겟 고객: ${ctx.targetAudience}`)
  return lines.length ? `\n=== 사이트 운영 정보 (중요 — 아래 맥락을 반드시 반영하세요) ===\n${lines.join('\n')}` : ''
}

function buildSiteReport(audit: SiteAuditInput): string {
  const grade =
    audit.overallScore >= 85 ? 'A등급 (우수)' :
    audit.overallScore >= 70 ? 'B등급 (양호)' :
    audit.overallScore >= 55 ? 'C등급 (보통)' :
    audit.overallScore >= 40 ? 'D등급 (미흡)' : 'F등급 (매우 미흡)'

  const scoreLines = Object.entries(audit.scores)
    .map(([k, v]) => `  - ${SCORE_LABELS[k] ?? k}: ${v}/100`)
    .join('\n')

  const failItems = audit.criteria
    .filter(c => c.status === 'fail' && c.priority === 'critical')
    .map(c => `  ❌ [${c.name}] ${c.improvement} (개선 시 +${c.estimatedScoreGain}점)`)
    .join('\n')

  const warnItems = audit.criteria
    .filter(c => c.status === 'fail' && c.priority !== 'critical')
    .slice(0, 6)
    .map(c => `  ⚠️ [${c.name}] ${c.improvement}`)
    .join('\n')

  const passItems = audit.criteria
    .filter(c => c.status === 'pass')
    .map(c => `  ✅ ${c.name}`)
    .join('\n')

  return `=== 사이트 SEO 분석 결과 ===
사이트: ${audit.url}
사이트명: ${audit.title}
종합 점수: ${audit.overallScore}/100 (${grade})
${buildContextBlock(audit.siteContext)}
카테고리별 점수:
${scoreLines}

즉시 수정 필요 (Critical FAIL):
${failItems || '  없음'}

개선 필요 항목:
${warnItems || '  없음'}

현재 통과 항목:
${passItems || '  없음'}
${audit.summary ? `\nAI 종합 요약: ${audit.summary}` : ''}`
}

function buildPrompt(persona: InsightPersona, report: string): string {
  const jsonFormat = `
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON:
{
  "sections": [
    { "title": "섹션 제목", "content": "2-3문장 핵심 설명", "tips": ["실행 항목 1", "실행 항목 2", "실행 항목 3"] }
  ]
}`

  if (persona === 'marketer') {
    return `당신은 15년 경력의 디지털 마케팅 전문가입니다.
아래 SEO 분석 결과를 바탕으로, 마케터 관점에서 이 사이트에 대한 구체적인 제언을 해주세요.
업종 일반론이 아니라 이 사이트의 실제 데이터를 기반으로 답하세요.

${report}

마케터 관점 핵심 관심사:
- AI 검색(ChatGPT·Perplexity·Gemini)에서 이 브랜드가 얼마나 인용될 수 있는가
- 현재 어떤 항목을 고치면 검색 노출이 가장 빠르게 늘어나는가
- 콘텐츠 전략과 SEO를 어떻게 연결할 것인가
- 경영진에게 SEO 투자 성과를 어떻게 설명할 것인가

반드시 아래 6개 섹션으로 구성하세요:
1. "AI 검색 인용 가능성 진단" — 현재 점수 기준으로 ChatGPT·Perplexity에서 이 사이트가 인용될 확률과 그 이유
2. "즉시 성과를 낼 콘텐츠 전략" — 현재 실패 항목 중 콘텐츠로 해결 가능한 것들과 제작 방향
3. "이번 달 마케팅 우선순위" — 지금 당장 마케팅팀이 집중해야 할 3가지 액션
4. "경영진 보고 포인트" — 이 SEO 상태가 트래픽·리드·매출에 어떤 영향을 미치는지 비즈니스 언어로 설명
5. "경쟁사 대비 취약 포인트" — 점수가 낮은 영역이 검색 시장에서 어떤 불리함으로 이어지는가
6. "6개월 목표 로드맵" — 핵심 문제들을 순서대로 해결했을 때 기대할 수 있는 변화
${jsonFormat}`
  }

  if (persona === 'executive') {
    return `당신은 15년 경력의 디지털 전략 컨설턴트입니다.
아래 SEO 분석 결과를 바탕으로, 경영자(대표이사·임원) 관점에서 이 사이트에 대한 전략적 제언을 해주세요.
기술 용어는 최소화하고, 비즈니스 임팩트와 의사결정 중심으로 작성하세요.

${report}

경영자 관점 핵심 관심사:
- 현재 SEO 상태가 비즈니스에 어떤 영향을 주고 있는가
- 어디에 투자하면 가장 빠르게 ROI가 나오는가
- 경쟁사 대비 우리의 디지털 포지션은 어디인가
- AI 검색 시대에 대비한 전략이 있는가

반드시 아래 6개 섹션으로 구성하세요:
1. "현재 상태 경영 요약" — 종합 점수와 주요 이슈를 경영자가 한눈에 이해할 수 있도록 비즈니스 언어로 요약
2. "비즈니스 영향 분석" — 현재 SEO 문제들이 유입 트래픽, 브랜드 인지도, 리드 생성에 미치는 실제 영향
3. "투자 우선순위 TOP 3" — 지금 가장 시급하게 투자해야 할 항목과 기대 ROI (왜 이 순서인가 포함)
4. "방치 시 리스크" — 현재 Critical 문제들을 6개월 이상 방치했을 때 발생할 수 있는 비즈니스 리스크
5. "경쟁사 대비 포지션" — 현재 점수 수준이 시장 내에서 어떤 위치이며 어떤 기회를 잃고 있는가
6. "경영진 의사결정 사항" — 이 데이터를 바탕으로 지금 경영진이 결정해야 할 3가지 액션
${jsonFormat}`
  }

  // operator
  return `당신은 15년 경력의 기술 SEO 전문가입니다.
아래 SEO 분석 결과를 바탕으로, 웹 운영자·개발팀 관점에서 이 사이트에 대한 실행 가이드를 제공해주세요.
각 항목은 개발팀에 바로 전달 가능한 수준으로 구체적으로 작성하세요.

${report}

운영자 관점 핵심 관심사:
- 어떤 기술적 문제를 먼저 수정해야 하는가
- 수정 방법과 예상 소요 시간은 어느 정도인가
- 개발팀에 어떻게 요청서를 작성할 것인가
- 수정 후 어떻게 검증할 것인가

반드시 아래 6개 섹션으로 구성하세요:
1. "긴급 수정 작업 목록" — Critical FAIL 항목들을 점수 상승폭 순으로 정렬하고 각 수정 방법을 기술적으로 설명
2. "수정 난이도와 예상 공수" — 각 문제의 수정 복잡도(쉬움/보통/어려움)와 예상 소요 시간
3. "개발팀 전달 가이드" — 개발팀에 요청할 때 포함해야 할 핵심 정보와 티켓 작성 템플릿
4. "수정 우선순위 결정 기준" — 점수 상승 효과 vs 수정 난이도를 기준으로 한 최적 수정 순서
5. "배포 후 검증 체크리스트" — 각 수정사항이 제대로 적용됐는지 확인하는 단계별 점검 방법
6. "지속 모니터링 설정" — 향후 SEO 이슈를 조기에 발견하기 위한 모니터링 도구와 체크 주기
${jsonFormat}`
}

export async function analyzeSiteWithGemini(
  audit: SiteAuditInput,
  geminiKey: string,
  persona: InsightPersona,
): Promise<InsightResult> {
  const report = buildSiteReport(audit)
  const prompt = buildPrompt(persona, report)

  const geminiRes = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2500 },
    }),
    signal: AbortSignal.timeout(35000),
  })

  if (!geminiRes.ok) {
    const errData = await geminiRes.json() as { error?: { message: string } }
    throw new Error(errData.error?.message ?? `Gemini API 오류 (HTTP ${geminiRes.status})`)
  }

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  return JSON.parse(clean) as InsightResult
}
