/// <reference types="node" />
import { analyzeSiteWithGemini } from '../src/server/insightAnalyze.js'
import type { SiteAuditInput, InsightPersona } from '../src/server/insightAnalyze.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const { audit, persona, apiKey } = body as {
      audit: SiteAuditInput
      persona?: InsightPersona
      apiKey?: string
    }

    if (!audit) { res.status(400).json({ error: 'audit 데이터가 필요합니다' }); return }

    const geminiKey = apiKey || process.env.GEMINI_API_KEY || undefined
    if (!geminiKey) { res.status(400).json({ error: 'API key required' }); return }

    const result = await analyzeSiteWithGemini(audit, geminiKey, persona ?? 'marketer')
    res.status(200).json(result)
  } catch (err) {
    console.error('[Insight API]', err)
    res.status(500).json({ error: String(err) })
  }
}
