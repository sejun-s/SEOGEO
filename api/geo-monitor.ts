/// <reference types="node" />
/**
 * GEO 모니터링 프로덕션 엔드포인트 (Module C)
 * 개발 서버(vite.config.ts)의 /api/geo-monitor 미들웨어와 동일한 NDJSON 스트림을 반환한다.
 */
import { runGeoMonitor, calcCitationRates } from '../src/server/geoMonitor.js'
import type { GeoEngine, GeoQuery } from '../src/types.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  res.writeHead(200, {
    'Content-Type'     : 'application/x-ndjson',
    'Cache-Control'    : 'no-cache',
    'Transfer-Encoding': 'chunked',
  })

  const emit = (event: object) => {
    try { res.write(JSON.stringify(event) + '\n') } catch { /* 연결 끊김 */ }
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})) as {
      targetDomain : string
      targetBrand  : string
      brandSynonyms: string[]
      queries      : GeoQuery[]
      engines      : GeoEngine[]
      repeatCount  : number
    }

    if (!body.queries?.length || !body.engines?.length) {
      emit({ type: 'error', msg: '질의와 엔진을 1개 이상 지정해주세요.', ts: Date.now() })
      res.end()
      return
    }

    const apiKeys: Partial<Record<GeoEngine, string>> = {
      perplexity: process.env.PPLX_API_KEY,
      chatgpt   : process.env.OPENAI_API_KEY,
      claude    : process.env.ANTHROPIC_API_KEY,
      gemini    : process.env.GEMINI_API_KEY,
      naver     : process.env.NAVER_CLOVA_API_KEY,
    }

    const aggregated = await runGeoMonitor({
      targetDomain : body.targetDomain,
      targetBrand  : body.targetBrand,
      brandSynonyms: body.brandSynonyms ?? [],
      queries      : body.queries,
      engines      : body.engines,
      repeatCount  : body.repeatCount ?? 1,
      apiKeys,
      emit,
    })

    const { rates, overall } = calcCitationRates(aggregated, body.engines)
    emit({
      type               : 'geo-result',
      aggregated,
      citationRates      : rates,
      overallCitationRate: overall,
      ts                 : Date.now(),
    })
  } catch (err) {
    console.error('[GEO API]', err)
    emit({ type: 'error', msg: String(err), ts: Date.now() })
  } finally {
    res.end()
  }
}
