import React from 'react'

export type EvidenceType =
  | 'official_requirement'
  | 'official_recommendation'
  | 'web_standard'
  | 'research_evidence'
  | 'product_heuristic'
  | 'observed_data'

interface EvidenceBadgeProps {
  type: EvidenceType
}

const CONFIG: Record<EvidenceType, { label: string; cls: string }> = {
  official_requirement:    { label: '공식 요구사항',   cls: 'bg-blue-500/15 border-blue-500/30 text-blue-300' },
  official_recommendation: { label: '공식 권장사항',   cls: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' },
  web_standard:            { label: '웹 표준',         cls: 'bg-violet-500/15 border-violet-500/30 text-violet-300' },
  research_evidence:       { label: '연구 근거',       cls: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' },
  product_heuristic:       { label: '자체 휴리스틱',   cls: 'bg-slate-500/15 border-slate-500/30 text-slate-400' },
  observed_data:           { label: '실제 관측 데이터', cls: 'bg-teal-500/15 border-teal-500/30 text-teal-300' },
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ type }) => {
  const { label, cls } = CONFIG[type]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-medium tracking-wide uppercase ${cls}`}>
      {label}
    </span>
  )
}
