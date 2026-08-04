import type {
  CriteriaItem,
  MeasurementConfidence,
  PageSignals,
  SchemaEvaluationLevel,
  SearchEligibilityResult,
} from '../types.ts'

export type { PageSignals }

type EmitFn = (event: { type: string; msg?: string; level?: string; data?: unknown; ts: number }) => void

// ─── HTML 파싱 헬퍼 ─────────────────────────────────────────────────────────

function extractTag(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? ''
}

function extractAllTags(html: string, pattern: RegExp): string[] {
  const results: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(pattern.source, 'gi')
  while ((m = re.exec(html)) !== null) results.push(m[1]?.trim() ?? '')
  return results.filter(Boolean)
}

// ─── 실제 URL fetch 및 SEO 신호 추출 ────────────────────────────────────────

export async function fetchPageSignals(targetUrl: string, emit?: EmitFn): Promise<PageSignals> {
  const startTime = Date.now()
  const isHttps = targetUrl.startsWith('https://')
  const base = new URL(targetUrl)
  const now = () => Date.now()

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzer/1.0)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  }

  emit?.({ type: 'step', msg: `🌐 ${targetUrl} 접속 중...`, level: 'info', ts: now() })

  // robots.txt
  let robotsTxt = ''
  let hasSitemap = false
  try {
    const r = await fetch(`${base.origin}/robots.txt`, { headers: HEADERS, signal: AbortSignal.timeout(5000) })
    if (r.ok) {
      robotsTxt = (await r.text()).slice(0, 3000)
      hasSitemap = robotsTxt.toLowerCase().includes('sitemap:')
      const hasOai = /oai-searchbot/i.test(robotsTxt)
      const hasGpt = /gptbot/i.test(robotsTxt)
      emit?.({ type: 'step', msg: `🤖 robots.txt 확인 — OAI-SearchBot: ${hasOai ? '명시됨' : '없음'} | GPTBot: ${hasGpt ? '명시됨' : '없음'} | Sitemap: ${hasSitemap ? '있음' : '없음'}`, level: 'info', ts: now() })
    }
  } catch {
    emit?.({ type: 'step', msg: `⚠️ robots.txt 접근 불가 (정상일 수 있음)`, level: 'warn', ts: now() })
  }

  // 메인 페이지
  let html = ''
  let statusCode = 0
  let fetchError: string | undefined
  try {
    const res = await fetch(targetUrl, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(10000) })
    statusCode = res.status
    html = (await res.text()).slice(0, 200_000)
    emit?.({ type: 'step', msg: `✅ HTML 수신 완료 — HTTP ${statusCode} | ${(html.length / 1024).toFixed(0)}KB`, level: 'success', ts: now() })
  } catch (err) {
    fetchError = String(err)
    emit?.({ type: 'step', msg: `❌ 페이지 접속 실패: ${fetchError}`, level: 'warn', ts: now() })
  }

  const responseTime = Date.now() - startTime

  if (!html) {
    return {
      url: targetUrl, isHttps, statusCode, responseTime, fetchError,
      title: '', metaDescription: '', canonical: '', metaRobots: '',
      h1s: [], h2s: [], h3s: [],
      ogTitle: '', ogDescription: '', ogImage: '', twitterCard: '',
      jsonLdRaw: [], robotsTxt, hasViewport: false, hasCharset: false,
      wordCount: 0, internalLinks: 0, externalLinks: 0,
      imageCount: 0, imagesWithAlt: 0, hasSchema: false, hasHreflang: false, hasSitemap,
      hasGA4: false, hasGTM: false, hasUALegacy: false,
      hasFbPixel: false, hasNaverAnalytics: false,
    }
  }

  emit?.({ type: 'step', msg: `🔍 HTML 파싱 중...`, level: 'info', ts: now() })

  const title           = extractTag(html, /<title[^>]*>([^<]+)<\/title>/i)
  const metaDescription = extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
                       || extractTag(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  const canonical       = extractTag(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)
                       || extractTag(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
  const metaRobots      = extractTag(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)
                       || extractTag(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)
  const ogTitle         = extractTag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)
  const ogDescription   = extractTag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)
  const ogImage         = extractTag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)
  const twitterCard     = extractTag(html, /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)/i)
  const hasViewport     = /<meta[^>]+name=["']viewport["']/i.test(html)
  const hasCharset      = /<meta[^>]*charset/i.test(html)
  const hasHreflang     = /hreflang/i.test(html)
  const hasSchema       = /<script[^>]+type=["']application\/ld\+json["']/i.test(html)

  const h1s = extractAllTags(html, /<h1[^>]*>([^<]+)<\/h1>/i)
  const h2s = extractAllTags(html, /<h2[^>]*>([^<]+)<\/h2>/i).slice(0, 10)
  const h3s = extractAllTags(html, /<h3[^>]*>([^<]+)<\/h3>/i).slice(0, 8)

  const jsonLdRaw: string[] = []
  const jre = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let jm: RegExpExecArray | null
  while ((jm = jre.exec(html)) !== null) jsonLdRaw.push(jm[1].trim().slice(0, 1500))

  const allLinks = html.match(/<a[^>]+href=["']([^"']+)["']/gi) ?? []
  let internalLinks = 0, externalLinks = 0
  for (const l of allLinks) {
    const href = l.match(/href=["']([^"']+)["']/i)?.[1] ?? ''
    if (href.startsWith('http') && !href.includes(base.hostname)) externalLinks++
    else internalLinks++
  }

  const imgTags = html.match(/<img[^>]+>/gi) ?? []
  const imagesWithAlt = imgTags.filter(t => /alt=["'][^"']+["']/i.test(t)).length
  const wordCount = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 1).length

  // ── Analytics detection ────────────────────────────────────────────────────
  const ga4IdMatch = html.match(/gtag\s*\(\s*['"]config['"]\s*,\s*['"]([Gg]-[A-Z0-9]+)['"]/)?.[1]
               ?? html.match(/googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/i)?.[1]
  const hasGA4 = !!ga4IdMatch || /googletagmanager\.com\/gtag\/js\?id=G-/i.test(html)
  const ga4MeasurementId = ga4IdMatch ?? undefined

  const gtmIdMatch = html.match(/googletagmanager\.com\/(?:gtm\.js|ns\.html)\?id=(GTM-[A-Z0-9]+)/i)?.[1]
  const hasGTM = !!gtmIdMatch || /googletagmanager\.com\/gtm\.js/i.test(html)
  const gtmId = gtmIdMatch ?? undefined

  const hasUALegacy = /google-analytics\.com\/analytics\.js/i.test(html)
                   || /ga\s*\(\s*['"]create['"]\s*,\s*['"]UA-/i.test(html)
  const hasFbPixel  = /fbq\s*\(\s*['"]init['"]/i.test(html)
                   || /connect\.facebook\.net\/[^/]+\/fbevents\.js/i.test(html)
  const hasNaverAnalytics = /wcs\.naver\.com\/wcslog\.js/i.test(html)
                          || /wcs_add\s*\[/i.test(html)

  const analyticsTools = [
    hasGA4 && `GA4${ga4MeasurementId ? ` (${ga4MeasurementId})` : ''}`,
    hasGTM && `GTM${gtmId ? ` (${gtmId})` : ''}`,
    hasUALegacy && 'UA(구버전)',
    hasFbPixel && 'Facebook Pixel',
    hasNaverAnalytics && 'Naver Analytics',
  ].filter(Boolean)

  emit?.({
    type: 'step',
    msg: analyticsTools.length > 0
      ? `📈 분석 도구 감지 — ${analyticsTools.join(' | ')}`
      : `📈 분석 도구 없음 — GA4 미설치`,
    level: analyticsTools.length > 0 ? 'success' : 'warn',
    ts: now(),
  })

  const signals: PageSignals = {
    url: targetUrl, isHttps, statusCode, responseTime, fetchError,
    title, metaDescription, canonical, metaRobots,
    h1s, h2s, h3s, ogTitle, ogDescription, ogImage, twitterCard,
    jsonLdRaw, robotsTxt, hasViewport, hasCharset,
    wordCount, internalLinks, externalLinks,
    imageCount: imgTags.length, imagesWithAlt,
    hasSchema, hasHreflang, hasSitemap,
    hasGA4, ga4MeasurementId, hasGTM, gtmId, hasUALegacy, hasFbPixel, hasNaverAnalytics,
  }

  emit?.({
    type: 'step',
    msg: `📊 파싱 완료 — Title: "${title.slice(0, 40) || '없음'}" | H1: ${h1s.length}개 | 단어: ${wordCount} | Schema: ${hasSchema ? '있음' : '없음'}`,
    level: 'success',
    ts: now(),
  })

  return signals
}

// ─── robots.txt 접근 상태 해석 (Block 3: 미명시 ≠ 차단) ─────────────────────

type BotAccessState = 'explicitly_allowed' | 'allowed_by_general_rule' | 'explicitly_blocked' | 'unknown'

function interpretBotAccess(rb: string, botName: string): BotAccessState {
  if (!rb) return 'unknown'
  const lines = rb.split('\n').map(l => l.trim().toLowerCase())
  const globalDisallowAll = lines.some(l => l === 'disallow: /')



  // Check for explicit named bot rule (not just *)
  let inNamedSection = false
  let hasNamedRule = false
  let namedDisallow = false
  let namedAllow = false

  for (const line of lines) {
    if (line.startsWith('user-agent:')) {
      const ua = line.replace('user-agent:', '').trim()
      inNamedSection = ua === botName.toLowerCase()
      if (inNamedSection) hasNamedRule = true
      continue
    }
    if (inNamedSection) {
      if (line.startsWith('disallow:')) namedDisallow = true
      if (line.startsWith('allow: /') || line === 'allow:/') namedAllow = true
    }
  }

  if (hasNamedRule) {
    if (namedAllow && !namedDisallow) return 'explicitly_allowed'
    if (namedDisallow && !namedAllow) return 'explicitly_blocked'
    return 'allowed_by_general_rule' // partial rule
  }

  // No explicit named rule — interpret by general rule
  if (globalDisallowAll) return 'explicitly_blocked'
  return 'allowed_by_general_rule' // 미명시 = 허용으로 해석
}

// ─── 검색 자격 게이트 (Block 4) ──────────────────────────────────────────────

export function calcSearchEligibility(s: PageSignals): SearchEligibilityResult {
  const rb = s.robotsTxt.toLowerCase()
  const noindex = s.metaRobots.toLowerCase().includes('noindex')
  const blocked = rb.includes('disallow: /') && !rb.includes('allow: /')
  const httpOk = s.statusCode >= 200 && s.statusCode < 400

  const checks: SearchEligibilityResult['checks'] = [
    {
      id: 'http_access',
      label: 'HTTP 접근',
      status: s.fetchError ? 'unknown' : httpOk ? 'pass' : 'fail',
      detail: s.fetchError ? '접근 실패' : `HTTP ${s.statusCode}`,
    },
    {
      id: 'robots_access',
      label: 'robots.txt 크롤링',
      status: !s.robotsTxt ? 'unknown' : blocked ? 'fail' : 'pass',
      detail: !s.robotsTxt ? '확인 불가' : blocked ? 'Disallow: / 감지' : '허용',
    },
    {
      id: 'noindex',
      label: 'noindex 없음',
      status: noindex ? 'fail' : 'pass',
      detail: noindex ? 'meta robots noindex 감지' : undefined,
    },
    {
      id: 'canonical_conflict',
      label: 'canonical 설정',
      status: s.canonical ? 'pass' : 'warning',
      detail: s.canonical ? undefined : 'canonical 없음 (권장)',
    },
    {
      id: 'content_accessible',
      label: '핵심 콘텐츠 접근',
      status: !s.fetchError && s.wordCount > 0 ? 'pass' : s.fetchError ? 'unknown' : 'warning',
      detail: s.wordCount === 0 ? 'HTML에서 텍스트 콘텐츠 없음' : undefined,
    },
  ]

  const hasFail = checks.some(c => c.status === 'fail')
  const hasWarning = checks.some(c => c.status === 'warning')
  const hasUnknown = checks.some(c => c.status === 'unknown')

  const status = hasFail ? 'fail' : hasWarning ? 'warning' : hasUnknown ? 'unknown' : 'pass'

  return { status, checks }
}

// ─── 측정 신뢰도 (Block 4) ───────────────────────────────────────────────────

export function calcMeasurementConfidence(s: PageSignals): MeasurementConfidence {
  let score = 0
  if (!s.fetchError && s.statusCode === 200) score += 2
  if (s.robotsTxt) score += 1
  if (s.hasSitemap) score += 1
  if (s.wordCount > 100) score += 1
  if (s.hasSchema) score += 1
  if (s.title && s.metaDescription) score += 1
  return score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low'
}

// ─── AI Citation Readiness 추정 (Block 3 - 정적 분석 기반) ───────────────────

export function calcAiCitationReadiness(s: PageSignals): number {
  const rb = s.robotsTxt.toLowerCase()

  // ai_accessibility (15%): 실제 접근 허용 여부
  const oaiState = interpretBotAccess(rb, 'oai-searchbot')
  const gptState = interpretBotAccess(rb, 'gptbot')
  const accessScore =
    oaiState === 'explicitly_allowed' ? 100 :
    oaiState === 'allowed_by_general_rule' ? 70 :
    oaiState === 'explicitly_blocked' ? 10 : 50
  const gptBonus = gptState === 'explicitly_allowed' ? 20 : gptState === 'explicitly_blocked' ? 0 : 10
  const aiAccess = Math.min(100, accessScore * 0.7 + gptBonus)

  // question_coverage (20%): 콘텐츠 구조와 깊이 (절대 임계값 대신 연속 스케일)
  const hasContent = s.wordCount > 100
  const hasStructure = s.h2s.length > 0
  const coverageScore = (
    (hasContent ? 30 : 0) +
    (hasStructure ? 25 : 0) +
    Math.min(25, s.h2s.length * 5) +
    Math.min(20, s.wordCount > 500 ? 20 : s.wordCount > 200 ? 10 : 0)
  )

  // evidence_originality (25%): 근거와 독창성 신호 (정적 분석 한계 반영)
  const hasExternal = s.externalLinks > 0
  const hasImages = s.imageCount > 0
  const hasAltImages = s.imagesWithAlt > s.imageCount * 0.5
  const evidenceScore = (
    (hasExternal ? 30 : 0) +
    Math.min(20, s.externalLinks * 5) +
    (hasImages && hasAltImages ? 20 : hasImages ? 10 : 0) +
    (s.wordCount > 300 ? 10 : 0) +
    20 // 정적 분석만으로 판단 불가한 부분 — 기본 점수
  )

  // entity_trust (20%): 엔티티 신뢰성 신호
  const schemaContent = s.jsonLdRaw.join(' ').toLowerCase()
  const hasOrgSchema = schemaContent.includes('organization') || schemaContent.includes('person')
  const entityScore = (
    (s.isHttps ? 25 : 0) +
    (hasOrgSchema ? 30 : s.hasSchema ? 15 : 0) +
    (schemaContent.includes('sameas') ? 20 : 0) +
    (s.ogTitle ? 10 : 0) +
    15 // 외부 언급은 정적 분석 불가 — 기본 점수
  )

  // extractability (10%): 정보 추출 가능성
  const hasH1 = s.h1s.length === 1
  const extractScore = (
    (hasH1 ? 30 : s.h1s.length > 0 ? 15 : 0) +
    (s.h2s.length > 0 ? 25 : 0) +
    (s.hasSchema ? 25 : 0) +
    (s.wordCount > 100 ? 20 : 0)
  )

  // freshness (10%): 정적 분석으로 판단 불가 — 중립 점수
  const freshnessScore = 50

  const total =
    Math.min(100, aiAccess)       * 0.15 +
    Math.min(100, coverageScore)  * 0.20 +
    Math.min(100, evidenceScore)  * 0.25 +
    Math.min(100, entityScore)    * 0.20 +
    Math.min(100, extractScore)   * 0.10 +
    freshnessScore                * 0.10

  return Math.round(total)
}

// ─── 실측 기반 점수 계산 (v2 — Block 3/4 기준 적용) ─────────────────────────

export interface CategoryScores {
  technicalScore: number
  chatGptSearchScore: number
  schemaScore: number
  eeatScore: number
  academicGeoScore: number
  bingScore: number
  seoFoundationScore: number
  aiCitationReadinessScore: number
  searchEligibility: SearchEligibilityResult
  measurementConfidence: MeasurementConfidence
  schemaEvaluationLevel: SchemaEvaluationLevel
  scoreModelVersion: string
}

export function calcCategoryScore(s: PageSignals): CategoryScores {
  let tech = 0
  if (s.isHttps)                                              tech += 15
  if (s.statusCode === 200)                                   tech += 10
  if (s.title && s.title.length >= 10 && s.title.length <= 70) tech += 15
  else if (s.title)                                           tech += 8
  if (s.metaDescription && s.metaDescription.length >= 50)   tech += 12
  else if (s.metaDescription)                                 tech += 6
  if (s.canonical)                                            tech += 10
  if (s.h1s.length === 1)                                     tech += 12
  else if (s.h1s.length > 1)                                  tech += 4
  if (s.h2s.length >= 2)                                      tech += 8
  if (s.hasViewport)                                          tech += 8
  if (s.ogTitle && s.ogDescription)                           tech += 7
  if (!s.metaRobots.toLowerCase().includes('noindex'))        tech += 3
  if (s.responseTime < 3000)                                  tech += 5
  else if (s.responseTime < 6000)                             tech += 2

  const rb = s.robotsTxt.toLowerCase()

  // ChatGPT Search — 미명시는 allowed_by_general_rule로 해석 (Block 3)
  const oaiState = interpretBotAccess(rb, 'oai-searchbot')
  const gptState = interpretBotAccess(rb, 'gptbot')
  let chatgpt = 0
  chatgpt += oaiState === 'explicitly_allowed' ? 45 : oaiState === 'explicitly_blocked' ? 5 : 28
  chatgpt += gptState === 'explicitly_allowed' ? 20 : gptState === 'explicitly_blocked' ? 0 : 10
  if (s.title && s.metaDescription) chatgpt += 15
  // 콘텐츠 깊이: 절대 임계값 대신 연속 스케일 (Block 4)
  chatgpt += Math.min(10, Math.floor(s.wordCount / 100))

  let schema = 0
  if (s.hasSchema) schema += 35
  if (s.jsonLdRaw.length > 0) {
    const c = s.jsonLdRaw.join(' ').toLowerCase()
    if (c.includes('@graph'))                                 schema += 20
    if (c.includes('sameas'))                                 schema += 20
    if (c.includes('faqpage') || c.includes('howto'))         schema += 15
    else if (c.includes('product') || c.includes('article')) schema += 10
  }

  // E-E-A-T — 단어 수 절대 임계값 제거, 연속 스케일로 변경 (Block 4)
  let eeat = 30
  if (s.wordCount > 200)   eeat += 5   // 최소 콘텐츠 존재
  if (s.wordCount > 800)   eeat += 8   // 어느 정도 깊이 (기존 1000단어 임계값 → 완화)
  if (s.wordCount > 2000)  eeat += 7   // 심층 콘텐츠 (기존 3000단어 → 완화)
  if (s.externalLinks > 2) eeat += 10
  if (s.hasHreflang)       eeat += 5
  if (s.imagesWithAlt > 0) eeat += 10
  if (s.isHttps)           eeat += 10
  if (s.h2s.length >= 2)   eeat += 5   // 기존 h2 >= 3 → 완화

  // GEO — 단어 수/H2 절대 임계값 제거 (Block 3/4)
  let geo = 20
  if (s.wordCount > 200)   geo += 5    // 콘텐츠 존재 여부 (연속 스케일)
  if (s.wordCount > 500)   geo += 8
  if (s.wordCount > 1500)  geo += 7    // 기존 2000단어 → 완화
  if (s.h2s.length >= 1)   geo += 10   // 제목 구조 존재 여부 (기존 >= 3 절대 기준 제거)
  if (s.h2s.length >= 3)   geo += 5    // 추가 가점 (더 이상 "필수" 아님)
  if (s.h3s.length >= 2)   geo += 8
  if (s.externalLinks > 0) geo += 15
  if (s.imagesWithAlt > s.imageCount * 0.5) geo += 12

  let bing = 25
  if (s.hasSitemap)        bing += 20
  if (s.isHttps)           bing += 15
  if (s.hasSchema)         bing += 20
  if (!rb.includes('disallow: /')) bing += 20

  // SEO Foundation 점수 (Block 4 — Technical + 색인 가능성 중심)
  const seoFoundation = Math.round(
    Math.min(100, tech)   * 0.40 +
    Math.min(100, schema) * 0.20 +
    Math.min(100, eeat)   * 0.25 +
    Math.min(100, bing)   * 0.15
  )

  // AI Citation Readiness (Block 3 — 정적 분석 기반)
  const aiCitationReadiness = calcAiCitationReadiness(s)

  // 검색 자격 게이트 (Block 4)
  const eligibility = calcSearchEligibility(s)

  // 측정 신뢰도 (Block 4)
  const confidence = calcMeasurementConfidence(s)

  // Schema 다단계 평가 레벨 (v3)
  let schemaLevel: 'not_applicable' | 'missing' | 'parse_error' | 'valid_but_mismatched' | 'valid_but_incomplete' | 'appropriate_and_consistent' | 'validated_for_supported_feature' = 'missing'
  if (!s.hasSchema) {
    schemaLevel = 'missing'
  } else if (s.jsonLdRaw.length > 0) {
    const c = s.jsonLdRaw.join(' ').toLowerCase()
    if (c.includes('@graph') && (c.includes('faqpage') || c.includes('product') || c.includes('article'))) {
      schemaLevel = 'validated_for_supported_feature'
    } else if (c.includes('organization') || c.includes('website')) {
      schemaLevel = 'appropriate_and_consistent'
    } else {
      schemaLevel = 'valid_but_incomplete'
    }
  }

  return {
    technicalScore:            Math.min(100, tech),
    chatGptSearchScore:        Math.min(100, chatgpt),
    schemaScore:               Math.min(100, schema),
    eeatScore:                 Math.min(100, eeat),
    academicGeoScore:          Math.min(100, geo),
    bingScore:                 Math.min(100, bing),
    // v3 신규 필드
    seoFoundationScore:        seoFoundation,
    aiCitationReadinessScore:  aiCitationReadiness,
    searchEligibility:         eligibility,
    measurementConfidence:     confidence,
    schemaEvaluationLevel:     schemaLevel,
    scoreModelVersion:         'v3.0',
  }
}

// ─── 규칙 기반 분석 결과 생성 (API 키 불필요) ───────────────────────────────

export function generateRuleBasedResult(signals: PageSignals, scores: CategoryScores): Record<string, unknown> {
  const overall = Math.round(
    scores.technicalScore     * 0.20 +
    scores.chatGptSearchScore * 0.18 +
    scores.eeatScore          * 0.18 +
    scores.academicGeoScore   * 0.16 +
    scores.schemaScore        * 0.16 +
    scores.bingScore          * 0.12
  )
  const domain = signals.url.replace(/^https?:\/\//, '').split('/')[0]
  const rb = signals.robotsTxt.toLowerCase()

  const criteria: CriteriaItem[] = []

  // ── Technical ──────────────────────────────────────────────────────────────
  {
    const tLen = signals.title.length
    const tOk = tLen >= 30 && tLen <= 60
    const tWarn = tLen > 0
    const titleSnippet = tLen === 0
      ? `<!-- HTML <head> 안에 추가 -->\n<title>핵심 키워드 | ${domain}</title>`
      : tLen > 60
      ? `<!-- 현재 Title 단축 필요 (${tLen}자 → 60자 이내) -->\n<title>${signals.title.slice(0, 55)}…</title>`
      : null
    criteria.push({
      id: 'tech_title', name: 'Title 태그 최적화', category: 'technical',
      score: tOk ? 90 : tWarn ? 60 : 10,
      status: tOk ? 'pass' : tWarn ? 'warning' : 'fail',
      weight: '높음',
      scoringBasis: `실측: Title="${signals.title.slice(0, 60)}${signals.title.length > 60 ? '...' : ''}" (${tLen}자). Google 권장 30-60자 ${tOk ? '충족' : tLen === 0 ? '없음 — 심각한 SEO 손실' : tLen < 30 ? '너무 짧음' : '초과 — 검색결과에서 잘림'}.`,
      evaluationCriteria: 'Google: Title은 30-60자, 핵심 키워드 포함, 브랜드명 포함 권장',
      currentState: tLen === 0 ? 'Title 태그 없음' : `${tLen}자 (${tOk ? '적절' : tLen < 30 ? '짧음' : '김'})`,
      improvement: tLen === 0
        ? '① HTML <head> 태그 안에 <title> 추가\n② 형식: "핵심 키워드 | 브랜드명" (30-60자)\n③ 저장 후 Google Search Console에서 색인 요청'
        : tLen > 60
        ? `① 현재 ${tLen}자 → 60자 이내로 단축\n② 핵심 키워드를 앞쪽에 배치\n③ 브랜드명은 " | 브랜드명" 형식으로 뒤에`
        : '현재 적절. 핵심 키워드가 앞부분에 오도록 유지',
      priority: tLen === 0 ? 'critical' : tOk ? 'low' : 'high',
      estimatedScoreGain: tLen === 0 ? 15 : tOk ? 0 : 8,
      referenceGuide: 'Google Search Essentials: https://developers.google.com/search/docs/essentials',
      codeSnippet: titleSnippet ?? undefined,
      codeType: 'html' as const,
    })
  }
  {
    const mLen = signals.metaDescription.length
    const mOk = mLen >= 80 && mLen <= 160
    criteria.push({
      id: 'tech_meta', name: 'Meta Description', category: 'technical',
      score: mOk ? 90 : mLen > 0 ? 55 : 10,
      status: mOk ? 'pass' : mLen > 0 ? 'warning' : 'fail',
      weight: '높음',
      scoringBasis: `실측: Meta Description ${mLen}자. Google 권장 80-160자 ${mOk ? '충족' : mLen === 0 ? '없음 — Google이 임의 생성' : mLen < 80 ? '부족' : '초과'}.`,
      evaluationCriteria: 'Google: Meta Description 80-160자, 클릭 유도 문구 포함',
      currentState: mLen === 0 ? 'Meta Description 없음' : `${mLen}자`,
      improvement: mLen === 0
        ? '① HTML <head> 안에 meta description 추가\n② 핵심 서비스 설명 + 행동 유도 문구 포함\n③ 80-160자 유지 (너무 길면 검색결과에서 잘림)'
        : mOk
        ? '현재 적절. 클릭률 높이는 행동 촉구 문구(CTA) 포함 여부 점검'
        : `① 현재 ${mLen}자 → ${mLen < 80 ? '80자 이상으로 내용 추가' : '160자 이내로 단축'}\n② 브랜드 강점 + "지금 바로", "무료 체험" 등 CTA 포함`,
      priority: mLen === 0 ? 'critical' : mOk ? 'low' : 'medium',
      estimatedScoreGain: mLen === 0 ? 12 : mOk ? 0 : 5,
      referenceGuide: 'Google Search Essentials: https://developers.google.com/search/docs/essentials',
      codeSnippet: !mOk ? `<!-- HTML <head> 안에 추가 -->\n<meta name="description" content="${domain}의 핵심 서비스 한 줄 소개. 구체적 강점과 행동 유도 문구 포함. (80-160자)">` : undefined,
      codeType: 'html' as const,
    })
  }
  {
    const h1c = signals.h1s.length
    criteria.push({
      id: 'tech_h1', name: 'H1 태그 구조', category: 'technical',
      score: h1c === 1 ? 90 : h1c === 0 ? 15 : 50,
      status: h1c === 1 ? 'pass' : h1c === 0 ? 'fail' : 'warning',
      weight: '높음',
      scoringBasis: `실측: H1 ${h1c}개 발견. ${h1c === 0 ? '없음 — 페이지 주제 불명확' : h1c === 1 ? `"${signals.h1s[0]?.slice(0, 50)}" — 권장 구조` : `복수 H1 SEO 비권장`}.`,
      evaluationCriteria: 'Google: 페이지당 H1 1개, 핵심 키워드 포함, 콘텐츠 계층 명확화',
      currentState: h1c === 0 ? 'H1 없음' : h1c === 1 ? `H1: "${signals.h1s[0]?.slice(0, 40)}"` : `H1 ${h1c}개 (중복)`,
      improvement: h1c === 0
        ? '① 페이지 메인 제목을 <h1> 태그로 감싸기\n② 핵심 키워드를 자연스럽게 포함\n③ 페이지 전체에서 H1은 반드시 1개만'
        : h1c === 1
        ? '현재 이상적. 핵심 키워드 포함 여부 점검'
        : '① H1 태그 중 1개만 남기고 나머지는 H2로 변경\n② 가장 중요한 제목만 H1 유지',
      priority: h1c === 0 ? 'critical' : h1c === 1 ? 'low' : 'medium',
      estimatedScoreGain: h1c === 0 ? 12 : h1c === 1 ? 0 : 6,
      referenceGuide: 'Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      codeSnippet: h1c !== 1 ? `<!-- 페이지 본문 최상단에 추가 -->\n<h1>핵심 키워드가 담긴 메인 제목</h1>\n\n<!-- 하위 섹션은 H2, H3 사용 -->\n<h2>주요 서비스 1</h2>\n<h2>주요 서비스 2</h2>` : undefined,
      codeType: 'html' as const,
    })
  }
  {
    const hasCanon = !!signals.canonical
    criteria.push({
      id: 'tech_canonical', name: 'Canonical URL 설정', category: 'technical',
      score: hasCanon ? 85 : 30,
      status: hasCanon ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `실측: Canonical ${hasCanon ? `"${signals.canonical?.slice(0, 60)}"` : '없음 — 중복 URL 문제 발생 가능'}.`,
      evaluationCriteria: 'Google: 중복 콘텐츠 방지, 선호 URL 명시',
      currentState: hasCanon ? `Canonical: ${signals.canonical?.slice(0, 50)}` : 'Canonical 없음',
      improvement: hasCanon
        ? '현재 설정됨. www/비www, https/http 통일 여부 점검'
        : '① 각 페이지의 <head> 안에 canonical 추가\n② URL은 www/https 통일 버전으로\n③ CMS 사용 시 SEO 플러그인에서 자동 설정 가능',
      priority: hasCanon ? 'low' : 'medium',
      estimatedScoreGain: hasCanon ? 0 : 8,
      referenceGuide: 'Google Canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
      codeSnippet: !hasCanon ? `<!-- HTML <head> 안에 추가 (각 페이지마다) -->\n<link rel="canonical" href="https://${domain}/">` : undefined,
      codeType: 'html' as const,
    })
  }

  // ── ChatGPT Search ─────────────────────────────────────────────────────────
  {
    // Block 3: 미명시 ≠ 차단. robots 전체 규칙을 해석해 실제 허용 상태 판정
    const oaiState = interpretBotAccess(rb, 'oai-searchbot')
    const gptState = interpretBotAccess(rb, 'gptbot')
    const oaiOk = oaiState !== 'explicitly_blocked'
    const oaiExplicit = oaiState === 'explicitly_allowed'
    const gptOk = gptState !== 'explicitly_blocked'

    const botScore =
      (oaiExplicit && gptOk) ? 95 :
      (oaiOk && gptOk) ? 70 :
      oaiOk ? 50 : 20

    const accessLabel = {
      explicitly_allowed: '명시적 허용',
      allowed_by_general_rule: '일반 규칙으로 허용 (미명시)',
      explicitly_blocked: '명시적 차단',
      unknown: '확인 불가',
    }

    criteria.push({
      id: 'chatgpt_bot', name: 'AI 검색봇 접근 상태', category: 'chatgpt',
      score: botScore,
      status: oaiExplicit && gptOk ? 'pass' : oaiOk ? 'warning' : 'fail',
      weight: '높음',
      scoringBasis: `실측 robots.txt 해석: OAI-SearchBot ${accessLabel[oaiState]}, GPTBot ${accessLabel[gptState]}. 미명시(Unspecified)는 일반 규칙에 따라 허용으로 해석합니다 (Block 3 원칙).`,
      evaluationCriteria: 'OpenAI ChatGPT Search 공식 가이드: OAI-SearchBot 명시적 허용 시 ChatGPT 답변 출처 최적화. 미명시 상태에서도 일반적으로 크롤링 허용됨.',
      currentState: `OAI-SearchBot: ${accessLabel[oaiState]} | GPTBot: ${accessLabel[gptState]}`,
      improvement: oaiExplicit && gptOk
        ? '현재 이상적. ChatGPT Search 출처 노출 최적화됨'
        : oaiOk
        ? '현재 접근 가능 상태. 명시적 허용(Allow: /)을 추가하면 최적화됩니다 (선택사항)'
        : '① 서버의 robots.txt 파일 열기\n② 아래 코드 붙여넣기 (기존 내용 뒤에 추가)\n③ 저장 후 https://사이트/robots.txt 에서 확인',
      priority: oaiState === 'explicitly_blocked' ? 'critical' : oaiExplicit ? 'low' : 'medium',
      estimatedScoreGain: oaiExplicit && gptOk ? 0 : oaiExplicit ? 10 : oaiOk ? 8 : 25,
      referenceGuide: 'OpenAI ChatGPT Search: https://help.openai.com/en/articles/9237897-chatgpt-search',
      codeSnippet: !oaiExplicit
        ? `# robots.txt 파일에 추가 (서버 루트에 위치)\n# 현재 미명시 상태 — 명시적으로 추가하면 최적화됨\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Claude-Web\nAllow: /`
        : undefined,
      codeType: 'robots' as const,
    })
  }
  {
    // Block 4: 단어 수 절대 임계값 제거 — 페이지 목적에 맞는 깊이 평가
    const hasDepth = signals.wordCount > 300
    const hasRichContent = signals.wordCount > 800
    const contentScore = signals.wordCount > 2000 ? 85 : signals.wordCount > 800 ? 70 : signals.wordCount > 300 ? 50 : signals.wordCount > 100 ? 35 : 20
    criteria.push({
      id: 'chatgpt_content', name: '콘텐츠 깊이 및 구조', category: 'chatgpt',
      score: contentScore,
      status: hasDepth ? 'pass' : 'warning',
      weight: '높음',
      scoringBasis: `실측: ${signals.wordCount}단어, H2 ${signals.h2s.length}개, H3 ${signals.h3s.length}개. 콘텐츠 깊이는 절대 단어 수가 아닌 페이지 목적에 맞는 완결성으로 평가합니다.`,
      evaluationCriteria: 'AI 인용 가능성: 페이지가 대상 질문에 직접적이고 완전하게 답할 수 있는지, 구체적 수치·사례·출처 인용이 있는지 평가 (연구 근거: arXiv:2311.09735)',
      currentState: `${signals.wordCount}단어 | H2 ${signals.h2s.length}개 | H3 ${signals.h3s.length}개`,
      improvement: hasRichContent
        ? 'FAQ 섹션, 구체적 수치·사례 추가로 AI 인용 가능성 증대 가능'
        : hasDepth
        ? '콘텐츠 존재. 사용자 핵심 질문에 완전히 답하는 섹션과 구체적 데이터 추가 권장'
        : `① 현재 ${signals.wordCount}단어 → 페이지 목적에 맞게 핵심 질문 완결적 답변\n② 각 H2 섹션에 구체적 수치, 사례, 근거 포함\n③ 단어 수보다 사용자 질문 해결 여부가 중요`,
      priority: hasDepth ? 'low' : 'medium',
      estimatedScoreGain: hasRichContent ? 0 : hasDepth ? 5 : 12,
      referenceGuide: 'GEO arXiv:2311.09735: https://arxiv.org/abs/2311.09735',
    })
  }

  // ── GEO (Generative Engine Optimization) ───────────────────────────────────
  {
    // Block 3: H2 최소 3개를 절대 요건에서 제거. 구조 존재 여부와 의미 관계 평가
    const hasAnyStructure = signals.h2s.length > 0
    const hasGoodStructure = signals.h2s.length >= 2
    const structureScore = signals.h2s.length >= 4 ? 90 : hasGoodStructure ? 72 : hasAnyStructure ? 48 : 20
    criteria.push({
      id: 'geo_structure', name: '콘텐츠 계층 구조 (GEO)', category: 'geo',
      score: structureScore,
      status: hasGoodStructure ? 'pass' : hasAnyStructure ? 'warning' : 'warning',
      weight: '높음',
      scoringBasis: `실측: H2 ${signals.h2s.length}개, H3 ${signals.h3s.length}개. GEO 연구(arXiv:2311.09735): 명확한 섹션 구조가 AI 엔진 인용 확률을 높임. H2 최소 3개는 절대 요건이 아니며 페이지 목적에 따라 달라집니다.`,
      evaluationCriteria: 'GEO: H2/H3 계층 구조로 탐색 가능한 포맷, 각 섹션 명확한 주제 구분. 짧은 페이지(FAQ, 제품 등)는 구조가 단순해도 목적 달성 가능.',
      currentState: `H2 ${signals.h2s.length}개 | H3 ${signals.h3s.length}개`,
      improvement: hasGoodStructure
        ? '구조 양호. 각 H2 섹션 첫 문장에 핵심 답변 배치(역피라미드 구조) 권장'
        : hasAnyStructure
        ? '기본 구조 존재. 주요 주제를 추가 H2로 구분하면 AI 인용 구조 개선됨'
        : '① 페이지 주요 주제를 H2 태그로 구분\n② 각 H2 아래 내용을 명확한 문단으로 작성\n③ 세부 항목은 H3으로 추가 구분 (페이지 분량에 맞게)',
      priority: hasGoodStructure ? 'low' : hasAnyStructure ? 'medium' : 'high',
      estimatedScoreGain: hasGoodStructure ? 3 : hasAnyStructure ? 10 : 18,
      referenceGuide: 'GEO arXiv:2311.09735: https://arxiv.org/abs/2311.09735',
      codeSnippet: !hasAnyStructure
        ? `<!-- 페이지 콘텐츠 구조 예시 -->\n<h1>메인 제목 (핵심 키워드)</h1>\n\n<h2>서비스 소개</h2>\n<p>핵심 내용을 첫 문장에...</p>\n\n<h2>주요 기능</h2>\n<p>구체적 설명...</p>\n\n<h2>도입 사례 / FAQ</h2>\n<p>자주 묻는 질문과 답변...</p>`
        : undefined,
      codeType: 'html' as const,
    })
  }
  {
    const extOk = signals.externalLinks >= 3
    criteria.push({
      id: 'geo_citation', name: '외부 출처 인용 (권위성)', category: 'geo',
      score: signals.externalLinks >= 5 ? 90 : extOk ? 70 : signals.externalLinks > 0 ? 45 : 20,
      status: extOk ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `실측: 외부 링크 ${signals.externalLinks}개. GEO 연구: 권위있는 외부 출처 인용이 AI 신뢰도 평가에 긍정적 영향.`,
      evaluationCriteria: 'GEO: 권위있는 외부 출처 인용, 통계/연구 근거 제시',
      currentState: `외부 링크 ${signals.externalLinks}개`,
      improvement: extOk
        ? '양호. 정부/학술/언론 출처 인용 강화 권장'
        : '① 관련 업계 통계, 연구 논문, 공식 가이드라인 링크 추가\n② 예: "출처: 한국인터넷진흥원(KISA) 2024 보고서"\n③ 외부 링크는 새 탭으로 열기 (target="_blank")',
      priority: extOk ? 'low' : 'medium',
      estimatedScoreGain: extOk ? 2 : 12,
      referenceGuide: 'GEO arXiv:2311.09735: https://arxiv.org/abs/2311.09735',
      codeSnippet: !extOk
        ? `<!-- 외부 출처 링크 예시 -->\n<p>국내 AI 시장은 연 30% 성장 중입니다.\n  (<a href="https://www.kisa.or.kr/" target="_blank" rel="noopener">출처: KISA 2024</a>)\n</p>`
        : undefined,
      codeType: 'html' as const,
    })
  }
  {
    const altOk = signals.imageCount > 0 && (signals.imagesWithAlt / signals.imageCount) >= 0.8
    criteria.push({
      id: 'geo_alt', name: '이미지 Alt 텍스트', category: 'geo',
      score: altOk ? 85 : signals.imagesWithAlt > 0 ? 50 : signals.imageCount === 0 ? 60 : 20,
      status: altOk ? 'pass' : signals.imageCount === 0 ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `실측: 이미지 ${signals.imageCount}개 중 alt ${signals.imagesWithAlt}개 (${signals.imageCount > 0 ? Math.round(signals.imagesWithAlt / signals.imageCount * 100) : 0}%).`,
      evaluationCriteria: 'Google: 모든 이미지 alt 속성, 키워드 자연스럽게 포함',
      currentState: `${signals.imageCount}개 이미지 | alt ${signals.imagesWithAlt}개`,
      improvement: altOk || signals.imageCount === 0
        ? '현재 양호.'
        : `① HTML에서 <img> 태그를 찾아 alt 속성 추가\n② alt에는 이미지 내용을 구체적으로 설명\n③ 키워드를 자연스럽게 포함 (과도한 키워드 반복 금지)`,
      priority: altOk || signals.imageCount === 0 ? 'low' : 'high',
      estimatedScoreGain: altOk ? 0 : 10,
      referenceGuide: 'Google Image SEO: https://developers.google.com/search/docs/appearance/google-images',
      codeSnippet: !altOk && signals.imageCount > 0
        ? `<!-- 이미지 alt 텍스트 추가 예시 -->\n<!-- 수정 전 -->\n<img src="product.jpg">\n\n<!-- 수정 후 -->\n<img src="product.jpg" alt="AI 기반 자연어처리 솔루션 ${domain} 데모 화면">`
        : undefined,
      codeType: 'html' as const,
    })
  }

  // ── E-E-A-T ────────────────────────────────────────────────────────────────
  {
    criteria.push({
      id: 'eeat_https', name: 'HTTPS 보안', category: 'eeat',
      score: signals.isHttps ? 95 : 5,
      status: signals.isHttps ? 'pass' : 'fail',
      weight: '높음',
      scoringBasis: `실측: ${signals.isHttps ? 'HTTPS 적용됨' : 'HTTP 사용 중 — 신뢰도 심각 손상'}. 응답시간 ${signals.responseTime}ms.`,
      evaluationCriteria: 'Google E-E-A-T: Trustworthiness 기본 요건. HTTPS 없으면 Chrome 경고 표시',
      currentState: signals.isHttps ? 'HTTPS ✅' : 'HTTP ❌ (보안 경고)',
      improvement: signals.isHttps
        ? 'HTTPS 유지. 응답 속도 최적화 (현재 ' + signals.responseTime + 'ms)'
        : '① 호스팅 업체에 SSL 인증서 설치 요청\n② Let\'s Encrypt 무료 인증서 사용 가능\n③ 설치 후 HTTP → HTTPS 리다이렉트 설정\n④ 모든 내부 링크를 https://로 업데이트',
      priority: signals.isHttps ? 'low' : 'critical',
      estimatedScoreGain: signals.isHttps ? 0 : 20,
      referenceGuide: 'Google E-E-A-T: https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    })
  }
  {
    // Block 4: 단어 수 절대 임계값 제거 — 페이지 목적에 맞는 전문성 평가
    const hasContent = signals.wordCount > 200
    const hasDepth = signals.wordCount > 600
    const depthScore = signals.wordCount > 2000 ? 85 : signals.wordCount > 800 ? 68 : signals.wordCount > 300 ? 48 : signals.wordCount > 100 ? 30 : 15
    criteria.push({
      id: 'eeat_depth', name: '콘텐츠 전문성 및 완결성', category: 'eeat',
      score: depthScore,
      status: hasContent ? 'pass' : 'warning',
      weight: '높음',
      scoringBasis: `실측: ${signals.wordCount}단어. E-E-A-T 관점에서 단어 수 자체보다 실제 경험·전문 지식·권위·신뢰성의 증거(저자 정보, 데이터, 출처, 사례)가 중요합니다. 단어 수는 보조 신호입니다.`,
      evaluationCriteria: 'Google E-E-A-T (공식 가이드): Experience(직접 경험), Expertise(전문성), Authoritativeness(권위성), Trustworthiness(신뢰성). 페이지 목적에 맞는 완결성이 단어 수보다 중요.',
      currentState: `${signals.wordCount}단어`,
      improvement: hasDepth
        ? '전문성 강화: 저자 소개·경력, 구체적 데이터·사례, 작성일/업데이트일 표기 권장'
        : hasContent
        ? '콘텐츠 존재. 저자 전문성 표시, 구체적 수치·출처 추가로 E-E-A-T 강화 권장'
        : `① 페이지 목적에 맞는 핵심 내용을 완결적으로 작성\n② 저자 소개 섹션 추가 (이름, 전문 경력)\n③ 구체적인 데이터·수치·출처 포함\n④ "작성일/업데이트일" 표기`,
      priority: hasContent ? 'medium' : 'high',
      estimatedScoreGain: hasDepth ? 5 : hasContent ? 10 : 15,
      referenceGuide: 'Google E-E-A-T: https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    })
  }
  {
    const ogOk = !!signals.ogTitle && !!signals.ogImage
    criteria.push({
      id: 'eeat_social', name: 'OG 태그 (소셜 공유)', category: 'eeat',
      score: ogOk ? 85 : signals.ogTitle ? 55 : 20,
      status: ogOk ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `실측: OG Title ${signals.ogTitle ? '있음' : '없음'}, OG Image ${signals.ogImage ? '있음' : '없음'}.`,
      evaluationCriteria: 'Google E-E-A-T: 브랜드 인지도, 소셜 참여도',
      currentState: `OG Title: ${signals.ogTitle ? '✅' : '❌'} | OG Image: ${signals.ogImage ? '✅' : '❌'}`,
      improvement: ogOk
        ? 'OG Image 권장 사이즈 1200×630px 확인'
        : '① HTML <head> 안에 OG 태그 추가\n② OG Image는 1200×630px 이미지 사용\n③ SNS 공유 시 미리보기 카드 자동 생성됨',
      priority: ogOk ? 'low' : 'medium',
      estimatedScoreGain: ogOk ? 0 : 8,
      referenceGuide: 'Open Graph Protocol: https://ogp.me/',
      codeSnippet: !ogOk
        ? `<!-- HTML <head> 안에 추가 -->\n<meta property="og:title" content="${signals.title || domain + ' - 서비스 소개'}">\n<meta property="og:description" content="서비스 핵심 가치를 2-3문장으로 설명">\n<meta property="og:image" content="https://${domain}/og-image.jpg">\n<meta property="og:url" content="https://${domain}/">\n<meta property="og:type" content="website">\n<meta name="twitter:card" content="summary_large_image">`
        : undefined,
      codeType: 'html' as const,
    })
  }

  // ── Schema.org ─────────────────────────────────────────────────────────────
  {
    const schemaContent = signals.jsonLdRaw.join(' ').toLowerCase()
    const hasFaq = schemaContent.includes('faqpage') || schemaContent.includes('howto')
    criteria.push({
      id: 'schema_jsonld', name: 'JSON-LD 구조화 데이터', category: 'schema',
      score: signals.hasSchema ? (hasFaq ? 90 : schemaContent.includes('@graph') ? 80 : 65) : 10,
      status: signals.hasSchema ? 'pass' : 'fail',
      weight: '높음',
      scoringBasis: `실측: JSON-LD ${signals.jsonLdRaw.length}개 발견. ${signals.hasSchema ? `포함 타입 확인됨` : '구조화 데이터 없음 — AI 검색엔진 이해도 저하'}`,
      evaluationCriteria: 'Schema.org: Organization, WebPage, FAQ, BreadcrumbList 권장',
      currentState: signals.hasSchema ? `JSON-LD ${signals.jsonLdRaw.length}개` : '구조화 데이터 없음',
      improvement: !signals.hasSchema
        ? '① HTML <head> 끝부분에 JSON-LD 스크립트 추가\n② 오른쪽 코드를 복사해서 붙여넣기\n③ "name", "url" 부분을 실제 정보로 수정\n④ Google Rich Results Test(search.google.com/test/rich-results)에서 검증'
        : hasFaq
        ? '현재 우수. SpeakableSpecification 추가 고려'
        : '① 기존 JSON-LD에 FAQPage 스키마 추가\n② AI 검색엔진이 Q&A를 직접 인용 가능해짐',
      priority: signals.hasSchema ? 'medium' : 'critical',
      estimatedScoreGain: signals.hasSchema ? (hasFaq ? 0 : 15) : 35,
      referenceGuide: 'Schema.org: https://schema.org/ | Google Rich Results: https://search.google.com/test/rich-results',
      codeSnippet: !signals.hasSchema
        ? `<!-- HTML <head> 끝부분에 추가 -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "${signals.title || domain}",\n  "url": "https://${domain}",\n  "logo": "https://${domain}/logo.png",\n  "description": "회사/서비스 설명",\n  "sameAs": [\n    "https://www.linkedin.com/company/회사명",\n    "https://namu.wiki/w/회사명"\n  ]\n}\n</script>`
        : hasFaq ? undefined
        : `<!-- 기존 JSON-LD 옆에 추가 -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [\n    {\n      "@type": "Question",\n      "name": "자주 묻는 질문 1?",\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": "답변 내용"\n      }\n    }\n  ]\n}\n</script>`,
      codeType: 'json' as const,
    })
  }
  {
    const hasSameAs = signals.jsonLdRaw.join(' ').toLowerCase().includes('sameas')
    criteria.push({
      id: 'schema_entity', name: 'SameAs 브랜드 엔티티 연결', category: 'schema',
      score: hasSameAs ? 90 : signals.hasSchema ? 40 : 10,
      status: hasSameAs ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `실측: SameAs 속성 ${hasSameAs ? '있음 — Knowledge Graph 연결됨' : '없음 — 브랜드 엔티티 미연결'}.`,
      evaluationCriteria: 'Schema.org Organization: sameAs로 위키피디아, SNS, 공식 프로필 연결',
      currentState: `SameAs: ${hasSameAs ? '있음 ✅' : '없음'}`,
      improvement: hasSameAs
        ? 'LinkedIn, 위키피디아, 공식 SNS 모두 포함 여부 점검'
        : '① Organization 스키마의 sameAs 배열에 공식 프로필 URL 추가\n② LinkedIn, 나무위키/위키피디아, 유튜브, 공식 SNS\n③ AI 검색엔진이 브랜드를 Knowledge Graph와 연결해 신뢰도 향상',
      priority: hasSameAs ? 'low' : 'high',
      estimatedScoreGain: hasSameAs ? 0 : 20,
      referenceGuide: 'Schema.org sameAs: https://schema.org/sameAs',
      codeSnippet: !hasSameAs
        ? `<!-- Organization JSON-LD의 sameAs 항목 추가/수정 -->\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "${signals.title || domain}",\n  "url": "https://${domain}",\n  "sameAs": [\n    "https://www.linkedin.com/company/회사명",\n    "https://namu.wiki/w/회사명",\n    "https://www.youtube.com/@채널명",\n    "https://twitter.com/계정명"\n  ]\n}`
        : undefined,
      codeType: 'json' as const,
    })
  }

  // ── Bing / AEO ─────────────────────────────────────────────────────────────
  {
    criteria.push({
      id: 'bing_sitemap', name: 'Sitemap 등록', category: 'bing',
      score: signals.hasSitemap ? 85 : 20,
      status: signals.hasSitemap ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `실측: robots.txt Sitemap 선언 ${signals.hasSitemap ? '있음' : '없음'}.`,
      evaluationCriteria: 'Bing Webmaster: sitemap.xml robots.txt 명시 + Bing Webmaster Tools 제출',
      currentState: `Sitemap: ${signals.hasSitemap ? '명시됨 ✅' : '없음'}`,
      improvement: signals.hasSitemap
        ? 'Bing Webmaster Tools(bing.com/webmasters)에서 Sitemap 제출 완료 여부 확인'
        : '① sitemap.xml 파일 생성 (CMS는 자동 생성 플러그인 활용)\n② robots.txt 파일에 sitemap 위치 추가\n③ Bing Webmaster Tools에 sitemap URL 제출',
      priority: signals.hasSitemap ? 'low' : 'high',
      estimatedScoreGain: signals.hasSitemap ? 0 : 15,
      referenceGuide: 'Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a',
      codeSnippet: !signals.hasSitemap
        ? `# robots.txt 파일에 추가\nSitemap: https://${domain}/sitemap.xml\n\n# sitemap.xml 기본 구조 (별도 파일로 생성)\n# <?xml version="1.0" encoding="UTF-8"?>\n# <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n#   <url>\n#     <loc>https://${domain}/</loc>\n#     <lastmod>2024-01-01</lastmod>\n#   </url>\n# </urlset>`
        : undefined,
      codeType: 'robots' as const,
    })
  }
  {
    const bingState = interpretBotAccess(rb, 'bingbot')
    const bingOk = bingState !== 'explicitly_blocked'
    criteria.push({
      id: 'bing_bot', name: 'Bingbot 크롤 접근', category: 'bing',
      score: bingOk ? 85 : 20,
      status: bingOk ? 'pass' : 'fail',
      weight: '중간',
      scoringBasis: `실측: robots.txt 해석 Bingbot ${bingState === 'explicitly_allowed' ? '명시적 허용' : bingState === 'allowed_by_general_rule' ? '일반 규칙 허용' : '차단 규칙 확인 필요'}. 특정 하위 경로의 Disallow는 전체 차단으로 오인하지 않습니다.`,
      evaluationCriteria: 'Bing: Bingbot 전체 차단 시 Bing Search, Bing AI, Copilot에서 미노출',
      currentState: `Bingbot 접근: ${bingOk ? '허용 ✅' : '차단 규칙 검토 필요 ❌'}`,
      improvement: bingOk
        ? '현재 전체 차단 규칙 없음. 부분 차단 경로가 있는지만 점검'
        : '① robots.txt 파일 열기\n② "Disallow: /" 등 전체 차단 규칙을 수정\n③ Bingbot에 대해 필요한 부분만 경로 지정',
      priority: bingOk ? 'low' : 'critical',
      estimatedScoreGain: bingOk ? 0 : 15,
      referenceGuide: 'Bing Webmaster: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a',
      codeSnippet: !bingOk
        ? `# robots.txt 예시\nUser-agent: Bingbot\nAllow: /`
        : undefined,
      codeType: 'robots' as const,
    })
  }

  // ── Analytics (GA4) - SEO 점수 영향 없음 ──────────────────────────────────
  {
    const ga4Ok = signals.hasGA4
    const gtmOk = signals.hasGTM
    const anyOk = ga4Ok || gtmOk
    criteria.push({
      id: 'tech_analytics', name: 'GA4/분석 환경', category: 'analytics',
      score: ga4Ok ? 95 : gtmOk ? 70 : 35,
      status: ga4Ok ? 'pass' : 'warning',
      weight: '참고 (SEO 점수 미영향)',
      scoringBasis: `실측: GA4 ${ga4Ok ? `감지됨${signals.ga4MeasurementId ? ` (${signals.ga4MeasurementId})` : ''}` : '미설치'}, GTM ${gtmOk ? `감지됨` : '미설치'}. (참고: GA4 미설치는 SEO/GEO 검색 순위 감점 대상이 아닙니다.)`,
      evaluationCriteria: '측정 환경: 성과 추적 및 전환 데이터 분석용 (SEO Foundation/AI Citation 점수 감점 없음)',
      currentState: ga4Ok
        ? `GA4 ✅${signals.ga4MeasurementId ? ` (${signals.ga4MeasurementId})` : ''}`
        : gtmOk
        ? `GTM ✅`
        : '분석 도구 미설치 (SEO 점수에는 영향 없음)',
      improvement: ga4Ok
        ? '성과 측정 환경 정상 설정됨. Search Console 연동 권장'
        : '① SEO 성과 측정을 위해 GA4 설치 권장 (선택 사항)\n② 검색 순위/SEO 점수에는 감점 요인으로 작용하지 않음',
      priority: 'low',
      estimatedScoreGain: 0,
      referenceGuide: 'Google Analytics 4: https://support.google.com/analytics/answer/10089681',
      codeSnippet: !anyOk
        ? `<!-- HTML <head> 내 선택적 추가 -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXXXXX');\n</script>`
        : undefined,
      codeType: 'html' as const,
    })
  }

  // ── 요약 생성 ───────────────────────────────────────────────────────────────
  const failItems = criteria.filter(c => c.status === 'fail')
  const warnItems = criteria.filter(c => c.status === 'warning')
  const passItems = criteria.filter(c => c.status === 'pass')

  const criticalIssues = criteria
    .filter(c => c.priority === 'critical')
    .map(c => `[${c.name}] ${c.improvement}`)

  const quickWins = criteria
    .filter(c => c.estimatedScoreGain >= 8 && c.status !== 'pass')
    .sort((a, b) => b.estimatedScoreGain - a.estimatedScoreGain)
    .slice(0, 4)
    .map(c => `+${c.estimatedScoreGain}점: ${c.improvement.slice(0, 80)}`)

  const strengthSummary = passItems.slice(0, 4).map(c => `${c.name}: ${c.currentState}`)

  const summary = `${domain}의 SEO+AEO 종합 점수는 ${overall}점입니다. ` +
    (failItems.length > 0 ? `${failItems.map(c => c.name).join(', ')} 등 ${failItems.length}개 항목이 즉시 개선 필요합니다. ` : '') +
    (warnItems.length > 0 ? `${warnItems.length}개 항목은 개선 여지가 있으며 ` : '') +
    `${passItems.length}개 항목은 현재 기준을 충족합니다.`

  const ruleResults = criteria.map(c => ({
    ruleId: c.id,
    ruleVersion: 'v3.0',
    title: c.name,
    category: c.category as 'technical' | 'chatgpt' | 'geo' | 'eeat' | 'schema' | 'bing' | 'analytics',
    status: (c.status === 'pass' ? 'pass' : c.status === 'fail' ? 'fail' : 'warning') as 'pass' | 'warning' | 'fail' | 'unknown' | 'not_applicable',
    severity: (c.priority === 'critical' ? 'critical' : c.priority === 'high' ? 'high' : c.priority === 'medium' ? 'medium' : 'low') as 'critical' | 'high' | 'medium' | 'low',
    applicable: true,
    observedValue: c.currentState,
    rawEvidence: c.scoringBasis,
    evidenceType: (c.priority === 'critical' ? 'official_requirement' : 'official_recommendation') as 'official_requirement' | 'official_recommendation',
    scoreEffect: c.priority === 'critical' ? '영향도 높음' : '영향도 중간',
    recommendation: c.improvement,
    verificationMethod: 'URL 파싱 자동 검증',
    limitations: '정적 신호 파싱 한계 내 산출',
    codeSnippet: c.codeSnippet,
    codeType: c.codeType,
  }))

  return {
    title: signals.title || domain,
    overallScore: overall,
    technicalScore: scores.technicalScore,
    chatGptSearchScore: scores.chatGptSearchScore,
    academicGeoScore: scores.academicGeoScore,
    eeatScore: scores.eeatScore,
    schemaScore: scores.schemaScore,
    bingScore: scores.bingScore,
    summary,
    criteria,
    ruleResults,
    strengthSummary,
    criticalIssues,
    quickWins,
  }
}

// ─── Gemini API 호출 + 전체 분석 ────────────────────────────────────────────

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function runAnalysis(
  targetUrl: string,
  geminiKey: string | undefined,
  emit?: EmitFn,
): Promise<{ result: Record<string, unknown>; signals: PageSignals }> {
  const now = () => Date.now()

  const signals = await fetchPageSignals(targetUrl, emit)

  emit?.({ type: 'signals', data: signals, ts: now() })

  const scores = calcCategoryScore(signals)
  const overall = Math.round(
    scores.technicalScore     * 0.20 +
    scores.chatGptSearchScore * 0.18 +
    scores.eeatScore          * 0.18 +
    scores.academicGeoScore   * 0.16 +
    scores.schemaScore        * 0.16 +
    scores.bingScore          * 0.12
  )

  emit?.({
    type: 'step',
    msg: `🧮 점수 계산 완료 — 종합: ${overall}점 | Tech: ${scores.technicalScore} | ChatGPT: ${scores.chatGptSearchScore} | GEO: ${scores.academicGeoScore} | E-E-A-T: ${scores.eeatScore} | Schema: ${scores.schemaScore} | Bing: ${scores.bingScore}`,
    level: 'success',
    ts: now(),
  })

  // Gemini 키 없으면 규칙 기반으로 즉시 반환
  if (!geminiKey) {
    emit?.({ type: 'step', msg: `📋 규칙 기반 SEO+AEO 분석 완료 (Gemini 키 없음 — 실측 데이터 기반)`, level: 'success', ts: now() })
    const result = generateRuleBasedResult(signals, scores)
    return { result, signals }
  }

  emit?.({ type: 'step', msg: `🤖 Gemini AI에게 분석 요청 중... (15~20초 소요)`, level: 'info', ts: now() })

  const systemPrompt = `당신은 SEO 전문가입니다. 실제 측정된 데이터를 기반으로 각 항목의 점수 근거와 개선 방안을 JSON으로 작성합니다.
점수는 이미 계산되어 있습니다. 당신의 역할:
1. 왜 그 점수인지 실측 데이터를 인용하며 구체적으로 설명
2. 공식 가이드라인 기준 어디에 해당하는지 명시
3. 실행 가능한 구체적 개선 방안 제시

평가 기준 공식 문서:
- Google How Search Works: https://developers.google.cn/search/docs/fundamentals/how-search-works
- OpenAI ChatGPT Search Guide: https://help.openai.com/en/articles/9237897-chatgpt-search
- arXiv:2311.09735 (GEO): https://arxiv.org/abs/2311.09735
- Google E-E-A-T: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Schema.org: https://schema.org/
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- Google AI Optimization: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

반드시 유효한 JSON만 출력하세요. 마크다운 없이 순수 JSON.`

  const dataBlock = `=== 실제 측정 데이터 ===
URL: ${signals.url}
HTTPS: ${signals.isHttps} | HTTP: ${signals.statusCode} | 응답: ${signals.responseTime}ms
${signals.fetchError ? `접속오류: ${signals.fetchError}` : ''}
[Title] (${signals.title.length}자): "${signals.title}"
[Meta Desc] (${signals.metaDescription.length}자): "${signals.metaDescription}"
[Canonical]: ${signals.canonical || '없음'}
[Robots]: ${signals.metaRobots || '없음'}
[Viewport]: ${signals.hasViewport}
[H1](${signals.h1s.length}): ${signals.h1s.join(' / ') || '없음'}
[H2](${signals.h2s.length}): ${signals.h2s.slice(0, 5).join(' / ') || '없음'}
[H3](${signals.h3s.length}): ${signals.h3s.slice(0, 4).join(' / ') || '없음'}
[OG Title]: ${signals.ogTitle || '없음'} | [OG Desc]: ${signals.ogDescription || '없음'}
[OG Image]: ${signals.ogImage ? '있음' : '없음'} | [Twitter Card]: ${signals.twitterCard || '없음'}
[Hreflang]: ${signals.hasHreflang} | [Sitemap]: ${signals.hasSitemap}
[JSON-LD]: ${signals.hasSchema} (${signals.jsonLdRaw.length}개)
${signals.jsonLdRaw.map((j, i) => `[LD${i + 1}] ${j.slice(0, 500)}`).join('\n')}
[단어수]: ${signals.wordCount} | [내부링크]: ${signals.internalLinks} | [외부링크]: ${signals.externalLinks}
[이미지]: ${signals.imageCount}개 (alt있음: ${signals.imagesWithAlt}개)

=== robots.txt ===
${signals.robotsTxt.slice(0, 1500) || '없음'}

=== 계산된 점수 ===
Technical: ${scores.technicalScore} | ChatGPT: ${scores.chatGptSearchScore} | GEO: ${scores.academicGeoScore}
E-E-A-T: ${scores.eeatScore} | Schema: ${scores.schemaScore} | Bing: ${scores.bingScore} | 종합: ${overall}`

  const userPrompt = `${dataBlock}

위 실측 데이터 기반으로 아래 JSON을 반환하세요:

{
  "title": "실측 Title 또는 도메인명",
  "overallScore": ${overall},
  "technicalScore": ${scores.technicalScore},
  "chatGptSearchScore": ${scores.chatGptSearchScore},
  "academicGeoScore": ${scores.academicGeoScore},
  "eeatScore": ${scores.eeatScore},
  "schemaScore": ${scores.schemaScore},
  "bingScore": ${scores.bingScore},
  "summary": "실측 데이터 기반 2-3문장 현황 요약",
  "criteria": [
    {
      "id": "tech_title",
      "name": "Title 태그 최적화",
      "category": "technical",
      "score": 숫자,
      "status": "pass|warning|fail",
      "weight": "높음",
      "scoringBasis": "실측: Title='${signals.title.slice(0, 60)}' (${signals.title.length}자). [판단 근거]",
      "evaluationCriteria": "Google: Title 30-60자 권장",
      "currentState": "현재 상태",
      "improvement": "개선 방법",
      "priority": "critical|high|medium|low",
      "estimatedScoreGain": 숫자,
      "referenceGuide": "Google How Search Works: https://developers.google.cn/search/docs/fundamentals/how-search-works"
    }
  ],
  "strengthSummary": ["강점1", "강점2"],
  "criticalIssues": ["문제1", "문제2"],
  "quickWins": ["빠른개선1", "빠른개선2"]
}

criteria 15개 필수: technical(3), chatgpt(2), geo(3), eeat(3), schema(2), bing(2)
모든 scoringBasis에 실측 수치를 인용할 것.`

  const geminiRes = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 6000, temperature: 0.3, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!geminiRes.ok) {
    const errData = await geminiRes.json() as { error?: { message: string } }
    const msg = errData.error?.message ?? `Gemini API 오류 (HTTP ${geminiRes.status})`
    emit?.({ type: 'step', msg: `⚠️ Gemini 오류: ${msg} — 규칙 기반 분석으로 전환`, level: 'warn', ts: now() })
    const result = generateRuleBasedResult(signals, scores)
    return { result, signals }
  }

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  let result: Record<string, unknown>
  try {
    result = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Gemini 응답 JSON 파싱 실패')
    result = JSON.parse(match[0])
  }

  // 실측 점수로 덮어쓰기
  result.overallScore       = overall
  result.technicalScore     = scores.technicalScore
  result.chatGptSearchScore = scores.chatGptSearchScore
  result.academicGeoScore   = scores.academicGeoScore
  result.eeatScore          = scores.eeatScore
  result.schemaScore        = scores.schemaScore
  result.bingScore          = scores.bingScore

  const criteriaCount = Array.isArray(result.criteria) ? result.criteria.length : 0
  emit?.({
    type: 'step',
    msg: `✅ Gemini 분석 완료 — ${criteriaCount}개 기준 항목 생성`,
    level: 'success',
    ts: now(),
  })

  return { result, signals }
}
