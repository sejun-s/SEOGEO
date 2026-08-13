import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, Trash2 } from 'lucide-react'
import type { GeoEngine } from '../types'

type KeyStatus = Record<GeoEngine, 'session' | 'environment' | 'missing'>
const ENGINES: Array<{ id: GeoEngine; label: string; placeholder: string }> = [
  { id: 'gemini', label: 'Gemini', placeholder: 'AIza...' },
  { id: 'perplexity', label: 'Perplexity', placeholder: 'pplx-...' },
  { id: 'chatgpt', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'claude', label: 'Claude', placeholder: 'sk-ant-...' },
  { id: 'naver', label: '네이버 CLOVA', placeholder: 'nv-...' },
]

const EMPTY = Object.fromEntries(ENGINES.map(engine => [engine.id, 'missing'])) as KeyStatus

export function GeoApiKeySettings({ onStatusChange }: { onStatusChange?: (status: KeyStatus) => void }) {
  const [status, setStatus] = useState<KeyStatus>(EMPTY)
  const [values, setValues] = useState<Partial<Record<GeoEngine, string>>>({})
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    const response = await fetch('/api/internal-api-keys', { cache: 'no-store' })
    if (!response.ok) throw new Error('API 키 상태를 불러오지 못했습니다.')
    const data = await response.json() as { status: KeyStatus }
    setStatus(data.status)
    onStatusChange?.(data.status)
  }, [onStatusChange])

  useEffect(() => { refresh().catch(error => setMessage(String(error))) }, [refresh])

  const save = async (engine: GeoEngine) => {
    const apiKey = values[engine]?.trim()
    if (!apiKey) return
    const response = await fetch('/api/internal-api-keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine, apiKey }),
    })
    const data = await response.json() as { status?: KeyStatus; error?: string }
    if (!response.ok || !data.status) throw new Error(data.error ?? '저장하지 못했습니다.')
    setValues(current => ({ ...current, [engine]: '' }))
    setStatus(data.status); onStatusChange?.(data.status); setMessage('서버 메모리에 저장했습니다. 서버를 종료하면 자동 삭제됩니다.')
  }

  const remove = async (engine: GeoEngine) => {
    const response = await fetch('/api/internal-api-keys', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine }),
    })
    const data = await response.json() as { status?: KeyStatus }
    if (data.status) { setStatus(data.status); onStatusChange?.(data.status) }
  }

  return <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-[#1b2559]">
      <span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#4f6df5]" />내부 운영 API 키</span>
      <span className="font-medium text-slate-500">{Object.values(status).filter(value => value !== 'missing').length}/5 연결</span>
    </summary>
    <div className="mt-3 space-y-2">
      {ENGINES.map(engine => <div key={engine.id} className="grid grid-cols-[100px_1fr_auto] items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-700">{engine.label}</span>
        {status[engine.id] !== 'missing' ? <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{status[engine.id] === 'environment' ? '환경변수 연결' : '현재 세션 연결'}</div> : <input type="password" autoComplete="off" value={values[engine.id] ?? ''} onChange={event => setValues(current => ({ ...current, [engine.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') save(engine.id).catch(error => setMessage(String(error))) }} placeholder={engine.placeholder} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#4f6df5]" />}
        {status[engine.id] === 'session' ? <button onClick={() => remove(engine.id)} aria-label={`${engine.label} API 키 삭제`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button> : status[engine.id] === 'missing' ? <button disabled={!values[engine.id]?.trim()} onClick={() => save(engine.id).catch(error => setMessage(String(error)))} className="rounded-lg bg-[#4f6df5] px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">연결</button> : <span />}
      </div>)}
      <p className="pt-1 text-[10px] leading-4 text-slate-500">키 원문은 브라우저 저장소에 저장하지 않습니다. 로컬 개발 서버 메모리에만 보관되며 서버 종료 시 삭제됩니다.</p>
      {message && <p className="text-[10px] font-medium text-blue-700">{message}</p>}
    </div>
  </details>
}
