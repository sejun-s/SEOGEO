import type { AuditResult } from '../types'
import { ArrowRight, ExternalLink, Info, ShieldCheck, Sparkles, Target } from 'lucide-react'

interface ScoreOverviewProps { audit: AuditResult }

const CATEGORY_META = [
  ['technicalScore', 'Technical SEO'],
  ['chatGptSearchScore', 'ChatGPT Search'],
  ['academicGeoScore', 'GEO'],
  ['eeatScore', 'E-E-A-T'],
  ['schemaScore', 'Schema.org'],
  ['bingScore', 'Bing / AEO'],
] as const

function tone(score: number) {
  if (score >= 80) return { text: '#0f9f85', bg: '#e8faf6', label: '좋음' }
  if (score >= 60) return { text: '#c48214', bg: '#fff8df', label: '개선 필요' }
  return { text: '#df5b67', bg: '#fff0f2', label: '주의' }
}

function RadarChart({ values }: { values: Array<{ label: string; score: number }> }) {
  const center = 110
  const radius = 78
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length
    const distance = radius * value
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`
  }
  const grid = [0.25, 0.5, 0.75, 1].map(level => values.map((_, index) => point(index, level)).join(' '))
  const data = values.map((item, index) => point(index, item.score / 100)).join(' ')

  return (
    <svg viewBox="0 0 220 220" className="v03-radar" role="img" aria-label="카테고리별 점수 균형 차트">
      {grid.map((points, index) => <polygon key={points} points={points} fill={index % 2 ? '#f7fbfb' : 'transparent'} stroke="#dcebea" strokeWidth="1" />)}
      {values.map((item, index) => {
        const [x, y] = point(index, 1).split(',').map(Number)
        const [labelX, labelY] = point(index, 1.2).split(',').map(Number)
        return <g key={item.label}><line x1={center} y1={center} x2={x} y2={y} stroke="#e1ecec" /><text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle">{item.label}</text></g>
      })}
      <polygon points={data} fill="rgba(79, 109, 245, .18)" stroke="#4f6df5" strokeWidth="2.5" />
      {values.map((item, index) => { const [x, y] = point(index, item.score / 100).split(',').map(Number); return <circle key={item.label} cx={x} cy={y} r="3.5" fill="#4f6df5"><title>{item.label} {item.score}점</title></circle> })}
    </svg>
  )
}

export function ScoreOverview({ audit }: ScoreOverviewProps) {
  const categories = CATEGORY_META.map(([key, label]) => ({ key, label, score: audit[key] as number })).sort((a, b) => a.score - b.score)
  const primaryScore = audit.seoFoundationScore ?? audit.overallScore
  const aiScore = audit.aiCitationReadinessScore ?? Math.round((audit.chatGptSearchScore + audit.academicGeoScore) / 2)
  const primaryTone = tone(primaryScore)
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 }
  const topIssue = (audit.criteria ?? []).filter(item => item.status !== 'pass').sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.estimatedScoreGain - a.estimatedScoreGain)[0]
  const goToAction = () => document.getElementById('action-hub')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="v03-score-overview">
      <div className="v03-score-heading">
        <div>
          <span className="v03-eyebrow">SITE READINESS REPORT</span>
          <h1>{audit.title}</h1>
          <a href={audit.url} target="_blank" rel="noreferrer">{audit.url.replace(/^https?:\/\//, '')}<ExternalLink size={13} /></a>
        </div>
        <span className="v03-scan-date">최근 분석 · {new Date(audit.lastScanned).toLocaleString('ko-KR')}</span>
      </div>

      <div className="v03-score-grid">
        <article className="v03-primary-score">
          <div className="v03-score-label"><ShieldCheck size={17} /> SEO 기반 점수</div>
          <div className="v03-score-number">{primaryScore}<small>/100</small></div>
          <span className="v03-status-pill" style={{ color: primaryTone.text, background: primaryTone.bg }}>{primaryTone.label}</span>
          <p>색인, 크롤링, 콘텐츠 구조를 기준으로 한 핵심 준비도입니다.</p>
        </article>

        <article className="v03-primary-score ai">
          <div className="v03-score-label"><Sparkles size={17} /> AI 인용 준비도</div>
          <div className="v03-score-number">{aiScore}<small>/100</small></div>
          <span className="v03-status-pill" style={{ color: tone(aiScore).text, background: tone(aiScore).bg }}>{tone(aiScore).label}</span>
          <p>AI 검색 서비스가 내용을 이해하고 인용하기 쉬운 정도입니다.</p>
        </article>

        <article className="v03-radar-card">
          <div><span className="v03-card-title">영역별 균형</span><p>취약한 영역부터 자동 정렬했습니다.</p></div>
          <RadarChart values={categories} />
        </article>
      </div>

      <div className="v03-action-banner">
        <div className="v03-action-icon"><Target size={20} /></div>
        <div className="v03-action-copy">
          <span>지금 가장 먼저 할 일</span>
          <strong>{topIssue?.name ?? '핵심 SEO 항목이 안정적입니다'}</strong>
          <p>{topIssue ? `${topIssue.improvement.split('\n')[0].replace(/^①\s*/, '')} · 예상 +${topIssue.estimatedScoreGain}점` : '현재 주요 감점 항목이 없습니다.'}</p>
        </div>
        {topIssue && <button onClick={goToAction}>해결 방법 보기 <ArrowRight size={15} /></button>}
      </div>

      <div className="v03-category-list">
        {categories.map(item => (
          <div key={item.key} className="v03-category-row">
            <div><span>{item.label}</span><small>{tone(item.score).label}</small></div>
            <div className="v03-bar"><i style={{ width: `${item.score}%`, background: tone(item.score).text }} /></div>
            <b>{item.score}</b>
          </div>
        ))}
      </div>

      <div className="v03-disclaimer"><Info size={14} /> 자체 준비도 지표이며 Google 또는 AI 서비스의 공식 순위 점수가 아닙니다. 확인 가능한 공개 데이터와 규칙 근거를 사용합니다.</div>
    </section>
  )
}
