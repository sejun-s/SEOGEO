import { describe, expect, it } from 'vitest'
import { calcCitationRates } from './geoMonitor'
import type { GeoAggregatedResult } from '../types'

function result(engine: GeoAggregatedResult['engine'], citationRate: number, error?: string): GeoAggregatedResult {
  return {
    queryId: 'q1', queryText: '질문', engine, repeatCount: 1, citedCount: citationRate > 0 ? 1 : 0,
    citationRate, confidence: 'low', allCitedUrls: [], competitorMentions: [], responsePreview: '', error,
  }
}

describe('GEO citation rate aggregation', () => {
  it('does not report an API failure as a zero citation score', () => {
    const { rates, overall } = calcCitationRates([result('chatgpt', 0, 'API key missing')], ['chatgpt'])
    expect(rates.chatgpt).toBeUndefined()
    expect(overall).toBe(0)
  })

  it('averages only valid measurements', () => {
    const { rates, overall } = calcCitationRates([
      result('perplexity', 100), result('perplexity', 0), result('chatgpt', 0, 'timeout'),
    ], ['perplexity', 'chatgpt'])
    expect(rates.perplexity).toBe(50)
    expect(rates.chatgpt).toBeUndefined()
    expect(overall).toBe(50)
  })
})
