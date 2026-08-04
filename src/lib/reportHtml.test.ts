import { describe, expect, it } from 'vitest'
import type { AuditResult } from '../types'
import { buildReportHtml, reportFileName } from './reportHtml'

const audit = { url: 'https://example.com/', title: '<script>alert(1)</script>', overallScore: 70, technicalScore: 80, chatGptSearchScore: 70, academicGeoScore: 60, eeatScore: 75, schemaScore: 50, bingScore: 85, lastScanned: '2026-01-01', criteria: [] } as unknown as AuditResult

describe('reportHtml', () => {
  it('creates a complete, escaped standalone report', () => {
    const html = buildReportHtml(audit)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('creates a safe report filename', () => {
    expect(reportFileName(audit)).toMatch(/^SEOGEO-example\.com-\d{4}-\d{2}-\d{2}\.html$/)
  })
})
