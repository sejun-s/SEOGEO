import type { AuditResult, CriteriaItem } from '../types'
import { ArrowRight, ExternalLink, Info, Search, Sparkles, Target } from 'lucide-react'

export type ReadinessMode = 'technical' | 'ai-citation' | 'naver'

interface Props {
  audit: AuditResult
  mode: ReadinessMode
}

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }

const MODE_CONFIG: Record<ReadinessMode, {
  eyebrow: string
  title: string
  description: string
  categories: CriteriaItem['category'][]
  score: (audit: AuditResult) => number | null
  signals: Array<{ key: keyof AuditResult; label: string }>
}> = {
  technical: {
    eyebrow: 'SEARCH FOUNDATION',
    title: 'SEO 기반 품질',
    description: '검색엔진이 홈페이지를 정상적으로 수집·색인하고 문서 구조를 이해할 수 있는지 평가합니다.',
    categories: ['technical', 'schema', 'bing'],
    score: audit => audit.seoFoundationScore ?? audit.overallScore,
    signals: [
      { key: 'technicalScore', label: '기술 SEO' },
      { key: 'schemaScore', label: '구조화 데이터' },
      { key: 'bingScore', label: 'Bing·IndexNow' },
    ],
  },
  'ai-citation': {
    eyebrow: 'AI SEARCH VISIBILITY',
    title: 'AI 검색 가시성',
    description: 'AI 검색 서비스가 브랜드와 콘텐츠를 발견하고 답변 근거로 활용하기 좋은지 평가합니다.',
    categories: ['chatgpt', 'geo', 'eeat'],
    score: audit => audit.aiCitationReadinessScore ?? Math.round((audit.chatGptSearchScore + audit.academicGeoScore) / 2),
    signals: [
      { key: 'chatGptSearchScore', label: 'AI 검색 접근' },
      { key: 'academicGeoScore', label: '인용 구조 신호' },
      { key: 'eeatScore', label: '콘텐츠 신뢰 신호' },
    ],
  },
  naver: {
    eyebrow: 'NAVER SEARCH FOUNDATION',
    title: '네이버 노출 기반',
    description: '네이버가 홈페이지를 수집하고 검색 결과로 구성하기 위한 기술적 기반을 평가합니다.',
    categories: ['naver'],
    score: audit => typeof audit.naverScore === 'number' ? audit.naverScore : null,
    signals: [],
  },
}

function status(score: number | null) {
  if (score === null) return { label: '재분석 필요', text: '#475569', bg: '#e2e8f0' }
  if (score >= 80) return { label: '양호', text: '#0f766e', bg: '#ccfbf1' }
  if (score >= 60) return { label: '개선 필요', text: '#a16207', bg: '#fef3c7' }
  return { label: '우선 개선', text: '#be123c', bg: '#ffe4e6' }
}

export function ReadinessOverview({ audit, mode }: Props) {
  const config = MODE_CONFIG[mode]
  const score = config.score(audit)
  const scoreTone = status(score)
  const issues = (audit.criteria ?? [])
    .filter(item => item.status !== 'pass' && config.categories.includes(item.category))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.estimatedScoreGain - a.estimatedScoreGain)
  const topIssue = issues[0]
  const signals = config.signals.map(signal => ({
    label: signal.label,
    score: Number(audit[signal.key] ?? 0),
  }))

  const goToAction = () => document.getElementById('action-hub')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="v03-score-overview space-y-5">
      <div className="v03-score-heading">
        <div>
          <span className="v03-eyebrow">{config.eyebrow}</span>
          <h1>{audit.title}</h1>
          <a href={audit.url} target="_blank" rel="noreferrer">
            {audit.url.replace(/^https?:\/\//, '')}<ExternalLink size={13} />
          </a>
        </div>
        <span className="v03-scan-date">최근 분석 · {new Date(audit.lastScanned).toLocaleString('ko-KR')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.6fr] gap-4">
        <article className="v03-primary-score min-h-[240px]">
          <div className="v03-score-label">
            {mode === 'ai-citation' ? <Sparkles size={18} /> : <Search size={18} />}
            {config.title}
          </div>
          <div className="v03-score-number">{score ?? '—'}<small>{score === null ? '' : '/100'}</small></div>
          <span className="v03-status-pill" style={{ color: scoreTone.text, background: scoreTone.bg }}>{scoreTone.label}</span>
          <p>{score === null ? '최신 점수 모델로 URL을 다시 분석하면 이 영역의 점수와 근거가 생성됩니다.' : config.description}</p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <span className="v03-card-title">{config.title} 세부 지표</span>
              <p className="text-sm text-slate-600 mt-1">현재 메뉴에 해당하는 신호만 표시합니다.</p>
            </div>
            <span className="text-sm font-bold text-slate-700">문제 {issues.length}개</span>
          </div>
          {signals.length > 0 ? (
            <div className="space-y-5">
              {signals.map(signal => (
                <div key={signal.label}>
                  <div className="flex justify-between text-sm font-semibold text-slate-800 mb-2"><span>{signal.label}</span><b>{signal.score}점</b></div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><i className="block h-full rounded-full bg-blue-600" style={{ width: `${signal.score}%` }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-700 leading-7">
              네이버 자동 측정 결과와 서치어드바이저에서 직접 확인해야 할 항목을 아래에서 구분해 제공합니다.
            </div>
          )}
        </article>
      </div>

      <div className="v03-action-banner">
        <div className="v03-action-icon"><Target size={20} /></div>
        <div className="v03-action-copy">
          <span>{config.title} · 지금 가장 먼저 할 일</span>
          <strong>{topIssue?.name ?? (score === null ? '최신 기준으로 URL 재분석' : '긴급한 개선 항목이 없습니다')}</strong>
          <p>{topIssue ? `${topIssue.improvement.split('\n')[0]} · 영향도 ${topIssue.priority === 'critical' || topIssue.priority === 'high' ? '높음' : '중간'}` : score === null ? '재분석 후 이 메뉴에 해당하는 최우선 액션을 제공합니다.' : '현재 상태를 유지하고 정기적으로 다시 검사하세요.'}</p>
        </div>
        {topIssue && <button onClick={goToAction}>해결 방법 보기 <ArrowRight size={15} /></button>}
      </div>

      <div className="v03-disclaimer"><Info size={14} /> {config.title}은 SEOGEO 자체 진단 지표이며 검색 순위·노출·AI 인용을 보장하지 않습니다. 자동 측정이 불가능한 항목은 점수에 임의 반영하지 않고 별도 확인 항목으로 표시합니다.</div>
    </section>
  )
}
