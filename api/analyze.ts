/// <reference types="node" />
import { runAnalysis } from '../src/server/seoAnalyze.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const { url, apiKey: requestKey } = body as { url: string; apiKey?: string }

    if (!url) { res.status(400).json({ error: 'url 파라미터가 필요합니다' }); return }

    const geminiKey = requestKey || process.env.GEMINI_API_KEY || undefined

    const steps: string[] = []
    const { result, signals } = await runAnalysis(url, geminiKey, (e) => {
      if (e.type === 'step' && e.msg) steps.push(e.msg)
    })

    res.status(200).json({ ...result, signals })
  } catch (err) {
    console.error('[SEO API]', err)
    res.status(500).json({ error: String(err) })
  }
}
