import type { GeoEngine } from '../types.ts'

const keys: Partial<Record<GeoEngine, string>> = {}

export function setInternalApiKey(engine: GeoEngine, value: string) {
  keys[engine] = value.trim()
}

export function removeInternalApiKey(engine: GeoEngine) {
  delete keys[engine]
}

export function getInternalApiKeys(): Partial<Record<GeoEngine, string>> {
  return { ...keys }
}

export function getInternalApiKeyStatus(environment: Partial<Record<GeoEngine, string>>) {
  return (['perplexity', 'chatgpt', 'claude', 'gemini', 'naver'] as GeoEngine[]).reduce((result, engine) => {
    result[engine] = keys[engine] ? 'session' : environment[engine] ? 'environment' : 'missing'
    return result
  }, {} as Record<GeoEngine, 'session' | 'environment' | 'missing'>)
}
