import type { CrawlPageResult, SiteCrawlIssue, SiteCrawlResult } from '../types.ts'

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

function normalizeUrl(value: string, base: URL): string | null {
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

function buildIssues(pages: CrawlPageResult[]): SiteCrawlIssue[] {
  const issues: SiteCrawlIssue[] = []
  const addIssue = (id: string, severity: SiteCrawlIssue['severity'], title: string, affected: CrawlPageResult[], recommendation: string) => {
    if (!affected.length) return
    issues.push({ id, severity, title, count: affected.length, urls: affected.slice(0, 10).map(page => page.url), recommendation })
  }

  addIssue('http_error', 'error', '접근할 수 없는 페이지', pages.filter(page => page.statusCode === 0 || page.statusCode >= 400), '깨진 내부 링크와 서버 응답 상태를 확인하세요.')
  addIssue('redirect', 'warning', '리다이렉트를 거친 페이지', pages.filter(page => page.redirected), '내부 링크가 최종 URL을 직접 가리키도록 수정하세요.')
  addIssue('missing_title', 'error', 'Title이 없는 페이지', pages.filter(page => page.statusCode === 200 && !page.title), '페이지 목적을 설명하는 고유한 Title을 작성하세요.')
  addIssue('missing_description', 'warning', 'Meta Description이 없는 페이지', pages.filter(page => page.statusCode === 200 && !page.metaDescription), '검색 결과에서 클릭을 유도할 수 있는 설명을 작성하세요.')
  addIssue('invalid_h1', 'warning', 'H1이 없거나 여러 개인 페이지', pages.filter(page => page.statusCode === 200 && page.h1Count !== 1), '페이지의 대표 제목을 H1 하나로 명확하게 표시하세요.')
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

  return issues.sort((a, b) => ({ error: 0, warning: 1, notice: 2 }[a.severity] - ({ error: 0, warning: 1, notice: 2 }[b.severity]) || b.count - a.count))
}

function calculateHealthScore(pages: CrawlPageResult[], issues: SiteCrawlIssue[]): number {
  if (!pages.length) return 0
  const penalties = new Map<string, number>([
    ['http_error', 35], ['missing_title', 20], ['duplicate_title', 15],
    ['redirect', 8], ['missing_description', 8], ['invalid_h1', 8],
    ['missing_canonical', 6], ['slow_response', 5],
  ])
  let totalPenalty = 0
  for (const issue of issues) totalPenalty += (penalties.get(issue.id) ?? 0) * (issue.count / pages.length)
  return Math.max(0, Math.round(100 - Math.min(100, totalPenalty)))
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

  const sitemapUrls = await discoverSitemapUrls(origin, robotsText, options)
  const queue: Array<{ url: string; depth: number }> = [{ url: normalizedTarget, depth: 0 }]
  for (const url of sitemapUrls) queue.push({ url, depth: 1 })

  const queued = new Set(queue.map(item => item.url))
  const visited = new Set<string>()
  const pages: CrawlPageResult[] = []

  while (queue.length && pages.length < options.maxPages && Date.now() < deadline) {
    const batch: Array<{ url: string; depth: number }> = []
    while (queue.length && batch.length < options.concurrency && pages.length + batch.length < options.maxPages) {
      const item = queue.shift()!
      if (visited.has(item.url)) continue
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
  const errorCount = issues.filter(issue => issue.severity === 'error').reduce((sum, issue) => sum + issue.count, 0)
  const warningCount = issues.filter(issue => issue.severity === 'warning').reduce((sum, issue) => sum + issue.count, 0)

  return {
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    scannedPages: pages.length,
    discoveredUrls: queued.size,
    healthyPages: pages.filter(isHealthy).length,
    errorCount,
    warningCount,
    healthScore: calculateHealthScore(pages, issues),
    truncated: queue.length > 0 || Date.now() >= deadline,
    limits: { maxPages: options.maxPages, maxDepth: options.maxDepth, concurrency: options.concurrency },
    pages: pages.map(page => ({ ...page, internalLinks: [] })),
    issues,
  }
}
