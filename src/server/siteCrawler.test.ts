import { describe, expect, it } from 'vitest'
import type { CrawlPageResult, SiteCrawlIssue } from '../types.ts'
import { calculateHealthScore, createRobotsPolicy, normalizeUrl } from './siteCrawler.ts'

const page = (url: string): CrawlPageResult => ({
  url,
  depth: 0,
  statusCode: 200,
  redirected: false,
  responseTime: 100,
  title: 'Page',
  metaDescription: 'Description',
  canonical: url,
  h1Count: 1,
  wordCount: 100,
  internalLinks: [],
  noindex: false,
  hasSchema: false,
})

describe('normalizeUrl', () => {
  const base = new URL('https://example.com/start')

  it('removes tracking parameters, fragments, and a trailing slash', () => {
    expect(normalizeUrl('/guide/?utm_source=test&id=3#intro', base)).toBe('https://example.com/guide?id=3')
  })

  it('rejects external and static asset URLs', () => {
    expect(normalizeUrl('https://other.example/page', base)).toBeNull()
    expect(normalizeUrl('/image.webp', base)).toBeNull()
  })
})

describe('createRobotsPolicy', () => {
  it('uses the longest matching allow/disallow rule', () => {
    const allowed = createRobotsPolicy('User-agent: *\nDisallow: /private\nAllow: /private/public')
    expect(allowed('https://example.com/private/data')).toBe(false)
    expect(allowed('https://example.com/private/public/page')).toBe(true)
  })

  it('prefers a matching named crawler group over the wildcard group', () => {
    const allowed = createRobotsPolicy('User-agent: *\nDisallow: /\n\nUser-agent: seogeo-crawler\nAllow: /\nDisallow: /draft$')
    expect(allowed('https://example.com/live')).toBe(true)
    expect(allowed('https://example.com/draft')).toBe(false)
    expect(allowed('https://example.com/draft/child')).toBe(true)
  })
})

describe('calculateHealthScore', () => {
  it('applies a proportional, inspectable penalty', () => {
    const pages = [page('https://example.com/a'), page('https://example.com/b')]
    const issues: SiteCrawlIssue[] = [{
      id: 'missing_title',
      severity: 'error',
      title: 'Missing title',
      count: 1,
      urls: [pages[0].url],
      recommendation: 'Add a title.',
      scoreImpact: 10,
      verification: 'Check the title.',
    }]

    const result = calculateHealthScore(pages, issues)
    expect(result.score).toBe(90)
    expect(result.factors).toEqual([expect.objectContaining({ issueId: 'missing_title', appliedPenalty: 10, affectedRatio: 0.5 })])
  })
})
