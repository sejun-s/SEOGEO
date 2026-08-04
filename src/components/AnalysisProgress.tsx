import { Check, CircleDot, FileSearch, Globe2, Sparkles } from 'lucide-react'
import type { AnalysisEvent } from '../types'

export function AnalysisProgress({ events }: { events: AnalysisEvent[] }) {
  const completed = Math.min(3, Math.floor(events.filter(event => event.type === 'step').length / 2))
  const steps = [
    { label: '사이트 접속', hint: '접근 상태 확인', icon: Globe2 },
    { label: '콘텐츠 분석', hint: 'HTML·구조 파싱', icon: FileSearch },
    { label: '점수 산출', hint: 'SEO·GEO 규칙 검사', icon: CircleDot },
    { label: '인사이트 정리', hint: '보통 10–20초', icon: Sparkles },
  ]

  return (
    <div className="v03-progress-modal" role="status" aria-live="polite">
      <div className="v03-progress-top">
        <span>사이트를 분석하고 있습니다</span>
        <strong>{Math.min(90, 15 + events.length * 8)}%</strong>
      </div>
      <p>잠시만 기다리면 가장 중요한 개선 항목부터 정리해드릴게요.</p>
      <div className="v03-progress-track"><i style={{ width: `${Math.min(90, 15 + events.length * 8)}%` }} /></div>
      <div className="v03-progress-steps">
        {steps.map(({ label, hint, icon: Icon }, index) => {
          const done = index < completed
          const active = index === completed
          return <div key={label} className={done ? 'done' : active ? 'active' : ''}>
            <span>{done ? <Check size={16} /> : <Icon size={16} />}</span>
            <div><b>{label}</b><small>{done ? '완료' : hint}</small></div>
          </div>
        })}
      </div>
    </div>
  )
}
