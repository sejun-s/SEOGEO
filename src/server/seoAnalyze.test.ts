import { describe, expect, it } from 'vitest'
import type { PageSignals } from '../types'
import { calcCategoryScore, calcReadinessIndex } from './seoAnalyze'

function signals(overrides: Partial<PageSignals> = {}): PageSignals {
  return {
    url: 'https://example.com/',
    statusCode: 200,
    responseTime: 500,
    isHttps: true,
    fetchError: '',
    title: '검증 가능한 고유 페이지 제목',
    metaDescription: '페이지의 핵심 내용을 정확하게 설명하는 고유한 설명문입니다.',
    canonical: 'https://example.com/',
    metaRobots: 'index,follow',
    hasViewport: true,
    h1s: ['페이지 제목'],
    h2s: ['주요 내용'],
    h3s: [],
    ogTitle: '페이지 제목',
    ogDescription: '페이지 설명',
    ogImage: '',
    twitterCard: '',
    hasHreflang: false,
    hasSitemap: true,
    hasSchema: false,
    jsonLdRaw: [],
    wordCount: 400,
    internalLinks: 5,
    externalLinks: 1,
    imageCount: 0,
    imagesWithAlt: 0,
    robotsTxt: 'User-agent: *\nAllow: /',
    hasGA4: false,
    ga4MeasurementId: '',
    hasGTM: false,
    gtmId: '',
    hasUALegacy: false,
    hasFbPixel: false,
    hasNaverAnalytics: false,
    ...overrides,
  } as PageSignals
}

describe('v0.6 scoring invariants', () => {
  it('does not award baseline E-E-A-T, GEO, or Schema points without observable signals', () => {
    const score = calcCategoryScore(signals({
      title: '', metaDescription: '', canonical: '', h1s: [], h2s: [],
      wordCount: 0, externalLinks: 0, hasSchema: false, jsonLdRaw: [],
      ogTitle: '', ogDescription: '', imageCount: 0, imagesWithAlt: 0,
    }))
    expect(score.eeatScore).toBe(0)
    expect(score.academicGeoScore).toBe(0)
    expect(score.schemaScore).toBe(0)
  })

  it('does not use GPTBot training policy as a ChatGPT Search scoring factor', () => {
    const allowed = calcCategoryScore(signals({ robotsTxt: 'User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /' }))
    const blocked = calcCategoryScore(signals({ robotsTxt: 'User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /' }))
    expect(blocked.chatGptSearchScore).toBe(allowed.chatGptSearchScore)
  })

  it('distinguishes a partial robots path rule from a full Yeti block', () => {
    const partial = calcCategoryScore(signals({ robotsTxt: 'User-agent: Yeti\nDisallow: /private/' }))
    const blocked = calcCategoryScore(signals({ robotsTxt: 'User-agent: Yeti\nDisallow: /' }))
    expect(partial.naverScore).toBeGreaterThan(blocked.naverScore)
  })

  it('caps the proprietary readiness index when search eligibility fails', () => {
    const score = calcCategoryScore(signals({ metaRobots: 'noindex,nofollow' }))
    expect(score.searchEligibility.status).toBe('fail')
    expect(calcReadinessIndex(score, 100)).toBeLessThanOrEqual(25)
  })
})
