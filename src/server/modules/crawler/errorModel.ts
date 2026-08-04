export type BackendErrorCode =
  | 'INVALID_URL'
  | 'BLOCKED_TARGET'
  | 'UNSUPPORTED_PROTOCOL'
  | 'DNS_FAILURE'
  | 'FETCH_TIMEOUT'
  | 'TOO_MANY_REDIRECTS'
  | 'RESPONSE_TOO_LARGE'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'HTML_PARSE_FAILURE'
  | 'ROBOTS_FETCH_FAILURE'
  | 'SITEMAP_FETCH_FAILURE'
  | 'RENDER_FAILURE'
  | 'RULE_EVALUATION_FAILURE'
  | 'SCORE_CALCULATION_FAILURE'
  | 'PROVIDER_AUTH_FAILURE'
  | 'PROVIDER_RATE_LIMIT'
  | 'DATABASE_FAILURE'
  | 'JOB_LOCK_FAILURE'

export interface ErrorDetails {
  code: BackendErrorCode
  message: string
  stage?: string
  httpStatus?: number
  retryable?: boolean
}

export function createErrorDetails(code: BackendErrorCode, message: string, stage?: string, httpStatus?: number): ErrorDetails {
  const retryable = ['FETCH_TIMEOUT', 'ROBOTS_FETCH_FAILURE', 'SITEMAP_FETCH_FAILURE', 'PROVIDER_RATE_LIMIT'].includes(code)
  return { code, message, stage, httpStatus, retryable }
}
