import type { InsightResult, InsightPersona, SiteAuditInput, SiteContext } from '../server/insightAnalyze'
import type { AuditResult } from '../types'

export type { InsightResult, InsightSection, InsightPersona, SiteContext } from '../server/insightAnalyze'

function toAuditInput(audit: AuditResult, siteContext?: SiteContext): SiteAuditInput {
  return {
    url: audit.url,
    title: audit.title,
    overallScore: audit.overallScore,
    scores: {
      technical: audit.technicalScore,
      chatgpt: audit.chatGptSearchScore,
      geo: audit.academicGeoScore,
      eeat: audit.eeatScore,
      schema: audit.schemaScore,
      bing: audit.bingScore,
    },
    criteria: (audit.criteria ?? []).map(c => ({
      name: c.name,
      status: c.status,
      priority: c.priority,
      improvement: c.improvement,
      estimatedScoreGain: c.estimatedScoreGain,
      category: c.category,
    })),
    summary: audit.summary,
    criticalIssues: audit.criticalIssues,
    quickWins: audit.quickWins,
    siteContext,
  }
}

export async function analyzeIndustry(
  audit: AuditResult,
  persona: InsightPersona,
  siteContext?: SiteContext,
): Promise<InsightResult> {
  const apiKey = localStorage.getItem('seo-analyzer-gemini-key') || undefined

  const res = await fetch('/api/insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audit: toAuditInput(audit, siteContext), persona, apiKey }),
  })

  if (!res.ok) {
    const err = await res.json() as { error: string }
    throw new Error(err.error || `Insight API 오류 (HTTP ${res.status})`)
  }

  return res.json() as Promise<InsightResult>
}
