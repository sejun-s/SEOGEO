import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { runAnalysis } from './src/server/seoAnalyze.ts'
import { analyzeSiteWithGemini } from './src/server/insightAnalyze.ts'
import { validateAndNormalizeUrl, checkRateLimit, maskApiKey } from './src/server/modules/security/urlSecurity.ts'
import { adminTelemetry } from './src/server/modules/admin/adminService.ts'
import { runGeoMonitor, calcCitationRates } from './src/server/geoMonitor.ts'
import { expandGeoQueries } from './src/server/geoQueryExpander.ts'
import type { GeoEngine, GeoQuery } from './src/types.ts'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'seo-analyzer-api',
      configureServer(server: ViteDevServer) {
        // OWASP Security Headers Middleware
        server.middlewares.use((_req, res, next) => {
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('X-Frame-Options', 'DENY')
          res.setHeader('X-XSS-Protection', '1; mode=block')
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
          next()
        })

        server.middlewares.use('/api/analyze', (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
          if (!checkRateLimit(clientIp, 30, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: '요청 한도 초과: 1분 후 다시 시도해 주세요.', code: 'RATE_LIMITED' }))
            return
          }

          const chunks: Buffer[] = []
          const startTime = Date.now()
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', async () => {
            res.writeHead(200, {
              'Content-Type': 'application/x-ndjson',
              'Cache-Control': 'no-cache',
              'Transfer-Encoding': 'chunked',
            })

            const emit = (event: object) => {
              try { res.write(JSON.stringify(event) + '\n') } catch { /* ignore */ }
            }

            try {
              const body = JSON.parse(Buffer.concat(chunks).toString()) as { url: string; apiKey?: string }

              // SSRF Security Check
              const secCheck = validateAndNormalizeUrl(body.url, process.env.NODE_ENV === 'development')
              if (!secCheck.safe) {
                emit({ type: 'error', code: secCheck.errorCode, msg: secCheck.errorMessage, ts: Date.now() })
                adminTelemetry.recordRun({
                  id: `run_${Date.now()}`,
                  url: body.url || 'invalid',
                  domain: 'unknown',
                  status: 'failed',
                  scoreModelVersion: 'v3.0',
                  durationMs: Date.now() - startTime,
                  failureCode: secCheck.errorCode,
                  requestedAt: new Date().toISOString(),
                })
                return
              }

              const targetUrl = secCheck.normalizedUrl!
              const geminiKey = body.apiKey || process.env.GEMINI_API_KEY || undefined

              const { result, signals } = await runAnalysis(targetUrl, geminiKey, emit)
              const domain = targetUrl.replace(/^https?:\/\//, '').split('/')[0]

              adminTelemetry.recordRun({
                id: `run_${Date.now()}`,
                url: targetUrl,
                domain,
                status: 'completed',
                scoreModelVersion: 'v3.0',
                durationMs: Date.now() - startTime,
                requestedAt: new Date().toISOString(),
                seoFoundationScore: (result as any).seoFoundationScore,
                maskedApiKey: maskApiKey(geminiKey),
              })

              emit({ type: 'result', data: result, signals, ts: Date.now() })
            } catch (err) {
              emit({ type: 'error', msg: String(err), ts: Date.now() })
            } finally {
              res.end()
            }
          })
        })

        // GEO 모니터링 API (Module C)
        server.middlewares.use('/api/geo-monitor', (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }
          const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
          if (!checkRateLimit(`geo:${clientIp}`, 5, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'GEO 측정 요청 한도 초과: 1분 후 다시 시도해 주세요.' }))
            return
          }
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', async () => {
            res.writeHead(200, {
              'Content-Type': 'application/x-ndjson',
              'Cache-Control': 'no-cache',
              'Transfer-Encoding': 'chunked',
            })
            const emit = (event: object) => {
              try { res.write(JSON.stringify(event) + '\n') } catch { /* ignore */ }
            }
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString()) as {
                targetDomain  : string
                targetBrand   : string
                brandSynonyms : string[]
                queries       : GeoQuery[]
                engines       : GeoEngine[]
                repeatCount   : number
              }

              const allowedEngines = new Set<GeoEngine>(['perplexity', 'chatgpt', 'claude', 'gemini', 'naver'])
              const engines = Array.from(new Set(body.engines ?? [])).filter(engine => allowedEngines.has(engine)).slice(0, 5)
              const queries = (body.queries ?? []).filter(query => typeof query?.text === 'string' && query.text.trim().length >= 2).slice(0, 30)
              const repeatCount = [1, 3, 5].includes(body.repeatCount) ? body.repeatCount : 1
              if (!body.targetDomain?.trim() || !body.targetBrand?.trim() || !queries.length || !engines.length) {
                emit({ type: 'error', msg: '도메인·브랜드·질의·엔진을 모두 입력해주세요.', ts: Date.now() })
                return
              }

              // API 키: 환경변수 우선
              const apiKeys: Partial<Record<GeoEngine, string>> = {
                perplexity : process.env.PPLX_API_KEY,
                chatgpt    : process.env.OPENAI_API_KEY,
                claude     : process.env.ANTHROPIC_API_KEY,
                gemini     : process.env.GEMINI_API_KEY,
                naver      : process.env.NAVER_CLOVA_API_KEY,   // P2-1
              }

              const aggregated = await runGeoMonitor({
                targetDomain  : body.targetDomain.trim().slice(0, 253),
                targetBrand   : body.targetBrand.trim().slice(0, 100),
                brandSynonyms : (body.brandSynonyms ?? []).slice(0, 10),
                queries,
                engines,
                repeatCount,
                apiKeys,
                emit,
              })

              const { rates, overall } = calcCitationRates(aggregated, engines)
              emit({ type: 'geo-result', aggregated, citationRates: rates, overallCitationRate: overall, ts: Date.now() })
            } catch (err) {
              emit({ type: 'error', msg: String(err), ts: Date.now() })
            } finally {
              res.end()
            }
          })
        })

        // P2-2: GEO 질의 자동 확장 API (LLM 기반)
        server.middlewares.use('/api/geo-expand-queries', (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
          if (!checkRateLimit(clientIp, 10, 60_000)) {
            res.writeHead(429, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: '요청 한도 초과: 1분 후 다시 시도해 주세요.' }))
            return
          }

          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString()) as {
                targetDomain : string
                targetBrand  : string
                brandSynonyms: string[]
                existingTexts: string[]
                count?       : number
              }

              const apiKey = process.env.ANTHROPIC_API_KEY
              if (!apiKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY가 서버에 설정되지 않았습니다.' }))
                return
              }

              const queries = await expandGeoQueries({
                targetDomain : body.targetDomain,
                targetBrand  : body.targetBrand,
                brandSynonyms: body.brandSynonyms ?? [],
                existingTexts: body.existingTexts ?? [],
                apiKey,
                count        : Math.min(body.count ?? 6, 12),
              })

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ queries }))
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: String(err) }))
            }
          })
        })

        // Admin Health API
        server.middlewares.use('/api/admin/system-health', (_req: IncomingMessage, res: ServerResponse) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(adminTelemetry.getHealthMetrics()))
        })

        // Admin Runs API
        server.middlewares.use('/api/admin/analysis-runs', (_req: IncomingMessage, res: ServerResponse) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(adminTelemetry.getRuns(50)))
        })

        server.middlewares.use('/api/insight', (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', async () => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString()) as {
                audit: import('./src/server/insightAnalyze.ts').SiteAuditInput
                persona?: string
                apiKey?: string
              }
              const geminiKey = body.apiKey || process.env.GEMINI_API_KEY || undefined
              if (!geminiKey) {
                res.end(JSON.stringify({ error: 'API key required' }))
                return
              }
              if (!body.audit) {
                res.end(JSON.stringify({ error: 'audit 데이터가 필요합니다' }))
                return
              }
              const persona = (body.persona as 'marketer' | 'executive' | 'operator') ?? 'marketer'
              const result = await analyzeSiteWithGemini(body.audit, geminiKey, persona)
              res.end(JSON.stringify(result))
            } catch (err) {
              res.end(JSON.stringify({ error: String(err) }))
            }
          })
        })
      },
    },
  ],
})
