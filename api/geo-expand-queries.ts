/// <reference types="node" />
/**
 * GEO 질의 자동 확장 프로덕션 엔드포인트 (P2-2)
 * 개발 서버(vite.config.ts)의 /api/geo-expand-queries 미들웨어와 동일한 JSON을 반환한다.
 */
import { expandGeoQueries } from '../src/server/geoQueryExpander.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})) as {
      targetDomain : string
      targetBrand  : string
      brandSynonyms: string[]
      existingTexts: string[]
      count?       : number
    }

    if (!body.targetDomain || !body.targetBrand) {
      res.status(400).json({ error: '도메인과 브랜드명이 필요합니다.' })
      return
    }

    const provider = process.env.ANTHROPIC_API_KEY ? 'claude' : process.env.GEMINI_API_KEY ? 'gemini' : null
    const apiKey = provider === 'claude' ? process.env.ANTHROPIC_API_KEY : provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined
    if (!apiKey || !provider) {
      res.status(400).json({ error: '질문 생성에는 Gemini 또는 Claude API 키가 필요합니다.' })
      return
    }

    const queries = await expandGeoQueries({
      targetDomain : body.targetDomain,
      targetBrand  : body.targetBrand,
      brandSynonyms: body.brandSynonyms ?? [],
      existingTexts: body.existingTexts ?? [],
      apiKey,
      provider,
      count        : Math.min(body.count ?? 6, 12),
    })

    res.status(200).json({ queries })
  } catch (err) {
    console.error('[GEO Expand API]', err)
    res.status(500).json({ error: String(err) })
  }
}
