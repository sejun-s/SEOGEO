import { URL } from 'url'

export interface UrlSecurityResult {
  safe: boolean
  errorCode?: 'INVALID_URL' | 'BLOCKED_TARGET' | 'UNSUPPORTED_PROTOCOL' | 'BLOCKED_PORT' | 'RATE_LIMITED'
  errorMessage?: string
  normalizedUrl?: string
}

const PRIVATE_IP_RANGES = [
  /^127\./,                           // Loopback
  /^10\./,                            // Private IP Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,   // Private IP Class B
  /^192\.168\./,                      // Private IP Class C
  /^169\.254\./,                      // Link-local & Cloud metadata (169.254.169.254)
  /^0\./,                             // Current network
  /^::1$/,                            // IPv6 Loopback
  /^fe80:/i,                          // IPv6 Link-local
  /^fc00:/i,                          // IPv6 Unique local
]

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'broadcasthost',
  'metadata.google.internal',
  '169.254.169.254',
]

// 차단 대상 사설 / 대화형 서비스 포트 (Port Scanning 방지)
const BLOCKED_INTERNAL_PORTS = new Set([
  21, 22, 23, 25, 53, 110, 143, 389, 445, 1433, 1521, 2049, 3306, 3389, 5432, 5900, 6379, 8080, 9200, 11211, 27017,
])

// ── In-Memory Rate Limiter (최근 1분 간 30회 초과 시 쿨다운) ──────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(clientId: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(clientId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count += 1
  return true
}

// ── URL 검증 및 SSRF / Port Scan 방어 ───────────────────────────────────────
export function validateAndNormalizeUrl(inputUrl: string, allowLocalhost = false): UrlSecurityResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { safe: false, errorCode: 'INVALID_URL', errorMessage: 'URL이 입력되지 않았습니다.' }
  }

  // 10,000자 초과 입력 방지 (ReDoS / Memory DoS 방어)
  if (inputUrl.length > 2000) {
    return { safe: false, errorCode: 'INVALID_URL', errorMessage: 'URL 길이가 허용 한도(2,000자)를 초과했습니다.' }
  }

  let trimmed = inputUrl.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { safe: false, errorCode: 'INVALID_URL', errorMessage: '올바른 URL 형식이 아닙니다.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, errorCode: 'UNSUPPORTED_PROTOCOL', errorMessage: 'HTTP 및 HTTPS 프로토콜만 지원합니다.' }
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80)
  if (BLOCKED_INTERNAL_PORTS.has(port) && !allowLocalhost) {
    return {
      safe: false,
      errorCode: 'BLOCKED_PORT',
      errorMessage: `보안 정책상 내부 서비스 포트(${port}) 접근은 차단됩니다.`,
    }
  }

  const hostname = parsed.hostname.toLowerCase()

  if (!allowLocalhost) {
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return {
        safe: false,
        errorCode: 'BLOCKED_TARGET',
        errorMessage: '보안 정책상 사설망 및 로컬호스트 접근은 차단됩니다.',
      }
    }

    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return {
          safe: false,
          errorCode: 'BLOCKED_TARGET',
          errorMessage: '보안 정책상 내부 사설 IP 대역 접근은 차단됩니다.',
        }
      }
    }
  }

  return {
    safe: true,
    normalizedUrl: parsed.toString(),
  }
}

// ── API Key 마스킹 (민감 정보 유출 방지) ────────────────────────────────────
export function maskApiKey(apiKey?: string): string {
  if (!apiKey) return '(미설정)'
  if (apiKey.length <= 8) return '****'
  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
}

// ── XSS 이스케이프 헬퍼 ──────────────────────────────────────────────────
export function escapeHtml(unsafeStr: string): string {
  if (!unsafeStr) return ''
  return unsafeStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
