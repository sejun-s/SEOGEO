import React, { useState, useEffect, useCallback } from 'react';
import type { AuditResult } from '../types';
import { analyzeIndustry } from '../lib/analyzeIndustry';
import type { InsightResult, InsightPersona, SiteContext } from '../lib/analyzeIndustry';
import {
  TrendingUp, Briefcase, Settings2, Sparkles,
  ChevronDown, ChevronUp, CheckCircle2, Globe, Loader2, RefreshCw, Info,
} from 'lucide-react';

// ── Personas ──────────────────────────────────────────────────────────────────

interface PersonaDef {
  id: InsightPersona
  icon: React.ReactNode
  title: string
  role: string
  accent: string
  iconBg: string
  cardBg: string
  loadingBg: string
}

const PERSONAS: PersonaDef[] = [
  {
    id: 'marketer',
    icon: <TrendingUp className="w-4 h-4" />,
    title: '마케터',
    role: '퍼포먼스 · 콘텐츠',
    accent: 'border-purple-500/60 ring-purple-500/30',
    iconBg: 'from-purple-500 to-indigo-500',
    cardBg: 'bg-purple-950/40',
    loadingBg: 'from-purple-500/10 to-indigo-500/10',
  },
  {
    id: 'executive',
    icon: <Briefcase className="w-4 h-4" />,
    title: '경영자',
    role: '대표이사 · 임원',
    accent: 'border-amber-500/60 ring-amber-500/30',
    iconBg: 'from-amber-500 to-orange-500',
    cardBg: 'bg-amber-950/30',
    loadingBg: 'from-amber-500/10 to-orange-500/10',
  },
  {
    id: 'operator',
    icon: <Settings2 className="w-4 h-4" />,
    title: '운영자',
    role: '웹 운영 · 개발팀',
    accent: 'border-teal-500/60 ring-teal-500/30',
    iconBg: 'from-teal-500 to-cyan-500',
    cardBg: 'bg-teal-950/30',
    loadingBg: 'from-teal-500/10 to-cyan-500/10',
  },
]

// ── Purpose chips ─────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS = [
  '리드/문의 생성',
  '이커머스 (온라인 판매)',
  '브랜드 인지도',
  '앱 다운로드 유도',
  '콘텐츠/미디어',
  'B2B 영업',
  '고객 지원/CS',
  '채용',
]

// ── Section colors ────────────────────────────────────────────────────────────

const PERSONA_COLORS: Record<InsightPersona, string[]> = {
  marketer: [
    'from-purple-500/15 to-indigo-500/15 border-purple-500/20',
    'from-indigo-500/15 to-blue-500/15 border-indigo-500/20',
    'from-violet-500/15 to-purple-500/15 border-violet-500/20',
    'from-blue-500/15 to-cyan-500/15 border-blue-500/20',
    'from-fuchsia-500/15 to-pink-500/15 border-fuchsia-500/20',
    'from-pink-500/15 to-rose-500/15 border-pink-500/20',
  ],
  executive: [
    'from-amber-500/15 to-orange-500/15 border-amber-500/20',
    'from-orange-500/15 to-red-500/15 border-orange-500/20',
    'from-yellow-500/15 to-amber-500/15 border-yellow-500/20',
    'from-rose-500/15 to-orange-500/15 border-rose-500/20',
    'from-red-500/15 to-rose-500/15 border-red-500/20',
    'from-amber-600/15 to-yellow-500/15 border-amber-600/20',
  ],
  operator: [
    'from-teal-500/15 to-cyan-500/15 border-teal-500/20',
    'from-cyan-500/15 to-blue-500/15 border-cyan-500/20',
    'from-emerald-500/15 to-teal-500/15 border-emerald-500/20',
    'from-green-500/15 to-emerald-500/15 border-green-500/20',
    'from-teal-600/15 to-green-500/15 border-teal-600/20',
    'from-cyan-600/15 to-teal-500/15 border-cyan-600/20',
  ],
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ section, index, persona }: {
  section: InsightResult['sections'][number]
  index: number
  persona: InsightPersona
}) {
  const [open, setOpen] = useState(true)
  const colorCls = PERSONA_COLORS[persona][index % PERSONA_COLORS[persona].length]
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${colorCls} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/4 transition-colors"
      >
        <span className="text-sm font-semibold text-white">{section.title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">{section.content}</p>
          <ul className="space-y-1.5">
            {section.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function ctxKey(url: string) { return `seo-site-ctx-${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}` }

function loadCtx(url: string): SiteContext {
  try {
    const raw = localStorage.getItem(ctxKey(url))
    return raw ? JSON.parse(raw) as SiteContext : { description: '', purpose: [], targetAudience: '' }
  } catch { return { description: '', purpose: [], targetAudience: '' } }
}

function saveCtx(url: string, ctx: SiteContext) {
  try { localStorage.setItem(ctxKey(url), JSON.stringify(ctx)) } catch { /* ignore */ }
}

// ── InsightPanel ──────────────────────────────────────────────────────────────

interface Props { audit: AuditResult | null }
type Cache = Partial<Record<InsightPersona, InsightResult>>
type Errors = Partial<Record<InsightPersona, string>>

export const InsightPanel: React.FC<Props> = ({ audit }) => {
  const [selected, setSelected] = useState<InsightPersona>('marketer')
  const [loading, setLoading] = useState<InsightPersona | null>(null)
  const [cache, setCache] = useState<Cache>({})
  const [errors, setErrors] = useState<Errors>({})
  const [ctx, setCtx] = useState<SiteContext>({ description: '', purpose: [], targetAudience: '' })
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [targetAudienceDraft, setTargetAudienceDraft] = useState('')
  const [ctxDirty, setCtxDirty] = useState(false) // context changed since last generation

  // Load saved context when audit changes
  useEffect(() => {
    if (!audit) return
    setCache({})
    setErrors({})
    setSelected('marketer')
    const saved = loadCtx(audit.url)
    setCtx(saved)
    setDescriptionDraft(saved.description)
    setTargetAudienceDraft(saved.targetAudience)
    setCtxDirty(false)
  }, [audit])

  const generate = useCallback(async (persona: InsightPersona, auditData: AuditResult, siteCtx: SiteContext) => {
    setLoading(persona)
    setErrors(e => ({ ...e, [persona]: undefined }))
    setCtxDirty(false)
    try {
      const data = await analyzeIndustry(auditData, persona, siteCtx)
      setCache(c => ({ ...c, [persona]: data }))
    } catch (err) {
      setErrors(e => ({ ...e, [persona]: String(err) }))
    } finally {
      setLoading(null)
    }
  }, [])

  // Auto-generate when persona selected (if not cached)
  useEffect(() => {
    if (!audit) return
    if (cache[selected] || loading === selected) return
    generate(selected, audit, ctx)
  }, [selected, audit, cache, loading, generate, ctx])

  const handleSelect = (persona: InsightPersona) => setSelected(persona)

  const handleRetry = () => {
    if (!audit) return
    setCache(c => ({ ...c, [selected]: undefined }))
    generate(selected, audit, ctx)
  }

  const updateCtx = (patch: Partial<SiteContext>) => {
    if (!audit) return
    const next = { ...ctx, ...patch }
    setCtx(next)
    saveCtx(audit.url, next)
    setCtxDirty(true)
    // Invalidate all cached results since context changed
    setCache({})
  }

  const togglePurpose = (p: string) => {
    const next = ctx.purpose.includes(p)
      ? ctx.purpose.filter(x => x !== p)
      : [...ctx.purpose, p]
    updateCtx({ purpose: next })
  }

  const commitDraft = (field: 'description' | 'targetAudience') => {
    if (field === 'description') {
      const value = descriptionDraft.trim()
      setDescriptionDraft(value)
      if (value !== ctx.description) updateCtx({ description: value })
    }
    if (field === 'targetAudience') {
      const value = targetAudienceDraft.trim()
      setTargetAudienceDraft(value)
      if (value !== ctx.targetAudience) updateCtx({ targetAudience: value })
    }
  }

  const commitOnEnter = (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, field: 'description' | 'targetAudience') => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    commitDraft(field)
  }

  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Globe className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-400">분석된 사이트가 없습니다</div>
          <div className="text-[11px] text-slate-600 mt-1">사이드바에서 분석 기록을 선택하거나 새 URL을 분석하세요</div>
        </div>
      </div>
    )
  }

  const result = cache[selected]
  const isLoading = loading === selected
  const error = errors[selected]
  const selectedDef = PERSONAS.find(p => p.id === selected)!
  const hasCtx = !!(ctx.description || ctx.purpose.length || ctx.targetAudience)

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* Site context header */}
      <div className="glass-card px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-300 truncate">{audit.title}</div>
          <div className="text-[10px] text-slate-500 font-mono truncate">{audit.url.replace(/^https?:\/\//, '')}</div>
        </div>
        <div className={`text-lg font-black shrink-0 ${audit.overallScore >= 70 ? 'text-emerald-400' : audit.overallScore >= 55 ? 'text-amber-400' : 'text-rose-400'}`}>
          {audit.overallScore}
          <span className="text-[10px] text-slate-600 font-normal ml-0.5">/ 100</span>
        </div>
      </div>

      {/* Site context input form */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">사이트 정보</span>
          <span className="text-[10px] text-slate-600 ml-auto">입력할수록 인사이트가 정확해집니다</span>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><label className="text-[11px] text-slate-500 font-medium">사이트 소개</label><span className="text-[9px] text-slate-500">Enter로 적용 · Shift+Enter 줄바꿈</span></div>
          <textarea
            value={descriptionDraft}
            onChange={e => setDescriptionDraft(e.target.value)}
            onKeyDown={e => commitOnEnter(e, 'description')}
            placeholder="예: 중소기업 대상 ERP SaaS 솔루션을 제공하는 B2B 서비스입니다"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/40 focus:bg-white/8 resize-none transition-all"
          />
        </div>

        {/* Purpose chips */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-500 font-medium">주요 목적 (복수 선택)</label>
          <div className="flex flex-wrap gap-1.5">
            {PURPOSE_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => togglePurpose(p)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                  ctx.purpose.includes(p)
                    ? 'bg-purple-500/25 border-purple-500/50 text-purple-300'
                    : 'bg-white/4 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Target audience */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><label className="text-[11px] text-slate-500 font-medium">타겟 고객</label><span className="text-[9px] text-slate-500">Enter로 적용</span></div>
          <input
            type="text"
            value={targetAudienceDraft}
            onChange={e => setTargetAudienceDraft(e.target.value)}
            onKeyDown={e => commitOnEnter(e, 'targetAudience')}
            placeholder="예: 50인 이상 중소기업 재무/IT 담당자"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/40 focus:bg-white/8 transition-all"
          />
        </div>

        {ctxDirty && hasCtx && (
          <div className="text-[10px] text-amber-400/70 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 shrink-0" />
            정보가 변경됐습니다 — 페르소나를 클릭하면 새로운 인사이트를 생성합니다
          </div>
        )}
      </div>

      {/* Persona tabs */}
      <div className="glass-card p-1.5 flex gap-1.5">
        {PERSONAS.map(p => {
          const isSelected = selected === p.id
          const isDone = !!cache[p.id]
          const isGen = loading === p.id
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              disabled={isGen}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                isSelected
                  ? `${p.cardBg} ${p.accent} ring-1 text-white`
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${p.iconBg} flex items-center justify-center text-white shrink-0`}>
                {isGen ? <Loader2 className="w-3 h-3 animate-spin" /> : p.icon}
              </span>
              <span>{p.title}</span>
              {isDone && !isGen && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className={`glass-card p-8 flex flex-col items-center gap-3 bg-gradient-to-br ${selectedDef.loadingBg}`}>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedDef.iconBg} flex items-center justify-center text-white`}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">{selectedDef.title} 관점으로 분석 중</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {hasCtx ? '입력하신 사이트 정보를 반영하여' : ''} AI 제언을 생성하고 있습니다...
            </div>
          </div>
        </div>
      )}

      {/* Initial Empty State */}
      {!isLoading && !result && !error && (
        <div className="glass-card p-8 flex flex-col items-center gap-3.5 text-center">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedDef.iconBg} flex items-center justify-center text-white`}>
            {selectedDef.icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{selectedDef.title} 맞춤형 AI 인사이트</div>
            <div className="text-xs text-slate-400 mt-1 max-w-sm">
              선택한 {selectedDef.title} 관점에서 사이트 맞춤형 액션 플랜과 AI 가이드를 생성합니다.
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="btn-purple text-xs px-4 py-2 gap-2 mt-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> {selectedDef.title} 인사이트 생성
          </button>
        </div>
      )}

      {/* Results */}
      {!isLoading && result && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${selectedDef.iconBg} flex items-center justify-center text-white shrink-0`}>
                {selectedDef.icon}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{selectedDef.title} 관점 제언</div>
                <div className="text-[10px] text-slate-500">{result.sections?.length ?? 0}개 섹션{hasCtx ? ' · 사이트 정보 반영됨' : ''}</div>
              </div>
            </div>
            <button onClick={handleRetry} className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors">
              <RefreshCw className="w-3 h-3" /> 재생성
            </button>
          </div>
          {(result.sections ?? []).map((section, i) => (
            <SectionCard key={i} section={section} index={i} persona={selected} />
          ))}
        </div>
      )}

    </div>
  )
}
