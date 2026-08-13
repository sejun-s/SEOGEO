import type {
  CriteriaItem,
  MeasurementConfidence,
  PageSignals,
  SchemaEvaluationLevel,
  SearchEligibilityResult,
} from '../types.ts'
import { crawlSite } from './siteCrawler.ts'
import { interpretRobotsAccess } from '../lib/robotsPolicy.ts'

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
  let robotsTxtStatus: PageSignals['robotsTxtStatus'] = 'unavailable'
  let hasSitemap = false
  try {
    const r = await fetch(`${base.origin}/robots.txt`, { headers: HEADERS, signal: AbortSignal.timeout(5000) })
    if (r.ok) {
      robotsTxtStatus = 'found'
      robotsTxt = (await r.text()).slice(0, 3000)
      hasSitemap = robotsTxt.toLowerCase().includes('sitemap:')
      const hasOai = /oai-searchbot/i.test(robotsTxt)
      const hasGpt = /gptbot/i.test(robotsTxt)
      emit?.({ type: 'step', msg: `🤖 robots.txt 확인 — OAI-SearchBot: ${hasOai ? '명시됨' : '없음'} | GPTBot: ${hasGpt ? '명시됨' : '없음'} | Sitemap: ${hasSitemap ? '있음' : '없음'}`, level: 'info', ts: now() })
    } else if (r.status === 404 || r.status === 410) robotsTxtStatus = 'not_found'
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
      jsonLdRaw: [], robotsTxt, robotsTxtStatus, hasViewport: false, hasCharset: false,
      wordCount: 0, internalLinks: 0, externalLinks: 0,
      imageCount: 0, imagesWithAlt: 0, hasSchema: false, hasHreflang: false, hasSitemap,
      questionHeadingCount: 0, statisticCount: 0, hasAuthorSignal: false, hasDateSignal: false, schemaParseValid: true,
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
  const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const questionHeadingCount = [...h2s, ...h3s].filter(heading => /[?？]|(?:무엇|왜|어떻게|방법|비교|추천|가격|비용|효과|장점|단점)/i.test(heading)).length
  const statisticCount = (visibleText.match(/\b\d+(?:[.,]\d+)?\s*(?:%|퍼센트|배|건|명|원|개월|년|시간|분)\b/g) ?? []).length
  const hasAuthorSignal = /"author"\s*:|rel=["']author["']|class=["'][^"']*author/i.test(html)
  const hasDateSignal = /"date(?:published|modified)"\s*:|<time\b/i.test(html)
  const schemaParseValid = jsonLdRaw.every(raw => { try { JSON.parse(raw); return true } catch { return false } })

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
    jsonLdRaw, robotsTxt, robotsTxtStatus, hasViewport, hasCharset,
    wordCount, internalLinks, externalLinks,
    imageCount: imgTags.length, imagesWithAlt,
    hasSchema, hasHreflang, hasSitemap,
    questionHeadingCount, statisticCount, hasAuthorSignal, hasDateSignal, schemaParseValid,
    hasGA4, ga4MeasurementId, hasGTM, gtmId, hasUALegacy, hasFbPixel, hasNaverAnalytics,
  }

  emit?.({
    type: 'step',
    msg: `📊 파싱 완료 — Title: "${title.slice(0, 40) || '없음'}" | H1: ${h1s.length}개 | 단어: ${wordCount} | Schema: ${hasSchema ? '있음' : '없음'}`,
    level: 'success',
    ts: now(),
  })

  // ── Shopify 감지 및 AI 가시성 신호 추출 ────────────────────────────────────
  const isShopify =
    /cdn\.shopify\.com/i.test(html) ||
    /shopify\.theme/i.test(html) ||
    /myshopify\.com/i.test(targetUrl) ||
    /<meta[^>]+name=["']shopify-[^"']+["']/i.test(html) ||
    /window\.Shopify\s*=/i.test(html)

  if (isShopify) {
    emit?.({ type: 'step', msg: '🛍️ Shopify 스토어 감지 — AI 가시성 체크리스트 분석 중...', level: 'info', ts: now() })

    // ── 상품 페이지 샘플링 ────────────────────────────────────────────────────
    // Product/Offer/AggregateRating 스키마는 홈페이지가 아닌 상품 페이지에 있음
    // 홈페이지에서 /products/xxx 링크를 찾아 한 페이지를 추가로 fetch
    let productPageHtml = ''
    let productPageChecked: string | undefined
    let schemaCheckedOnHomepage = true

    const productHrefMatch = html.match(/href=["']([^"']*\/products\/[A-Za-z0-9_%-][^"'?#]*)["']/i)
    if (productHrefMatch) {
      const rawHref = productHrefMatch[1]
      const productUrl = rawHref.startsWith('http')
        ? rawHref
        : `${base.origin}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`
      try {
        emit?.({ type: 'step', msg: `🔬 상품 페이지 스키마 확인 중: ${rawHref.split('/products/')[1]?.slice(0, 40) ?? ''}`, level: 'info', ts: now() })
        const productRes = await fetch(productUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
        if (productRes.ok) {
          productPageHtml = (await productRes.text()).slice(0, 200_000)
          productPageChecked = productUrl
          schemaCheckedOnHomepage = false
        }
      } catch {
        // 상품 페이지 접근 실패 → 홈페이지 HTML로 fallback
      }
    }

    // 스키마 확인 대상: 상품 페이지 우선, 없으면 홈페이지
    const schemaHtml = productPageHtml || html

    // ── JSON-LD 타입 파싱 ─────────────────────────────────────────────────────
    const extractLdRaw = (src: string): string[] => {
      const results: string[] = []
      const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      let m: RegExpExecArray | null
      while ((m = re.exec(src)) !== null) results.push(m[1].trim().slice(0, 3000))
      return results
    }

    const parseLdTypes = (raws: string[]): string[] =>
      raws.flatMap((raw) => {
        try {
          const obj = JSON.parse(raw) as Record<string, unknown>
          const collect = (o: Record<string, unknown>): string[] => {
            const types: string[] = []
            if (typeof o['@type'] === 'string') types.push(o['@type'])
            if (Array.isArray(o['@type'])) types.push(...(o['@type'] as string[]))
            for (const v of Object.values(o)) {
              if (v && typeof v === 'object' && !Array.isArray(v))
                types.push(...collect(v as Record<string, unknown>))
            }
            return types
          }
          return collect(obj)
        } catch { return [] }
      })

    const ldTypes = parseLdTypes(extractLdRaw(schemaHtml))

    const hasProductSchema      = ldTypes.some(t => /^product$/i.test(t))
    const hasOfferSchema        = ldTypes.some(t => /^offer(s)?$/i.test(t))
    const hasAggregateRating    = ldTypes.some(t => /^aggregaterating$/i.test(t))
    const hasFaqSchema          = ldTypes.some(t => /^faqpage$/i.test(t))
    const hasBreadcrumbSchema   = ldTypes.some(t => /^breadcrumblist$/i.test(t))
    const hasOrganizationSchema = ldTypes.some(t => /^(organization|brand|store)$/i.test(t))

    // 콘텐츠·브랜드 신호 (홈페이지 네비 기준)
    const hasBlogSection  = /href=["'][^"']*\/blogs\//i.test(html)
    const hasAboutPage    = /href=["'][^"']*\/pages\/(?:about|brand|who-we-are|our-story|about-us|about-brand|story|team|company)/i.test(html)
    const hasContactPage  = /href=["'][^"']*\/pages\/(?:contact|contact-us|support|help)/i.test(html)

    // 리뷰 앱 감지
    const reviewAppDetected = /judgeme|judge\.me/i.test(html)
      ? 'Judge.me'
      : /okendo\.io/i.test(html)
      ? 'Okendo'
      : /yotpo/i.test(html)
      ? 'Yotpo'
      : /stamped\.io/i.test(html)
      ? 'Stamped.io'
      : /loox\.io/i.test(html)
      ? 'Loox'
      : undefined

    // IndexNow
    const hasIndexNow = /indexnow/i.test(html)

    // AI 크롤러 접근 상태
    const oaiSearchBotStatus = pageBotAccess(signals, 'oai-searchbot')
    const gptBotStatus       = pageBotAccess(signals, 'gptbot')

    // ── 점수 계산 ─────────────────────────────────────────────────────────────
    type ScoreEntry = { label: string; earned: number; max: number; pass: boolean }
    const breakdown: ScoreEntry[] = [
      {
        label: 'OAI-SearchBot 접근 허용',
        max: 20,
        pass: oaiSearchBotStatus !== 'explicitly_blocked',
        earned: oaiSearchBotStatus !== 'explicitly_blocked' ? 20 : 0,
      },
      {
        label: 'Product JSON-LD 스키마',
        max: 20,
        pass: hasProductSchema,
        earned: hasProductSchema ? 20 : 0,
      },
      {
        label: 'Offer.price 스키마 (가격 구조화)',
        max: 15,
        pass: hasOfferSchema,
        earned: hasOfferSchema ? 15 : 0,
      },
      {
        label: 'AggregateRating (리뷰 스키마)',
        max: 15,
        pass: hasAggregateRating,
        earned: hasAggregateRating ? 15 : 0,
      },
      {
        label: '블로그 섹션 활성화',
        max: 10,
        pass: hasBlogSection,
        earned: hasBlogSection ? 10 : 0,
      },
      {
        label: 'FAQPage 스키마',
        max: 10,
        pass: hasFaqSchema,
        earned: hasFaqSchema ? 10 : 0,
      },
      {
        label: '브랜드 About 페이지',
        max: 10,
        pass: hasAboutPage,
        earned: hasAboutPage ? 10 : 0,
      },
    ]

    const shopifyAiScore = breakdown.reduce((s, b) => s + b.earned, 0)

    signals.shopify = {
      isShopify: true,
      oaiSearchBotStatus,
      gptBotStatus,
      hasProductSchema,
      hasOfferSchema,
      hasAggregateRating,
      hasFaqSchema,
      hasBreadcrumbSchema,
      hasOrganizationSchema,
      hasBlogSection,
      hasAboutPage,
      hasContactPage,
      reviewAppDetected,
      hasIndexNow,
      productPageChecked,
      schemaCheckedOnHomepage,
      shopifyAiScore,
      scoreBreakdown: breakdown,
    }

    emit?.({
      type: 'step',
      msg: `🛍️ Shopify AI 점수 ${shopifyAiScore}/100 — Product: ${hasProductSchema ? '✅' : '❌'} | AggRating: ${hasAggregateRating ? '✅' : '❌'} | Blog: ${hasBlogSection ? '✅' : '❌'}`,
      level: shopifyAiScore >= 70 ? 'success' : shopifyAiScore >= 40 ? 'info' : 'warn',
      ts: now(),
    })
  }

  return signals
}

// ─── robots.txt 접근 상태 해석 (Block 3: 미명시 ≠ 차단) ─────────────────────

type BotAccessState = 'explicitly_allowed' | 'allowed_by_general_rule' | 'explicitly_blocked' | 'unknown'

function interpretBotAccess(rb: string, botName: string): BotAccessState {
  return interpretRobotsAccess(rb, botName)
}

function pageBotAccess(s: PageSignals, botName: string): BotAccessState {
  const state = interpretBotAccess(s.robotsTxt.toLowerCase(), botName)
  return state === 'unknown' && s.robotsTxtStatus === 'not_found' ? 'allowed_by_general_rule' : state
}

// ─── 검색 자격 게이트 (Block 4) ──────────────────────────────────────────────

export function calcSearchEligibility(s: PageSignals): SearchEligibilityResult {
  const noindex = s.metaRobots.toLowerCase().includes('noindex')
  const generalAccess = pageBotAccess(s, '*')
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
      status: s.robotsTxtStatus === 'unavailable' ? 'unknown' : generalAccess === 'explicitly_blocked' ? 'fail' : 'pass',
      detail: s.robotsTxtStatus === 'unavailable' ? '응답 확인 불가' : s.robotsTxtStatus === 'not_found' ? 'robots.txt 없음 — 기본 수집 허용' : generalAccess === 'explicitly_blocked' ? '루트 전체 차단 규칙' : '공개 경로 수집 가능',
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
  if (s.robotsTxtStatus !== 'unavailable') score += 1
  if (s.hasSitemap) score += 1
  if (s.wordCount > 100) score += 1
  if (s.hasSchema) score += 1
  if (s.title && s.metaDescription) score += 1
  return score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low'
}

// ─── AI Citation Readiness 추정 (Block 3 - 정적 분석 기반) ───────────────────

export function calcAiCitationReadiness(s: PageSignals): number {
  const oaiState = pageBotAccess(s, 'oai-searchbot')
  if (oaiState === 'explicitly_blocked') return 0

  const accessScore = oaiState === 'unknown' ? 0 : 100
  const structureScore = Math.min(100,
    (s.h1s.length === 1 ? 30 : 0) +
    (s.h2s.length > 0 ? 25 : 0) +
    (s.title ? 20 : 0) +
    (s.metaDescription ? 15 : 0) +
    (s.wordCount > 200 ? 10 : 0)
  )
  const evidenceScore = Math.min(100,
    Math.min(50, s.externalLinks * 10) +
    (s.wordCount > 300 ? 20 : 0) +
    (s.imageCount > 0 && s.imagesWithAlt / s.imageCount >= 0.8 ? 15 : 0) +
    (s.hasSchema ? 15 : 0)
  )
  const schemaContent = s.jsonLdRaw.join(' ').toLowerCase()
  const hasOrgSchema = schemaContent.includes('organization') || schemaContent.includes('person')
  const entityScore = Math.min(100,
    (hasOrgSchema ? 45 : s.hasSchema ? 20 : 0) +
    (schemaContent.includes('sameas') ? 30 : 0) +
    (s.ogTitle && s.ogDescription ? 15 : 0) +
    (s.canonical ? 10 : 0)
  )
  return Math.round(accessScore * 0.25 + structureScore * 0.30 + evidenceScore * 0.25 + entityScore * 0.20)
}

// ─── 실측 기반 점수 계산 (v2 — Block 3/4 기준 적용) ─────────────────────────

export interface CategoryScores {
  technicalScore: number
  chatGptSearchScore: number
  schemaScore: number
  eeatScore: number
  academicGeoScore: number
  bingScore: number
  naverScore: number
  seoFoundationScore: number
  aiCitationReadinessScore: number
  searchEligibility: SearchEligibilityResult
  measurementConfidence: MeasurementConfidence
  schemaEvaluationLevel: SchemaEvaluationLevel
  scoreModelVersion: string
  diagnosticScores: {
    searchEligibility: number
    technicalStructure: number
    contentExtractability: number
    evidenceQuality: number
    entityClarity: number
    platformAccessibility: number
  }
}

export function calcCategoryScore(s: PageSignals): CategoryScores {
  let tech = 0
  if (s.isHttps)                                              tech += 10
  if (s.statusCode === 200)                                   tech += 15
  if (!s.metaRobots.toLowerCase().includes('noindex'))        tech += 15
  if (s.title)                                                tech += 15
  if (s.metaDescription)                                      tech += 10
  if (s.canonical)                                            tech += 10
  if (s.h1s.length > 0)                                       tech += 10
  if (s.hasViewport)                                          tech += 8
  if (s.responseTime < 3000)                                  tech += 7
  else if (s.responseTime < 6000)                             tech += 3

  // ChatGPT Search — 미명시는 allowed_by_general_rule로 해석 (Block 3)
  const oaiState = pageBotAccess(s, 'oai-searchbot')
  let chatgpt = 0
  chatgpt += oaiState === 'explicitly_blocked' ? 0 : oaiState === 'unknown' ? 0 : 45
  if (s.title && s.metaDescription)                            chatgpt += 20
  if (s.h1s.length === 1 && s.h2s.length > 0)                  chatgpt += 15
  if (s.wordCount > 200)                                      chatgpt += 10
  if (s.externalLinks > 0)                                    chatgpt += 10

  let schema = 0
  if (s.hasSchema) schema += 30
  if (s.jsonLdRaw.length > 0) {
    const c = s.jsonLdRaw.join(' ').toLowerCase()
    if (c.includes('organization') || c.includes('website') || c.includes('person')) schema += 25
    if (c.includes('product') || c.includes('article'))       schema += 25
    if (c.includes('sameas'))                                 schema += 20
  }

  // E-E-A-T — 단어 수 절대 임계값 제거, 연속 스케일로 변경 (Block 4)
  let eeat = 0
  const schemaContent = s.jsonLdRaw.join(' ').toLowerCase()
  if (schemaContent.includes('person') || schemaContent.includes('organization')) eeat += 30
  if (schemaContent.includes('sameas'))                       eeat += 20
  if (s.externalLinks > 0)                                    eeat += 20
  if (s.wordCount > 300)                                      eeat += 15
  if (s.ogTitle && s.ogDescription)                           eeat += 10
  if (s.imagesWithAlt > 0)                                    eeat += 5

  // GEO — 단어 수/H2 절대 임계값 제거 (Block 3/4)
  let geo = 0
  if (s.wordCount > 200)                                      geo += 20
  if (s.h1s.length === 1 && s.h2s.length > 0)                  geo += 25
  if (s.externalLinks > 0)                                    geo += 25
  if (s.hasSchema)                                            geo += 15
  if (schemaContent.includes('sameas'))                       geo += 15

  const bingState = pageBotAccess(s, 'bingbot')
  let bing = 0
  if (bingState !== 'explicitly_blocked' && bingState !== 'unknown') bing += 35
  if (s.hasSitemap)                                            bing += 30
  if (!s.metaRobots.toLowerCase().includes('noindex'))         bing += 20
  if (s.canonical)                                             bing += 15

  const yetiState = pageBotAccess(s, 'yeti')
  let naver = 0
  if (yetiState !== 'explicitly_blocked' && yetiState !== 'unknown') naver += 30
  if (!s.metaRobots.toLowerCase().includes('noindex'))         naver += 20
  if (s.title)                                                 naver += 15
  if (s.metaDescription)                                       naver += 15
  if (s.hasSitemap)                                            naver += 10
  if (s.canonical)                                             naver += 10

  // v1.0-r3: 독립 증거 축. 확인된 신호만 가산하며 외부 계정 데이터는 포함하지 않는다.
  const eligibilityChecks = calcSearchEligibility(s).checks
  const knownEligibility = eligibilityChecks.filter(check => check.status !== 'unknown')
  const searchEligibilityScore = knownEligibility.length
    ? Math.round(knownEligibility.reduce((sum, check) => sum + (check.status === 'pass' ? 100 : check.status === 'warning' ? 50 : 0), 0) / knownEligibility.length)
    : 0
  const technicalStructure = Math.min(100,
    (s.statusCode === 200 ? 15 : 0) + (s.isHttps ? 10 : 0) + (!s.metaRobots.toLowerCase().includes('noindex') ? 15 : 0) +
    (s.canonical ? 10 : 0) + (s.h1s.length > 0 ? 10 : 0) + (s.hasViewport ? 8 : 0) +
    (s.title ? 8 : 0) + (s.metaDescription ? 6 : 0) + (s.internalLinks > 0 ? 5 : 0) +
    (s.hasSchema && s.schemaParseValid ? 8 : s.hasSchema ? 2 : 0) + (s.responseTime < 3000 ? 5 : s.responseTime < 6000 ? 2 : 0)
  )
  const questionHeadingCount = s.questionHeadingCount ?? 0
  const statisticCount = s.statisticCount ?? 0
  const schemaParseValid = s.schemaParseValid ?? true
  const hasAuthorSignal = s.hasAuthorSignal ?? false
  const hasDateSignal = s.hasDateSignal ?? false
  const contentExtractability = Math.min(100,
    (s.h1s.length > 0 ? 15 : 0) + (s.h2s.length > 0 ? 15 : 0) + (s.h3s.length > 0 ? 8 : 0) +
    Math.min(18, questionHeadingCount * 6) + (s.wordCount >= 400 ? 18 : s.wordCount >= 200 ? 12 : s.wordCount >= 80 ? 6 : 0) +
    (s.title && s.metaDescription ? 10 : 0) + (s.internalLinks >= 3 ? 8 : s.internalLinks > 0 ? 4 : 0) +
    (s.imageCount === 0 || s.imagesWithAlt / s.imageCount >= 0.8 ? 8 : 3)
  )
  const evidenceQuality = Math.min(100,
    Math.min(30, s.externalLinks * 10) + Math.min(25, statisticCount * 5) +
    (hasAuthorSignal ? 20 : 0) + (hasDateSignal ? 15 : 0) +
    (s.externalLinks > 0 && statisticCount > 0 ? 10 : 0)
  )
  const hasOrgSchema = schemaContent.includes('organization') || schemaContent.includes('person')
  const entityClarity = Math.min(100,
    (s.hasSchema && schemaParseValid ? 20 : 0) + (hasOrgSchema ? 25 : 0) +
    (schemaContent.includes('sameas') ? 25 : 0) + (s.canonical ? 10 : 0) +
    (s.ogTitle && s.ogDescription ? 10 : 0) + (s.ogImage ? 5 : 0) + (s.title ? 5 : 0)
  )
  const accessValue = (state: BotAccessState) => state === 'explicitly_blocked' ? 0 : state === 'unknown' ? 0 : 100
  const platformAccessibility = Math.round((accessValue(oaiState) + accessValue(bingState) + accessValue(yetiState)) / 3)
  const diagnosticScores = { searchEligibility: searchEligibilityScore, technicalStructure, contentExtractability, evidenceQuality, entityClarity, platformAccessibility }

  // SEO Foundation 점수 (Block 4 — Technical + 색인 가능성 중심)
  const eligibility = calcSearchEligibility(s)
  const rawSeoFoundation = Math.round(technicalStructure * 0.55 + searchEligibilityScore * 0.30 + contentExtractability * 0.15)
  const seoFoundation = eligibility.status === 'fail' ? Math.min(25, rawSeoFoundation) : rawSeoFoundation

  // AI Citation Readiness (Block 3 — 정적 분석 기반)
  const aiCitationReadiness = Math.round(platformAccessibility * 0.25 + contentExtractability * 0.30 + evidenceQuality * 0.25 + entityClarity * 0.20)

  // 검색 자격 게이트 (Block 4)
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
    naverScore:                Math.min(100, naver),
    // v3 신규 필드
    seoFoundationScore:        seoFoundation,
    aiCitationReadinessScore:  aiCitationReadiness,
    searchEligibility:         eligibility,
    measurementConfidence:     confidence,
    schemaEvaluationLevel:     schemaLevel,
    scoreModelVersion:         'v1.0-r3',
    diagnosticScores,
  }
}

export function calcReadinessIndex(scores: CategoryScores, siteHealthScore?: number): number {
  const dimensions = [
    { value: scores.seoFoundationScore, weight: 0.55 },
    { value: scores.aiCitationReadinessScore, weight: 0.25 },
    { value: scores.naverScore, weight: 0.10 },
  ]
  if (typeof siteHealthScore === 'number') dimensions.push({ value: siteHealthScore, weight: 0.10 })
  const weightTotal = dimensions.reduce((sum, item) => sum + item.weight, 0)
  const index = Math.round(dimensions.reduce((sum, item) => sum + item.value * item.weight, 0) / weightTotal)
  return scores.searchEligibility.status === 'fail' ? Math.min(25, index) : index
}

// ─── 규칙 기반 분석 결과 생성 (API 키 불필요) ───────────────────────────────

export function generateRuleBasedResult(signals: PageSignals, scores: CategoryScores): Record<string, unknown> {
  const overall = calcReadinessIndex(scores)
  const domain = signals.url.replace(/^https?:\/\//, '').split('/')[0]
  const criteria: CriteriaItem[] = []

  // ── Technical ──────────────────────────────────────────────────────────────
  {
    const tLen = signals.title.length
    const tExists = tLen > 0
    const tExtreme = tLen > 120 || (tLen > 0 && tLen < 5)
    const titleSnippet = tLen === 0
      ? `<!-- HTML <head> 안에 추가 -->\n<title>핵심 키워드 | ${domain}</title>`
      : tExtreme
      ? `<!-- 고정 글자 수가 아니라 의미와 반복 표현을 검토하세요 -->\n<title>페이지의 핵심 주제 | 브랜드명</title>`
      : null
    criteria.push({
      id: 'tech_title', name: 'Title 태그 최적화', category: 'technical',
      score: !tExists ? 10 : tExtreme ? 70 : 90,
      status: !tExists ? 'fail' : tExtreme ? 'warning' : 'pass',
      weight: '높음',
      scoringBasis: `실측: Title="${signals.title.slice(0, 60)}${signals.title.length > 60 ? '...' : ''}" (${tLen}자). Google은 고정 글자 수가 아니라 페이지별 고유성·명확성·간결성을 권장하며 기기 폭에 따라 표시를 자릅니다.`,
      evaluationCriteria: 'Google 공식 기준: 페이지마다 고유하고 명확하며 간결한 Title을 제공하고 반복·키워드 나열을 피함',
      currentState: tLen === 0 ? 'Title 태그 없음' : `${tLen}자 · 존재 확인 (고유성은 사이트 전체 진단에서 별도 검사)`,
      improvement: tLen === 0
        ? '① HTML <head> 태그 안에 페이지 내용을 정확히 설명하는 <title> 추가\n② 페이지마다 고유하게 작성\n③ 저장 후 Search Console에서 재수집 확인'
        : tExtreme
        ? '페이지 주제와 브랜드를 유지하면서 반복·불필요한 문구를 제거하고 실제 검색결과 표시를 확인하세요.'
        : '존재 기준 충족. 사이트 전체 중복 여부와 검색 의도 일치 여부를 함께 확인하세요.',
      priority: tLen === 0 ? 'critical' : tExtreme ? 'medium' : 'low',
      estimatedScoreGain: tLen === 0 ? 15 : tExtreme ? 3 : 0,
      referenceGuide: 'Google Search Essentials: https://developers.google.com/search/docs/essentials',
      codeSnippet: titleSnippet ?? undefined,
      codeType: 'html' as const,
    })
  }
  {
    const mLen = signals.metaDescription.length
    const mExists = mLen > 0
    const mExtreme = mLen > 320
    criteria.push({
      id: 'tech_meta', name: 'Meta Description', category: 'technical',
      score: !mExists ? 20 : mExtreme ? 70 : 90,
      status: !mExists ? 'warning' : mExtreme ? 'warning' : 'pass',
      weight: '높음',
      scoringBasis: `실측: Meta Description ${mLen}자. Google은 고정 글자 수를 규정하지 않으며, 검색어에 따라 본문 또는 설명 태그에서 스니펫을 자동 생성할 수 있습니다.`,
      evaluationCriteria: 'Google 공식 기준: 페이지 내용을 정확하고 고유하게 요약하는 설명 제공. 고정 글자 수는 공식 점수 기준이 아님',
      currentState: mLen === 0 ? 'Meta Description 없음' : `${mLen}자`,
      improvement: mLen === 0
        ? 'HTML <head>에 페이지 내용을 정확하고 고유하게 요약하는 meta description을 추가하세요.'
        : mExtreme
        ? '반복 문구를 제거하고 검색 사용자가 페이지 내용을 판단할 수 있는 핵심 정보만 남기세요.'
        : '존재 기준 충족. 사이트 전체 중복 여부와 실제 검색결과 스니펫을 확인하세요.',
      priority: mLen === 0 ? 'high' : mExtreme ? 'medium' : 'low',
      estimatedScoreGain: mLen === 0 ? 8 : mExtreme ? 3 : 0,
      referenceGuide: 'Google Search Essentials: https://developers.google.com/search/docs/essentials',
      codeSnippet: !mExists ? `<!-- HTML <head> 안에 추가 -->\n<meta name="description" content="${domain} 페이지의 대상, 핵심 제공 가치와 차별점을 정확하게 요약">` : undefined,
      codeType: 'html' as const,
    })
  }
  {
    const h1c = signals.h1s.length
    criteria.push({
      id: 'tech_h1', name: 'H1 태그 구조', category: 'technical',
      score: h1c > 0 ? 90 : 40,
      status: h1c > 0 ? 'pass' : 'warning',
      weight: '높음',
      scoringBasis: `실측: H1 ${h1c}개 발견. Google은 H1 개수를 고정 규칙으로 두지 않으며, 사용자와 검색엔진이 주 제목을 분명히 식별할 수 있는지가 핵심입니다.`,
      evaluationCriteria: 'Google 공식 취지: 시각적 주 제목과 heading 구조가 페이지의 핵심 주제를 명확하게 전달해야 함',
      currentState: h1c === 0 ? 'H1 없음' : h1c === 1 ? `H1: "${signals.h1s[0]?.slice(0, 40)}"` : `H1 ${h1c}개 · 의미 구조 수동 검토 필요`,
      improvement: h1c === 0
        ? '페이지의 시각적 주 제목을 의미에 맞는 H1으로 표시하고 하위 주제를 H2·H3로 구성하세요.'
        : '주 제목이 명확한지, 여러 H1이 서로 다른 최상위 섹션을 의미하는지 사람이 검토하세요.',
      priority: h1c === 0 ? 'medium' : 'low',
      estimatedScoreGain: h1c === 0 ? 5 : 0,
      referenceGuide: 'Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
      codeSnippet: h1c === 0 ? `<!-- 실제 화면의 주 제목에 적용 -->\n<h1>페이지의 핵심 주제를 정확히 설명하는 제목</h1>\n<h2>첫 번째 하위 주제</h2>` : undefined,
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
    const oaiState = pageBotAccess(signals, 'oai-searchbot')
    const gptState = pageBotAccess(signals, 'gptbot')
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
    const hasDepth = scores.diagnosticScores.contentExtractability >= 60
    const hasRichContent = scores.diagnosticScores.contentExtractability >= 80
    const contentScore = scores.diagnosticScores.contentExtractability
    criteria.push({
      id: 'chatgpt_content', name: '콘텐츠 깊이 및 구조', category: 'chatgpt',
      score: contentScore,
      status: hasDepth ? 'pass' : 'warning',
      weight: '높음',
      scoringBasis: `실측: ${signals.wordCount}단어, H2 ${signals.h2s.length}개, H3 ${signals.h3s.length}개. 콘텐츠 깊이는 절대 단어 수가 아닌 페이지 목적에 맞는 완결성으로 평가합니다.`,
      evaluationCriteria: 'AI 인용 가능성: 페이지가 대상 질문에 직접적이고 완전하게 답할 수 있는지, 구체적 수치·사례·출처 인용이 있는지 평가 (연구 근거: arXiv:2311.09735)',
      currentState: `${signals.wordCount}단어 | 질문형 제목 ${signals.questionHeadingCount}개 | H2 ${signals.h2s.length}개`,
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
    const hasGoodStructure = signals.h2s.length >= 2 && signals.questionHeadingCount > 0
    const structureScore = scores.diagnosticScores.contentExtractability
    criteria.push({
      id: 'geo_structure', name: '콘텐츠 계층 구조 (GEO)', category: 'geo',
      score: structureScore,
      status: hasGoodStructure ? 'pass' : hasAnyStructure ? 'warning' : 'warning',
      weight: '높음',
      scoringBasis: `실측: H2 ${signals.h2s.length}개, H3 ${signals.h3s.length}개, 질문형 제목 ${signals.questionHeadingCount}개. 제목 수가 아니라 질문과 직접 답변의 추출 가능성을 평가합니다.`,
      evaluationCriteria: 'GEO 콘텐츠 구조: 질문 또는 명확한 주제 제목 아래에 독립적으로 이해 가능한 직접 답변과 보충 근거를 배치.',
      currentState: `질문형 제목 ${signals.questionHeadingCount}개 | H2 ${signals.h2s.length}개 | H3 ${signals.h3s.length}개`,
      improvement: hasGoodStructure
        ? '구조 양호. 각 질문형 제목 바로 아래 2~3문장 직접 답변과 근거를 유지하세요.'
        : hasAnyStructure
        ? '기본 구조 존재. 주요 주제를 추가 H2로 구분하면 AI 인용 구조 개선됨'
        : '① 실제 고객 질문을 H2로 작성\n② 제목 바로 아래 첫 문단에서 결론부터 답변\n③ 다음 문단에 수치·사례·출처를 연결',
      priority: hasGoodStructure ? 'low' : hasAnyStructure ? 'medium' : 'high',
      estimatedScoreGain: hasGoodStructure ? 3 : hasAnyStructure ? 10 : 18,
      referenceGuide: 'GEO arXiv:2311.09735: https://arxiv.org/abs/2311.09735',
      codeSnippet: !hasGoodStructure
        ? `<!-- Answer-First 콘텐츠 구조 -->\n<h2>이 서비스는 어떤 문제를 해결하나요?</h2>\n<p><strong>핵심 답변:</strong> 대상 고객의 문제와 해결 결과를 2~3문장으로 먼저 설명합니다.</p>\n<p>구체적인 수치, 적용 사례와 검증 가능한 출처를 이어서 제시합니다.</p>`
        : undefined,
      codeType: 'html' as const,
    })
  }
  {
    const extOk = signals.externalLinks > 0 && signals.statisticCount > 0
    criteria.push({
      id: 'geo_citation', name: '외부 출처 인용 (권위성)', category: 'geo',
      score: scores.diagnosticScores.evidenceQuality,
      status: extOk ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `실측: 외부 링크 ${signals.externalLinks}개, 수치 표현 ${signals.statisticCount}개, 저자 신호 ${signals.hasAuthorSignal ? '있음' : '없음'}, 날짜 신호 ${signals.hasDateSignal ? '있음' : '없음'}.`,
      evaluationCriteria: 'GEO: 권위있는 외부 출처 인용, 통계/연구 근거 제시',
      currentState: `출처 링크 ${signals.externalLinks}개 | 수치 근거 ${signals.statisticCount}개`,
      improvement: extOk
        ? '양호. 정부/학술/언론 출처 인용 강화 권장'
        : '① 관련 업계 통계, 연구 논문, 공식 가이드라인 링크 추가\n② 예: "출처: 한국인터넷진흥원(KISA) 2024 보고서"\n③ 외부 링크는 새 탭으로 열기 (target="_blank")',
      priority: extOk ? 'low' : 'medium',
      estimatedScoreGain: extOk ? 2 : 12,
      referenceGuide: 'GEO arXiv:2311.09735: https://arxiv.org/abs/2311.09735',
      codeSnippet: !extOk
        ? `<!-- 검증한 원문에서 수치와 출처를 직접 입력하세요 -->\n<p><strong>[검증된 핵심 수치]</strong>를 바탕으로 [의미와 적용 범위]를 설명합니다.\n  (<a href="[원문 URL]" target="_blank" rel="noopener noreferrer">출처: [기관명·문서명·발행일]</a>)\n</p>`
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
    const hasHomepageType = schemaContent.includes('organization') || schemaContent.includes('website')
    const schemaValid = signals.hasSchema && signals.schemaParseValid
    criteria.push({
      id: 'schema_jsonld', name: 'JSON-LD 구조화 데이터', category: 'schema',
      score: !signals.hasSchema ? 20 : !schemaValid ? 25 : hasHomepageType ? 90 : 70,
      status: !signals.hasSchema ? 'warning' : !schemaValid ? 'fail' : 'pass',
      weight: '높음',
      scoringBasis: `실측: JSON-LD ${signals.jsonLdRaw.length}개 · JSON 파싱 ${schemaValid ? '성공' : signals.hasSchema ? '오류' : '해당 없음'} · 홈페이지 유형 ${hasHomepageType ? '확인' : '미확인'}.`,
      evaluationCriteria: 'Google·네이버 공식 취지: 화면의 실제 콘텐츠와 일치하는 유효한 구조화 데이터 및 페이지에 적합한 유형 사용',
      currentState: signals.hasSchema ? `JSON-LD ${signals.jsonLdRaw.length}개` : '구조화 데이터 없음',
      improvement: !signals.hasSchema
        ? '① HTML <head> 끝부분에 JSON-LD 스크립트 추가\n② 오른쪽 코드를 복사해서 붙여넣기\n③ "name", "url" 부분을 실제 정보로 수정\n④ Google Rich Results Test(search.google.com/test/rich-results)에서 검증'
        : !schemaValid
        ? 'JSON 문법 오류를 먼저 수정한 뒤 Schema Markup Validator와 검색엔진 테스트 도구로 재검증하세요.'
        : '구조화 데이터가 화면 내용과 일치하는지, 홈페이지에는 Organization·WebSite 유형이 적합한지 검토하세요.',
      priority: !signals.hasSchema || !schemaValid ? 'high' : 'low',
      estimatedScoreGain: !signals.hasSchema ? 15 : !schemaValid ? 12 : 0,
      referenceGuide: 'Schema.org: https://schema.org/ | Google Rich Results: https://search.google.com/test/rich-results',
      codeSnippet: !signals.hasSchema
        ? `<!-- 실제 정보로 바꾸고 검증 후 적용 -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "${signals.title || domain}",\n  "url": "https://${domain}",\n  "logo": "https://${domain}/logo.png",\n  "description": "화면에 표시되는 실제 회사 설명",\n  "sameAs": ["https://www.linkedin.com/company/실제-공식-계정"]\n}\n</script>`
        : undefined,
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
      scoringBasis: `실측: sameAs 속성 ${hasSameAs ? '있음' : '없음'}. URL의 소유권과 동일 조직 여부는 자동 확정하지 않습니다.`,
      evaluationCriteria: 'Schema.org Organization: 동일 조직임을 확인할 수 있는 실제 공식 프로필만 sameAs로 연결',
      currentState: `SameAs: ${hasSameAs ? '있음 ✅' : '없음'}`,
      improvement: hasSameAs
        ? '각 URL이 실제로 같은 조직의 공식 프로필인지 수동 검증하세요.'
        : '① 실제 소유한 공식 프로필만 추가\n② 존재하지 않거나 관계없는 프로필은 입력하지 않음\n③ Schema Validator로 문법 검증',
      priority: hasSameAs ? 'low' : 'high',
      estimatedScoreGain: hasSameAs ? 0 : 20,
      referenceGuide: 'Schema.org sameAs: https://schema.org/sameAs',
      codeSnippet: !hasSameAs
        ? `<!-- 실제 소유한 공식 URL만 입력 -->\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "${signals.title || domain}",\n  "url": "https://${domain}",\n  "sameAs": [\n    "https://www.linkedin.com/company/실제-공식-계정",\n    "https://www.youtube.com/@실제-공식-채널"\n  ]\n}`
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
    const bingState = pageBotAccess(signals, 'bingbot')
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

  // ── Naver Search readiness ────────────────────────────────────────────────
  {
    const yetiState = pageBotAccess(signals, 'yeti')
    const yetiOk = yetiState !== 'explicitly_blocked' && yetiState !== 'unknown'
    criteria.push({
      id: 'naver_yeti', name: '네이버 Yeti 수집 접근', category: 'naver',
      score: yetiOk ? 100 : 0,
      status: yetiOk ? 'pass' : 'fail',
      weight: '높음',
      scoringBasis: `robots.txt 규칙 해석 결과 Yeti는 ${yetiState === 'explicitly_blocked' ? '전체 차단' : yetiState === 'unknown' ? '확인 불가' : '수집 가능'} 상태입니다.`,
      evaluationCriteria: '네이버 검색로봇 Yeti가 루트와 공개 콘텐츠에 접근할 수 있어야 합니다.',
      currentState: `Yeti 접근: ${yetiOk ? '가능' : '차단 또는 확인 불가'}`,
      improvement: yetiOk ? '현재 수집 접근 상태를 유지하세요.' : 'robots.txt에서 Yeti 또는 User-agent: *의 전체 차단 규칙을 제거하고 공개 경로를 허용하세요.',
      priority: yetiOk ? 'low' : 'critical',
      estimatedScoreGain: 0,
      referenceGuide: 'Naver Search Advisor: https://searchadvisor.naver.com/guide/seo-basic-create',
      codeSnippet: yetiOk ? undefined : 'User-agent: Yeti\nAllow: /',
      codeType: 'robots',
    })
  }
  {
    const titleOk = signals.title.length > 0
    const descOk = signals.metaDescription.length > 0
    const metaOk = titleOk && descOk
    criteria.push({
      id: 'naver_meta', name: '네이버 Title·Description 준비', category: 'naver',
      score: (titleOk ? 50 : 0) + (descOk ? 50 : 0),
      status: metaOk ? 'pass' : signals.title && signals.metaDescription ? 'warning' : 'fail',
      weight: '중간',
      scoringBasis: `Title ${signals.title.length}자, Description ${signals.metaDescription.length}자입니다. 존재 여부만 점수화하고 길이는 표시 참고값으로 제공합니다.`,
      evaluationCriteria: '네이버 공식 취지: 페이지 주제를 정확히 설명하는 고유한 제목과 설명 제공',
      currentState: `Title ${titleOk ? '있음' : '없음'} · Description ${descOk ? '있음' : '없음'}`,
      improvement: '누락된 태그를 추가하고 페이지마다 실제 내용을 정확하게 설명하는 고유 문구를 작성하세요. 글자 수만 맞추기 위한 문장 확장은 피하세요.',
      priority: metaOk ? 'low' : 'medium',
      estimatedScoreGain: 0,
      referenceGuide: 'Naver Search Advisor: https://searchadvisor.naver.com/guide/diagnose-site',
    })
  }
  {
    criteria.push({
      id: 'naver_feed', name: '네이버 Sitemap·RSS 제출 준비', category: 'naver',
      score: signals.hasSitemap ? 100 : 0,
      status: signals.hasSitemap ? 'pass' : 'warning',
      weight: '중간',
      scoringBasis: `robots.txt에서 Sitemap 선언 ${signals.hasSitemap ? '확인' : '미확인'}. 서치어드바이저 실제 제출 여부는 HTML 분석만으로 확인할 수 없습니다.`,
      evaluationCriteria: '네이버는 Sitemap 또는 RSS를 콘텐츠 발견을 위한 피드로 안내합니다.',
      currentState: signals.hasSitemap ? 'Sitemap 발견 · 실제 제출 여부 확인 필요' : 'Sitemap 미발견',
      improvement: signals.hasSitemap ? '네이버 서치어드바이저에서 Sitemap 제출과 실제 수집·색인 상태를 확인하세요.' : 'Sitemap을 생성해 robots.txt에 선언하고 네이버 서치어드바이저에 제출하세요.',
      priority: signals.hasSitemap ? 'low' : 'medium',
      estimatedScoreGain: 0,
      referenceGuide: 'Naver Search Advisor: https://searchadvisor.naver.com/guide/request-feed',
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
    .filter(c => c.status !== 'pass')
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]))
    .slice(0, 4)
    .map(c => `${c.priority === 'critical' || c.priority === 'high' ? '영향도 높음' : '영향도 중간'}: ${c.improvement.slice(0, 80)}`)

  const strengthSummary = passItems.slice(0, 4).map(c => `${c.name}: ${c.currentState}`)

  const summary = `${domain}의 SEOGEO 자체 준비도 지수는 ${overall}점입니다. ` +
    (failItems.length > 0 ? `${failItems.map(c => c.name).join(', ')} 등 ${failItems.length}개 항목이 즉시 개선 필요합니다. ` : '') +
    (warnItems.length > 0 ? `${warnItems.length}개 항목은 개선 여지가 있으며 ` : '') +
    `${passItems.length}개 항목은 현재 기준을 충족합니다.`

  const ruleResults = criteria.map(c => ({
    ruleId: c.id,
    ruleVersion: 'v1.0-r3',
    title: c.name,
    category: c.category,
    status: (c.status === 'pass' ? 'pass' : c.status === 'fail' ? 'fail' : 'warning') as 'pass' | 'warning' | 'fail' | 'unknown' | 'not_applicable',
    severity: (c.priority === 'critical' ? 'critical' : c.priority === 'high' ? 'high' : c.priority === 'medium' ? 'medium' : 'low') as 'critical' | 'high' | 'medium' | 'low',
    applicable: true,
    observedValue: c.currentState,
    rawEvidence: c.scoringBasis,
    evidenceType: (c.category === 'geo' ? 'research_evidence'
      : c.category === 'analytics' ? 'product_heuristic'
      : c.category === 'technical' && c.id.includes('https') ? 'web_standard'
      : 'official_recommendation') as 'official_recommendation' | 'web_standard' | 'research_evidence' | 'product_heuristic',
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
    naverScore: scores.naverScore,
    seoFoundationScore: scores.seoFoundationScore,
    aiCitationReadinessScore: scores.aiCitationReadinessScore,
    searchEligibility: scores.searchEligibility,
    measurementConfidence: scores.measurementConfidence,
    schemaEvaluationLevel: scores.schemaEvaluationLevel,
    scoreModelVersion: scores.scoreModelVersion,
    diagnosticScores: scores.diagnosticScores,
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

  const [signals, siteCrawl] = await Promise.all([
    fetchPageSignals(targetUrl, emit),
    crawlSite(targetUrl),
  ])

  emit?.({
    type: 'step',
    msg: `사이트 크롤링 완료 — ${siteCrawl.scannedPages}페이지, Health ${siteCrawl.healthScore}점`,
    level: siteCrawl.errorCount > 0 ? 'warn' : 'success',
    ts: now(),
  })

  emit?.({ type: 'signals', data: signals, ts: now() })

  const scores = calcCategoryScore(signals)
  const overall = calcReadinessIndex(scores, siteCrawl.healthScore)

  emit?.({
    type: 'step',
    msg: `🧮 v1.0-r3 증거 기반 계산 완료 — 자체 지수: ${overall}점 | 구조: ${scores.diagnosticScores.technicalStructure} | 콘텐츠: ${scores.diagnosticScores.contentExtractability} | 근거: ${scores.diagnosticScores.evidenceQuality} | 엔티티: ${scores.diagnosticScores.entityClarity}`,
    level: 'success',
    ts: now(),
  })

  // Gemini 키 없으면 규칙 기반으로 즉시 반환
  if (!geminiKey) {
    emit?.({ type: 'step', msg: `📋 규칙 기반 SEO+AEO 분석 완료 (Gemini 키 없음 — 실측 데이터 기반)`, level: 'success', ts: now() })
    const result = generateRuleBasedResult(signals, scores)
    result.overallScore = overall
    result.siteCrawl = siteCrawl
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
E-E-A-T: ${scores.eeatScore} | Schema: ${scores.schemaScore} | Bing: ${scores.bingScore} | Naver: ${scores.naverScore} | 자체 준비도: ${overall}`

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
  "naverScore": ${scores.naverScore},
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

criteria는 실제 측정 근거가 있는 항목만 작성하며, 확인 불가 항목을 임의로 통과 또는 감점 처리하지 말 것.
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
    result.overallScore = overall
    result.siteCrawl = siteCrawl
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

  // 점수·판정·수정 코드는 항상 결정론적 규칙 엔진을 정본으로 사용합니다.
  // AI 문장은 검증된 규칙 결과를 대체하지 않으며, 향후 별도 콘텐츠 생성 기능에만 사용합니다.
  const canonical = generateRuleBasedResult(signals, scores)
  const aiSummary = typeof result.summary === 'string' ? result.summary : undefined
  result = { ...canonical, overallScore: overall, siteCrawl, aiSummary }

  const criteriaCount = Array.isArray(canonical.criteria) ? canonical.criteria.length : 0
  emit?.({
    type: 'step',
    msg: `✅ 실측 규칙 ${criteriaCount}개 판정 완료 — AI 응답은 참고 요약으로만 분리`,
    level: 'success',
    ts: now(),
  })

  return { result, signals }
}
