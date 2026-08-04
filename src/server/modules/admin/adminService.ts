export interface SystemHealthMetrics {
  totalRunsToday: number
  successRatePct: number
  partialSuccessRatePct: number
  failureRatePct: number
  avgDurationMs: number
  queuedCount: number
  activeWorkers: number
  errorCounts: Record<string, number>
  externalApiStatus: Array<{
    provider: string
    status: 'healthy' | 'degraded' | 'error'
    latencyMs: number
    lastUsed: string
  }>
}

export interface AdminAnalysisRunSummary {
  id: string
  url: string
  domain: string
  status: 'queued' | 'running' | 'partial_success' | 'completed' | 'failed' | 'cancelled'
  scoreModelVersion: string
  durationMs: number
  failureCode?: string
  requestedAt: string
  seoFoundationScore?: number
  maskedApiKey?: string
}

// In-memory telemetry aggregator for dev server & local runs
class AdminTelemetryStore {
  private runs: AdminAnalysisRunSummary[] = []
  private errors: Record<string, number> = {}

  public recordRun(run: AdminAnalysisRunSummary) {
    this.runs.unshift(run)
    if (this.runs.length > 200) this.runs.pop()
    if (run.failureCode) {
      this.errors[run.failureCode] = (this.errors[run.failureCode] || 0) + 1
    }
  }

  public getHealthMetrics(): SystemHealthMetrics {
    const total = this.runs.length || 1
    const completed = this.runs.filter(r => r.status === 'completed').length
    const partial = this.runs.filter(r => r.status === 'partial_success').length
    const failed = this.runs.filter(r => r.status === 'failed').length
    const avgDuration = Math.round(this.runs.reduce((acc, r) => acc + (r.durationMs || 0), 0) / total)

    return {
      totalRunsToday: this.runs.length,
      successRatePct: Math.round((completed / total) * 100),
      partialSuccessRatePct: Math.round((partial / total) * 100),
      failureRatePct: Math.round((failed / total) * 100),
      avgDurationMs: avgDuration || 1420,
      queuedCount: 0,
      activeWorkers: 1,
      errorCounts: this.errors,
      externalApiStatus: [
        { provider: 'Google Gemini 2.0 Flash', status: 'healthy', latencyMs: 340, lastUsed: new Date().toISOString() },
        { provider: 'Web Scraper & Fetcher', status: 'healthy', latencyMs: 120, lastUsed: new Date().toISOString() },
        { provider: 'PostgreSQL DB Adapter', status: 'healthy', latencyMs: 5, lastUsed: new Date().toISOString() },
      ],
    }
  }

  public getRuns(limit = 50): AdminAnalysisRunSummary[] {
    return this.runs.slice(0, limit)
  }
}

export const adminTelemetry = new AdminTelemetryStore()
