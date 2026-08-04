import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldAlert } from 'lucide-react'

export type StatusLevel = 'pass' | 'warning' | 'fail' | 'unknown' | 'blocking'

interface StatusBadgeProps {
  status: StatusLevel
  label?: string
  size?: 'sm' | 'md'
}

const CONFIG: Record<StatusLevel, { icon: React.ReactNode; cls: string; defaultLabel: string }> = {
  pass:     { icon: <CheckCircle2 className="w-3 h-3" />,  cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', defaultLabel: '통과' },
  warning:  { icon: <AlertTriangle className="w-3 h-3" />, cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300',   defaultLabel: '주의' },
  fail:     { icon: <XCircle className="w-3 h-3" />,       cls: 'bg-rose-500/15 border-rose-500/30 text-rose-300',       defaultLabel: '실패' },
  unknown:  { icon: <HelpCircle className="w-3 h-3" />,    cls: 'bg-slate-500/15 border-slate-500/30 text-slate-400',    defaultLabel: '확인 불가' },
  blocking: { icon: <ShieldAlert className="w-3 h-3" />,   cls: 'bg-red-600/20 border-red-500/40 text-red-300',          defaultLabel: '검색 차단' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  const { icon, cls, defaultLabel } = CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${cls} ${size === 'md' ? 'text-xs' : 'text-[10px]'}`}>
      {icon}
      {label ?? defaultLabel}
    </span>
  )
}

// 검색 자격 상태 배지 (더 큰 버전)
interface EligibilityBannerProps {
  status: 'pass' | 'warning' | 'fail' | 'unknown'
  detail?: string
}

export const EligibilityBanner: React.FC<EligibilityBannerProps> = ({ status, detail }) => {
  const map = {
    pass:    { cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300', icon: <CheckCircle2 className="w-4 h-4 shrink-0" />, label: '검색 자격 통과' },
    warning: { cls: 'bg-amber-500/10 border-amber-500/25 text-amber-300',       icon: <AlertTriangle className="w-4 h-4 shrink-0" />, label: '검색 자격 주의' },
    fail:    { cls: 'bg-red-600/15 border-red-500/35 text-red-300',             icon: <ShieldAlert className="w-4 h-4 shrink-0" />,   label: '검색 차단 감지' },
    unknown: { cls: 'bg-slate-500/10 border-slate-500/25 text-slate-400',       icon: <HelpCircle className="w-4 h-4 shrink-0" />,    label: '검색 자격 확인 불가' },
  }
  const { cls, icon, label } = map[status]
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${cls}`}>
      {icon}
      <span>{label}</span>
      {detail && <span className="text-[10px] font-normal opacity-70 ml-1">— {detail}</span>}
    </div>
  )
}
