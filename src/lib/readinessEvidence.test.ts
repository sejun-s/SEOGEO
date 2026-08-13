import { describe, expect, it } from 'vitest'
import { summarizeEvidence } from './readinessEvidence'
import type { RuleResult } from '../types'

const rule = (overrides: Partial<RuleResult> = {}): RuleResult => ({
  ruleId: 'r', ruleVersion: '1', title: 'test', category: 'technical', status: 'pass', severity: 'medium',
  applicable: true, observedValue: 'yes', rawEvidence: 'html', evidenceType: 'official_requirement',
  scoreEffect: '+1', recommendation: '', verificationMethod: '', limitations: '', ...overrides,
})

describe('summarizeEvidence', () => {
  it('unknown rules do not count as measured evidence', () => {
    expect(summarizeEvidence([rule(), rule({ ruleId: 'u', status: 'unknown' })], ['technical']))
      .toMatchObject({ total: 2, measured: 1, coverage: 50, confidence: 'low' })
  })
  it('product heuristics reduce public evidence rate', () => {
    const result = summarizeEvidence([rule(), rule({ ruleId: 'h', evidenceType: 'product_heuristic' })], ['technical'])
    expect(result.publicEvidenceRate).toBe(50)
    expect(result.confidence).toBe('medium')
  })
  it('unrelated categories are excluded', () => {
    expect(summarizeEvidence([rule(), rule({ category: 'geo' })], ['technical']).total).toBe(1)
  })
})
