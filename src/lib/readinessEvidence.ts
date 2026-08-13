import type { MeasurementConfidence, RuleResult } from '../types'

export function summarizeEvidence(rules: RuleResult[], categories: RuleResult['category'][]) {
  const applicable = rules.filter(rule => rule.applicable && categories.includes(rule.category))
  const measured = applicable.filter(rule => rule.status !== 'unknown' && rule.status !== 'not_applicable')
  const publicEvidence = measured.filter(rule => rule.evidenceType !== 'product_heuristic')
  const coverage = applicable.length ? Math.round(measured.length / applicable.length * 100) : 0
  const publicEvidenceRate = measured.length ? Math.round(publicEvidence.length / measured.length * 100) : 0
  const confidence: MeasurementConfidence = coverage >= 90 && publicEvidenceRate >= 80
    ? 'high' : coverage >= 65 && publicEvidenceRate >= 50 ? 'medium' : 'low'
  return { total: applicable.length, measured: measured.length, coverage, publicEvidenceRate, confidence }
}

export const CONFIDENCE_LABEL = { high: '높음', medium: '보통', low: '낮음' } as const
