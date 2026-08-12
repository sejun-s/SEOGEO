import type { AuditResult } from '../types'
import { ArrowRight, ExternalLink, Info, ShieldCheck, Sparkles, Target } from 'lucide-react'

interface ScoreOverviewProps { audit: AuditResult }

const CATEGORY_META = [
  ['technicalScore', 'Technical SEO'],
  ['chatGptSearchScore', 'AI 검색 접근'],
  ['academicGeoScore', '인용 구조 신호'],
  ['eeatScore', '콘텐츠 신뢰 신호'],
  ['schemaScore', 'Schema.org'],
  ['bingScore', 'Bing'],
  ['naverScore', 'Naver'],
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
  const categories = CATEGORY_META
    .filter(([key]) => key !== 'naverScore' || typeof audit.naverScore === 'number')
    .map(([key, label]) => ({ key, label, score: (audit[key] as number | undefined) ?? 0 }))
    .sort((a, b) => a.score - b.score)
  const primaryScore = audit.seoFoundationScore ?? audit.overallScore
  const aiScore = audit.aiCitationReadinessScore ?? Math.round((audit.chatGptSearchScore + audit.academicGeoScore) / 2)
  const hasNaverScore = typeof audit.naverScore === 'number'
  const naverScore = audit.naverScore ?? 0
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
          <div className="v03-score-label"><ShieldCheck size={17} /> SEO 기술 준비도</div>
          <div className="v03-score-number">{primaryScore}<small>/100</small></div>
          <span className="v03-status-pill" style={{ color: primaryTone.text, background: primaryTone.bg }}>{primaryTone.label}</span>
          <p>대표 페이지의 접근·색인·HTML 구조를 측정한 자체 지표입니다.</p>
        </article>

        <article className="v03-primary-score ai">
          <div className="v03-score-label"><Sparkles size={17} /> AI 인용 준비도</div>
          <div className="v03-score-number">{aiScore}<small>/100</small></div>
          <span className="v03-status-pill" style={{ color: tone(aiScore).text, background: tone(aiScore).bg }}>{tone(aiScore).label}</span>
          <p>접근성·정보 구조·출처 신호를 측정하며 실제 인용을 보장하지 않습니다.</p>
        </article>

        <article className="v03-primary-score naver">
          <div className="v03-score-label"><span className="font-black text-green-700">N</span> 네이버 검색 준비도</div>
          <div className="v03-score-number">{hasNaverScore ? naverScore : '—'}<small>{hasNaverScore ? '/100' : ''}</small></div>
          <span className="v03-status-pill" style={{ color: hasNaverScore ? tone(naverScore).text : '#475569', background: hasNaverScore ? tone(naverScore).bg : '#e2e8f0' }}>{hasNaverScore ? tone(naverScore).label : '재분석 필요'}</span>
          <p>{hasNaverScore ? 'Yeti 접근, 색인 설정, 메타 권장 범위와 Sitemap 준비 상태입니다.' : 'v0.6 기준 네이버 준비도를 확인하려면 URL을 다시 분석하세요.'}</p>
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
          <p>{topIssue ? `${topIssue.improvement.split('\n')[0].replace(/^①\s*/, '')} · ${topIssue.priority === 'critical' || topIssue.priority === 'high' ? '영향도 높음' : '영향도 중간'}` : '현재 주요 감점 항목이 없습니다.'}</p>
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

      <div className="v03-disclaimer"><Info size={14} /> SEOGEO 자체 준비도 지수입니다. Google·네이버·AI 서비스의 공식 점수나 노출 보장이 아니며, 측정 신뢰도는 <b>{audit.measurementConfidence === 'high' ? '높음' : audit.measurementConfidence === 'medium' ? '보통' : '낮음'}</b>입니다. 실제 수집·색인·노출은 각 웹마스터 도구에서 확인해야 합니다.</div>
    </section>
  )
}
