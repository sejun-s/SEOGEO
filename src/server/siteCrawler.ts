import type { CrawlPageResult, CrawlScoreFactor, SiteCrawlIssue, SiteCrawlResult } from '../types.ts'

export interface SiteCrawlerOptions {
  maxPages?: number
  maxDepth?: number
  concurrency?: number
  requestTimeoutMs?: number
  totalTimeoutMs?: number
}

const SKIP_EXTENSIONS = /\.(?:avif|bmp|css|csv|docx?|eot|gif|gz|ico|jpe?g|js|json|map|mov|mp3|mp4|mpeg|pdf|png|pptx?|rar|rss|svg|tar|tiff?|txt|webm|webp|woff2?|xlsx?|xml|zip)$/i

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function textFromHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function extractFirst(html: string, pattern: RegExp): string {
  return textFromHtml(html.match(pattern)?.[1] ?? '')
}

export function normalizeUrl(value: string, base: URL): string | null {
  try {
    const url = new URL(decodeEntities(value), base)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin) return null
    if (SKIP_EXTENSIONS.test(url.pathname)) return null
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid|gclid|ref$)/i.test(key)) url.searchParams.delete(key)
    }
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return null
  }
}

interface RobotsRule {
  allow: boolean
  pattern: string
}

function patternMatches(path: string, pattern: string): boolean {
  if (!pattern) return false
  const endAnchored = pattern.endsWith('$')
  const source = pattern.replace(/\$$/, '').replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${source}${endAnchored ? '$' : ''}`).test(path)
}

export function createRobotsPolicy(robotsText: string, crawlerName = 'seogeo-crawler'): (url: string) => boolean {
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = []
  let current: { agents: string[]; rules: RobotsRule[] } | null = null

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
    } else if ((field === 'allow' || field === 'disallow') && current) {
      if (field === 'disallow' && !value) continue
      current.rules.push({ allow: field === 'allow', pattern: value })
    }
  }

  const normalizedCrawler = crawlerName.toLowerCase()
  const matchingGroups = groups.filter(group => group.agents.some(agent => agent === '*' || normalizedCrawler.startsWith(agent)))
  const specificLength = Math.max(0, ...matchingGroups.flatMap(group => group.agents.filter(agent => agent !== '*' && normalizedCrawler.startsWith(agent)).map(agent => agent.length)))
  const selectedGroups = specificLength > 0
    ? matchingGroups.filter(group => group.agents.some(agent => agent !== '*' && agent.length === specificLength && normalizedCrawler.startsWith(agent)))
    : matchingGroups.filter(group => group.agents.includes('*'))
  const rules = selectedGroups.flatMap(group => group.rules)

  return (urlValue: string) => {
    if (!rules.length) return true
    const url = new URL(urlValue)
    const path = `${url.pathname}${url.search}`
    const matches = rules.filter(rule => patternMatches(path, rule.pattern))
    if (!matches.length) return true
    matches.sort((a, b) => b.pattern.replace(/\$$/, '').length - a.pattern.replace(/\$$/, '').length || Number(b.allow) - Number(a.allow))
    return matches[0].allow
  }
}

function extractLinks(html: string, pageUrl: string, origin: URL): string[] {
  const links = new Set<string>()
  const pattern = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const normalized = normalizeUrl(match[1], new URL(pageUrl))
    if (normalized && new URL(normalized).origin === origin.origin) links.add(normalized)
  }
  return [...links]
}

async function fetchText(url: string, timeoutMs: number, maxChars: number): Promise<{ status: number; text: string; redirected: boolean }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SEOGEO-Crawler/0.2; +https://github.com/sejun-s/SEOGEO)',
      Accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.1',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  const contentType = response.headers.get('content-type') ?? ''
  if (!/(?:html|xml|text)/i.test(contentType)) return { status: response.status, text: '', redirected: response.redirected }
  return { status: response.status, text: (await response.text()).slice(0, maxChars), redirected: response.redirected }
}

async function discoverSitemapUrls(origin: URL, robotsText: string, options: Required<SiteCrawlerOptions>): Promise<string[]> {
  const sitemapCandidates = new Set<string>()
  for (const match of robotsText.matchAll(/^\s*sitemap:\s*(\S+)/gim)) {
    const normalized = normalizeUrl(match[1], origin)
    if (normalized) sitemapCandidates.add(normalized)
  }
  sitemapCandidates.add(new URL('/sitemap.xml', origin).toString())

  const pageUrls = new Set<string>()
  const visitedSitemaps = new Set<string>()
  const queue = [...sitemapCandidates]

  while (queue.length && visitedSitemaps.size < 10 && pageUrls.size < options.maxPages * 3) {
    const sitemapUrl = queue.shift()!
    if (visitedSitemaps.has(sitemapUrl)) continue
    visitedSitemaps.add(sitemapUrl)
    try {
      const { status, text } = await fetchText(sitemapUrl, options.requestTimeoutMs, 1_500_000)
      if (status < 200 || status >= 300 || !text) continue
      for (const match of text.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
        const normalized = normalizeUrl(textFromHtml(match[1]), origin)
        if (!normalized) continue
        if (/\.xml(?:\.gz)?(?:$|\?)/i.test(normalized)) queue.push(normalized)
        else pageUrls.add(normalized)
      }
    } catch {
      // A missing or blocked sitemap is not fatal; internal-link discovery continues.
    }
  }
  return [...pageUrls]
}

async function inspectPage(url: string, depth: number, origin: URL, timeoutMs: number): Promise<CrawlPageResult> {
  const startedAt = Date.now()
  try {
    const { status, text: html, redirected } = await fetchText(url, timeoutMs, 500_000)
    const title = extractFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    const metaDescription = extractFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)
      || extractFirst(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
      || ''
    const h1Count = (html.match(/<h1\b[^>]*>/gi) ?? []).length
    const bodyText = textFromHtml(html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, ''))
    const metaRobots = extractFirst(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)/i).toLowerCase()
    const links = extractLinks(html, url, origin)

    return {
      url,
      depth,
      statusCode: status,
      redirected,
      responseTime: Date.now() - startedAt,
      title,
      metaDescription,
      canonical,
      h1Count,
      wordCount: bodyText ? bodyText.split(/\s+/).length : 0,
      internalLinks: links,
      noindex: metaRobots.includes('noindex'),
      hasSchema: /<script[^>]+type=["']application\/ld\+json["']/i.test(html),
    }
  } catch (error) {
    return {
      url,
      depth,
      statusCode: 0,
      redirected: false,
      responseTime: Date.now() - startedAt,
      title: '',
      metaDescription: '',
      canonical: '',
      h1Count: 0,
      wordCount: 0,
      internalLinks: [],
      noindex: false,
      hasSchema: false,
      error: String(error),
    }
  }
}

const SCORE_RULES = new Map<string, { maxPenalty: number; verification: string }>([
  ['http_error', { maxPenalty: 35, verification: 'URL을 다시 요청해 2xx 응답인지 확인' }],
  ['missing_title', { maxPenalty: 20, verification: 'HTML <title>이 존재하고 페이지별로 고유한지 확인' }],
  ['duplicate_title', { maxPenalty: 15, verification: '영향 URL의 <title> 값을 서로 비교' }],
  ['redirect', { maxPenalty: 8, verification: '내부 링크가 리다이렉트 없이 최종 URL로 연결되는지 확인' }],
  ['missing_description', { maxPenalty: 8, verification: 'HTML meta[name="description"] 존재 여부 확인' }],
  ['duplicate_description', { maxPenalty: 5, verification: '영향 URL의 meta description 값을 서로 비교' }],
  ['invalid_h1', { maxPenalty: 5, verification: '렌더링된 페이지에 의미 있는 주 제목이 있는지 확인' }],
  ['missing_canonical', { maxPenalty: 6, verification: 'HTML link[rel="canonical"] 존재 여부 확인' }],
  ['slow_response', { maxPenalty: 5, verification: '동일 URL을 재측정하고 PageSpeed Insights로 교차 확인' }],
])

function buildIssues(pages: CrawlPageResult[]): SiteCrawlIssue[] {
  const issues: SiteCrawlIssue[] = []
  const addIssue = (id: string, severity: SiteCrawlIssue['severity'], title: string, affected: CrawlPageResult[], recommendation: string) => {
    if (!affected.length) return
    const rule = SCORE_RULES.get(id)
    const scoreImpact = rule ? Math.round(rule.maxPenalty * (affected.length / Math.max(1, pages.length)) * 10) / 10 : 0
    issues.push({
      id,
      severity,
      title,
      count: affected.length,
      urls: affected.slice(0, 10).map(page => page.url),
      recommendation,
      scoreImpact,
      verification: rule?.verification ?? '수정 후 사이트를 다시 분석해 상태를 확인',
    })
  }

  addIssue('http_error', 'error', '접근할 수 없는 페이지', pages.filter(page => page.statusCode === 0 || page.statusCode >= 400), '깨진 내부 링크와 서버 응답 상태를 확인하세요.')
  addIssue('redirect', 'warning', '리다이렉트를 거친 페이지', pages.filter(page => page.redirected), '내부 링크가 최종 URL을 직접 가리키도록 수정하세요.')
  addIssue('missing_title', 'error', 'Title이 없는 페이지', pages.filter(page => page.statusCode === 200 && !page.title), '페이지 목적을 설명하는 고유한 Title을 작성하세요.')
  addIssue('missing_description', 'warning', 'Meta Description이 없는 페이지', pages.filter(page => page.statusCode === 200 && !page.metaDescription), '검색 결과에서 클릭을 유도할 수 있는 설명을 작성하세요.')
  addIssue('invalid_h1', 'warning', 'H1 주 제목이 없는 페이지', pages.filter(page => page.statusCode === 200 && page.h1Count === 0), '페이지의 시각적 주 제목을 의미에 맞는 H1으로 표시하세요.')
  addIssue('missing_canonical', 'warning', 'Canonical이 없는 페이지', pages.filter(page => page.statusCode === 200 && !page.canonical), '각 페이지에 대표 URL을 가리키는 canonical 태그를 추가하세요.')
  addIssue('noindex', 'notice', 'noindex가 설정된 페이지', pages.filter(page => page.noindex), '의도적으로 검색에서 제외한 페이지인지 확인하세요.')
  addIssue('slow_response', 'warning', '응답이 3초 이상인 페이지', pages.filter(page => page.responseTime >= 3000), '서버 응답, 캐시, 이미지와 외부 스크립트를 점검하세요.')

  const titleGroups = new Map<string, CrawlPageResult[]>()
  for (const page of pages.filter(item => item.title)) {
    const key = page.title.trim().toLowerCase()
    titleGroups.set(key, [...(titleGroups.get(key) ?? []), page])
  }
  const duplicateTitlePages = [...titleGroups.values()].filter(group => group.length > 1).flat()
  addIssue('duplicate_title', 'error', 'Title이 중복된 페이지', duplicateTitlePages, '페이지마다 검색 의도에 맞는 고유한 Title을 사용하세요.')

  const descriptionGroups = new Map<string, CrawlPageResult[]>()
  for (const page of pages.filter(item => item.metaDescription)) {
    const key = page.metaDescription.trim().toLowerCase()
    descriptionGroups.set(key, [...(descriptionGroups.get(key) ?? []), page])
  }
  const duplicateDescriptions = [...descriptionGroups.values()].filter(group => group.length > 1).flat()
  addIssue('duplicate_description', 'warning', 'Meta Description이 중복된 페이지', duplicateDescriptions, '페이지마다 검색 의도와 내용을 반영한 고유한 설명을 작성하세요.')

  return issues.sort((a, b) => ({ error: 0, warning: 1, notice: 2 }[a.severity] - ({ error: 0, warning: 1, notice: 2 }[b.severity]) || b.count - a.count))
}

export function calculateHealthScore(pages: CrawlPageResult[], issues: SiteCrawlIssue[]): { score: number; factors: CrawlScoreFactor[] } {
  if (!pages.length) return { score: 0, factors: [] }
  const factors = issues.flatMap((issue): CrawlScoreFactor[] => {
    const rule = SCORE_RULES.get(issue.id)
    if (!rule) return []
    const affectedRatio = issue.count / pages.length
    return [{
      issueId: issue.id,
      label: issue.title,
      maxPenalty: rule.maxPenalty,
      appliedPenalty: Math.round(rule.maxPenalty * affectedRatio * 10) / 10,
      affectedPages: issue.count,
      affectedRatio: Math.round(affectedRatio * 1000) / 1000,
    }]
  })
  const totalPenalty = factors.reduce((sum, factor) => sum + factor.appliedPenalty, 0)
  return { score: Math.max(0, Math.round(100 - Math.min(100, totalPenalty))), factors }
}

export async function crawlSite(targetUrl: string, inputOptions: SiteCrawlerOptions = {}): Promise<SiteCrawlResult> {
  const options: Required<SiteCrawlerOptions> = {
    maxPages: Math.min(100, Math.max(1, inputOptions.maxPages ?? 50)),
    maxDepth: Math.min(5, Math.max(0, inputOptions.maxDepth ?? 3)),
    concurrency: Math.min(10, Math.max(1, inputOptions.concurrency ?? 6)),
    requestTimeoutMs: Math.min(15_000, Math.max(1_000, inputOptions.requestTimeoutMs ?? 8_000)),
    totalTimeoutMs: Math.min(60_000, Math.max(5_000, inputOptions.totalTimeoutMs ?? 25_000)),
  }
  const startedAt = Date.now()
  const deadline = startedAt + options.totalTimeoutMs
  const origin = new URL(targetUrl)
  const normalizedTarget = normalizeUrl(targetUrl, origin) ?? targetUrl

  let robotsText = ''
  try {
    robotsText = (await fetchText(new URL('/robots.txt', origin).toString(), options.requestTimeoutMs, 200_000)).text
  } catch {
    // Continue when robots.txt is missing or inaccessible.
  }

  const isAllowedByRobots = createRobotsPolicy(robotsText)

  const sitemapUrls = await discoverSitemapUrls(origin, robotsText, options)
  const queue: Array<{ url: string; depth: number }> = []
  let blockedByRobots = 0
  if (isAllowedByRobots(normalizedTarget)) queue.push({ url: normalizedTarget, depth: 0 })
  else blockedByRobots += 1
  for (const url of sitemapUrls) {
    if (isAllowedByRobots(url)) queue.push({ url, depth: 1 })
    else blockedByRobots += 1
  }

  const queued = new Set(queue.map(item => item.url))
  const visited = new Set<string>()
  const pages: CrawlPageResult[] = []

  while (queue.length && pages.length < options.maxPages && Date.now() < deadline) {
    const batch: Array<{ url: string; depth: number }> = []
    while (queue.length && batch.length < options.concurrency && pages.length + batch.length < options.maxPages) {
      const item = queue.shift()!
      if (visited.has(item.url)) continue
      if (item.depth > 0 && !isAllowedByRobots(item.url)) {
        blockedByRobots += 1
        continue
      }
      visited.add(item.url)
      batch.push(item)
    }
    if (!batch.length) break

    const results = await Promise.all(batch.map(item => inspectPage(item.url, item.depth, origin, Math.min(options.requestTimeoutMs, Math.max(1_000, deadline - Date.now())))))
    pages.push(...results)
    for (const page of results) {
      if (page.depth >= options.maxDepth) continue
      for (const link of page.internalLinks) {
        if (queued.has(link) || visited.has(link)) continue
        if (!isAllowedByRobots(link)) {
          blockedByRobots += 1
          queued.add(link)
          continue
        }
        queued.add(link)
        queue.push({ url: link, depth: page.depth + 1 })
      }
    }
  }

  const issues = buildIssues(pages)
  const duplicateTitles = new Set(
    [...pages.reduce((groups, page) => {
      if (!page.title) return groups
      const key = page.title.trim().toLowerCase()
      groups.set(key, [...(groups.get(key) ?? []), page.url])
      return groups
    }, new Map<string, string[]>()).values()].filter(urls => urls.length > 1).flat(),
  )
  const isHealthy = (page: CrawlPageResult) => page.statusCode >= 200
    && page.statusCode < 300
    && Boolean(page.title)
    && !duplicateTitles.has(page.url)
  const errorCount = pages.filter(page =>
    page.statusCode === 0 || page.statusCode >= 400 ||
    (page.statusCode === 200 && !page.title) || duplicateTitles.has(page.url),
  ).length
  const warningCount = pages.filter(page =>
    page.redirected ||
    (page.statusCode === 200 && (!page.metaDescription || page.h1Count === 0 || !page.canonical)) ||
    page.responseTime >= 3000,
  ).length
  const scoreResult = calculateHealthScore(pages, issues)

  return {
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    scannedPages: pages.length,
    discoveredUrls: queued.size,
    healthyPages: pages.filter(isHealthy).length,
    errorCount,
    warningCount,
    healthScore: scoreResult.score,
    scoreModelVersion: 'site-health-v0.3.0',
    scoreFactors: scoreResult.factors,
    truncated: queue.length > 0 || Date.now() >= deadline,
    blockedByRobots,
    limits: { maxPages: options.maxPages, maxDepth: options.maxDepth, concurrency: options.concurrency },
    pages: pages.map(page => ({ ...page, internalLinks: [] })),
    issues,
  }
}
