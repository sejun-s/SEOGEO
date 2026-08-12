import { describe, expect, it } from 'vitest'
import type { SiteCrawlIssue, SiteCrawlResult } from '../types.ts'
import { compareSiteCrawls } from './siteCrawlComparison.ts'

const issue = (id: string, count: number): SiteCrawlIssue => ({
  id,
  severity: 'warning',
  title: id,
  count,
  urls: [],
  recommendation: 'Fix it.',
  scoreImpact: count,
  verification: 'Scan again.',
})

const crawl = (healthScore: number, issues: SiteCrawlIssue[]): SiteCrawlResult => ({
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:00:01.000Z',
  durationMs: 1000,
  scannedPages: 2,
  discoveredUrls: 2,
  healthyPages: 1,
  errorCount: 0,
  warningCount: issues.length,
  healthScore,
  scoreModelVersion: 'site-health-v0.2.0',
  scoreFactors: [],
  truncated: false,
  blockedByRobots: 0,
  limits: { maxPages: 50, maxDepth: 3, concurrency: 6 },
  pages: [],
  issues,
})

describe('compareSiteCrawls', () => {
  it('reports score, resolved, new, improved, and regressed changes', () => {
    const previous = crawl(70, [issue('resolved', 1), issue('better', 3), issue('worse', 1)])
    const current = crawl(78, [issue('new', 1), issue('better', 1), issue('worse', 2)])

    expect(compareSiteCrawls(previous, current)).toEqual({
      previousHealthScore: 70,
      healthScoreDelta: 8,
      resolvedIssueIds: ['resolved'],
      newIssueIds: ['new'],
      improvedIssueIds: ['better'],
      regressedIssueIds: ['worse'],
    })
  })
})
