import type { AuditResult } from '../types'
import { CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface NaverReadinessPanelProps {
  audit: AuditResult
}

type Ck = 'pass' | 'fail' | 'warn'

function Row({ status, label, value, tip }: { status: Ck; label: string; value: string; tip?: string }) {
  const Icon = status === 'pass' ? CheckCircle2 : status === 'fail' ? XCircle : AlertCircle
  const color = status === 'pass' ? 'text-emerald-400' : status === 'fail' ? 'text-rose-400' : 'text-amber-400'
  const bg    = status === 'pass' ? 'border-emerald-500/20 bg-emerald-500/5'
              : status === 'fail' ? 'border-rose-500/20 bg-rose-500/5'
              : 'border-amber-500/20 bg-amber-500/5'

  return (
    <div className={`rounded-xl border px-3.5 py-2.5 ${bg}`}>
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 shrink-0 ${color}`} />
        <span className="text-xs font-medium text-slate-200 flex-1">{label}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          status === 'pass' ? 'bg-emerald-500/10 text-emerald-400'
          : status === 'fail' ? 'bg-rose-500/10 text-rose-400'
          : 'bg-amber-500/10 text-amber-400'
        }`}>{value}</span>
      </div>
      {tip && <p className="text-[11px] text-slate-500 mt-1.5 pl-6 leading-relaxed">💡 {tip}</p>}
    </div>
  )
}

export function NaverReadinessPanel({ audit }: NaverReadinessPanelProps) {
  const s = audit.pageSignals
  const hasNaverScore = typeof audit.naverScore === 'number'
  const naverScore = audit.naverScore ?? 0

  // Yeti 봇 접근 여부 (botPolicies에서 확인)
  const yetiPolicy = audit.botPolicies?.find(b => /yeti/i.test(b.botName))
  const yetiBlocked = yetiPolicy?.status === 'blocked'

  // robots.txt에서 직접 확인 (더 정확)
  const robotsTxt = s?.robotsTxt ?? ''
  const yetiExplicitAllow = /user-agent:\s*yeti/i.test(robotsTxt) && !/disallow:\s*\//i.test(
    robotsTxt.slice(robotsTxt.search(/user-agent:\s*yeti/i))
  )

  // 네이버 관련 criteria
  const naverCriteria = (audit.criteria ?? []).filter(c => c.category === 'naver')

  const scoreColor = naverScore >= 70 ? 'text-emerald-400' : naverScore >= 40 ? 'text-amber-400' : 'text-rose-400'
  const scoreBarColor = naverScore >= 70 ? 'bg-emerald-500' : naverScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="space-y-5">
      {/* 점수 카드 */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">네이버 노출 기반</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Yeti 수집 · 서치어드바이저 · 네이버 Analytics</p>
          </div>
          {hasNaverScore ? <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black font-mono ${scoreColor}`}>{naverScore}</span>
            <span className="text-xs text-slate-500">/100</span>
          </div> : <span className="rounded-full bg-slate-700/70 px-3 py-1.5 text-xs font-bold text-slate-200">재분석 필요</span>}
        </div>
        <div className={`h-2 bg-white/8 rounded-full overflow-hidden ${hasNaverScore ? '' : 'opacity-40'}`}>
          <div className={`h-full ${scoreBarColor} rounded-full transition-all duration-700`} style={{ width: `${naverScore}%` }} />
        </div>
      </div>

      {/* 핵심 체크 */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-1">핵심 신호</span>

        {/* Yeti 봇 */}
        <Row
          status={yetiBlocked ? 'fail' : yetiExplicitAllow ? 'pass' : 'warn'}
          label="Yeti 봇 (네이버 수집 로봇)"
          value={yetiBlocked ? '차단됨' : yetiExplicitAllow ? '명시적 허용' : '기본 허용'}
          tip={yetiBlocked
            ? 'robots.txt에서 Yeti 차단을 해제하세요. User-agent: Yeti / Allow: / 추가 권장.'
            : !yetiExplicitAllow
            ? 'robots.txt에 User-agent: Yeti / Allow: / 를 명시하면 네이버 서치어드바이저에서 수집 확인이 더 명확해집니다.'
            : undefined}
        />

        {/* 네이버 Analytics */}
        <Row
          status={s?.hasNaverAnalytics ? 'pass' : 'warn'}
          label="네이버 Analytics (웹로그분석)"
          value={s?.hasNaverAnalytics ? '설치됨' : '미설치'}
          tip={!s?.hasNaverAnalytics
            ? '네이버 서치어드바이저에서 웹로그분석을 연동하면 네이버 검색 유입 데이터를 확인할 수 있습니다.'
            : undefined}
        />

        {/* Title/Description */}
        <Row
          status={s?.title ? (s.title.length >= 20 && s.title.length <= 60 ? 'pass' : 'warn') : 'fail'}
          label="페이지 제목 길이"
          value={s?.title ? `${s.title.length}자` : '없음'}
          tip={s?.title && (s.title.length < 20 || s.title.length > 60)
            ? '네이버 검색 결과에서 잘리지 않으려면 20-60자 사이를 권장합니다.'
            : undefined}
        />

        <Row
          status={s?.metaDescription ? (s.metaDescription.length >= 60 ? 'pass' : 'warn') : 'fail'}
          label="메타 설명 (Description)"
          value={s?.metaDescription ? `${s.metaDescription.length}자` : '없음'}
          tip={!s?.metaDescription
            ? '네이버 검색 결과 요약에 사용됩니다. 80-150자 권장.'
            : s.metaDescription.length < 60
            ? '설명이 짧습니다. 80자 이상으로 늘리면 네이버 검색 결과 요약이 더 풍부하게 나옵니다.'
            : undefined}
        />

        <Row
          status={s?.hasSitemap ? 'pass' : 'warn'}
          label="Sitemap.xml"
          value={s?.hasSitemap ? '있음' : '없음'}
          tip={!s?.hasSitemap
            ? 'sitemap.xml을 생성하고 네이버 서치어드바이저에 제출하면 수집 속도가 빨라집니다.'
            : undefined}
        />

        <Row
          status={s?.isHttps ? 'pass' : 'fail'}
          label="HTTPS 보안 연결"
          value={s?.isHttps ? '적용됨' : '미적용'}
          tip={!s?.isHttps ? '네이버는 HTTPS 사이트를 우선 노출합니다.' : undefined}
        />
      </div>

      {/* AI 분석 항목 (category === 'naver') */}
      {naverCriteria.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-1">AI 진단 항목</span>
          {naverCriteria.map(c => (
            <Row
              key={c.id}
              status={c.status === 'pass' ? 'pass' : c.status === 'warning' ? 'warn' : 'fail'}
              label={c.name}
              value={c.status === 'pass' ? '양호' : c.status === 'warning' ? '주의' : '개선 필요'}
              tip={c.status !== 'pass' ? c.improvement : undefined}
            />
          ))}
        </div>
      )}

      {/* 외부 링크 */}
      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href="https://searchadvisor.naver.com/"
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/15 transition-all font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          네이버 서치어드바이저
        </a>
        <a
          href="https://analytics.naver.com/"
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/8 transition-all font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          네이버 Analytics
        </a>
      </div>
    </div>
  )
}
