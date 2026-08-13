/**
 * GeoActionPanel — P1-3: GEO 결과 → 개선 액션 추천
 *
 * 인용률 데이터를 분석해 구체적 행동 가이드를 생성한다.
 * GEOMIX는 측정만 하고 끝 → 우리는 "다음 스텝"까지 제시.
 */

import { Lightbulb, ArrowRight, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'
import type { GeoMonitoringRun, GeoEngine } from '../types'

// ── 추천 타입 ─────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low'

interface ActionItem {
  id       : string
  priority : Priority
  icon     : string
  title    : string
  why      : string          // 왜 이게 문제인가
  how      : string          // 어떻게 고치나 (구체적)
  engine?  : GeoEngine       // 특정 엔진 관련이면
  impact   : string          // 예상 효과
}

// ── 분석 엔진 ─────────────────────────────────────────────────────────────

const ENGINE_ADVICE: Record<GeoEngine, {
  weakTitle: string
  weakWhy  : string
  weakHow  : string
}> = {
  perplexity: {
    weakTitle: 'Perplexity 인용 낮음 — 외부 링크 확보 필요',
    weakWhy  : 'Perplexity는 웹 인덱싱 기반으로 실제 외부 사이트가 내 사이트를 링크해야 인용 확률이 높아집니다.',
    weakHow  : '업계 블로그·뉴스에 기고문 작성 / PR 자료 배포 / 위키피디아 참고문헌 등록을 시도하세요.',
  },
  chatgpt: {
    weakTitle: 'ChatGPT 인용 낮음 — 팩트 밀도 강화 필요',
    weakWhy  : 'ChatGPT는 학습 데이터의 사실 밀도에 반응합니다. 브랜드명·수치·고유 개념이 명확할수록 유리합니다.',
    weakHow  : '핵심 페이지에 브랜드 명칭 + 구체적 수치("한국 AI SEO 분석 도구 1위, 월 10만 건 분석")를 포함하세요.',
  },
  claude: {
    weakTitle: 'Claude 인용 낮음 — 콘텐츠 구조 개선 필요',
    weakWhy  : 'Claude는 잘 구조화된 정보(개요·정의·단계별 설명)를 선호합니다.',
    weakHow  : '주요 개념에 대해 명확한 정의 단락 + 불릿 리스트 + 요약 섹션을 추가하세요.',
  },
  gemini: {
    weakTitle: 'Gemini 인용 낮음 — 페이지 속도·신뢰 신호 점검',
    weakWhy  : 'Gemini(Google AI)는 Core Web Vitals와 E-E-A-T 신호를 강하게 반영합니다.',
    weakHow  : 'PageSpeed Insights로 LCP·CLS 개선 / 저자 프로필·수상 이력·외부 인용 배지 추가를 권장합니다.',
  },
  naver: {
    weakTitle: '네이버 AI 인용 낮음 — 국내 플랫폼 신호 확보 필요',
    weakWhy  : '네이버 HyperCLOVA X는 네이버 생태계(블로그·카페·지식iN·플레이스)와 국내 언론 데이터를 강하게 반영합니다. 글로벌 SEO만으로는 인용되지 않습니다.',
    weakHow  : '① 네이버 서치어드바이저에 사이트 등록·사이트맵 제출 ② 네이버 블로그 공식 계정 운영(주 1회 이상) ③ 네이버 플레이스/스마트스토어 등록 ④ 국내 언론 보도자료 배포(뉴스와이어 등) ⑤ 지식iN 업계 질문에 전문가 답변',
  },
}

function generateActions(run: GeoMonitoringRun): ActionItem[] {
  const actions: ActionItem[] = []
  const rate    = run.overallCitationRate
  const engines = Object.keys(run.citationRates) as GeoEngine[]

  // ── 전체 인용률 기반 ───────────────────────────────────────────
  if (rate === 0) {
    actions.push({
      id      : 'zero-rate',
      priority: 'critical',
      icon    : '🚨',
      title   : '인용률 0% — 브랜드 엔티티가 AI에 인식되지 않음',
      why     : 'AI가 이 브랜드/도메인을 전혀 언급하지 않고 있습니다. 가장 기본적인 신호가 없는 상태입니다.',
      how     : '① Organization JSON-LD 스키마 추가 ② 위키백과·나무위키에 브랜드 등재 시도 ③ Google Business Profile 등록 ④ 업계 디렉토리(G2, Product Hunt 등)에 등록',
      impact  : '조치 후 2~4주 내 인식률 개선 기대',
    })
  } else if (rate < 20) {
    actions.push({
      id      : 'low-rate',
      priority: 'critical',
      icon    : '📉',
      title   : '인용률 20% 미만 — E-E-A-T 신호 전면 강화 필요',
      why     : 'AI는 신뢰 신호(저자 전문성·외부 인용·기관 언급)가 있는 사이트를 우선 인용합니다.',
      how     : '① About 페이지에 팀 프로필·전문 자격 추가 ② 업계 매체에 인터뷰 또는 기고 ③ sameAs 속성으로 외부 프로필(LinkedIn, Crunchbase) 연결',
      impact  : '3개월 내 20~35% 인용률 달성 가능',
    })
  } else if (rate < 40) {
    actions.push({
      id      : 'mid-rate',
      priority: 'high',
      icon    : '📊',
      title   : '인용률 성장 단계 — 구조화 데이터로 도약 가능',
      why     : `현재 ${rate}%는 AI가 인식하기 시작한 단계입니다. 구조화 마크업으로 신뢰도를 명시적으로 높이면 빠르게 도약합니다.`,
      how     : '① FAQPage / HowTo / Article JSON-LD 추가 ② 핵심 수치·통계를 표(Table 태그)로 정리 ③ 인용 가능한 원문 데이터·연구 결과 페이지 신설',
      impact  : '2개월 내 40~55% 달성 가능',
    })
  } else if (rate < 60) {
    actions.push({
      id      : 'good-rate',
      priority: 'medium',
      icon    : '✅',
      title   : '인용률 양호 — 경쟁 키워드 확장으로 점유율 확대',
      why     : `${rate}%는 AI가 꾸준히 인용하는 수준입니다. 이제는 더 많은 쿼리 유형을 커버해야 합니다.`,
      how     : '① 업계 일반·비교 질의(경쟁사 대비)로 GEO 질의 확장 ② 롱테일 키워드 페이지 신설 ③ 경쟁사가 인용되는 쿼리 분석 후 콘텐츠 보강',
      impact  : '60%+ 달성 시 업계 AI 인용 선도 포지션',
    })
  } else {
    actions.push({
      id      : 'high-rate',
      priority: 'low',
      icon    : '🏆',
      title   : `인용률 우수 (${rate}%) — 유지·방어 전략으로 전환`,
      why     : '높은 인용률을 유지하려면 콘텐츠 신선도와 신뢰 신호를 지속 관리해야 합니다.',
      how     : '① 월 1회 핵심 페이지 업데이트(날짜·수치 갱신) ② 경쟁사 동향 모니터링 ③ 신규 AI 엔진(Grok, Copilot 등) 대응 준비',
      impact  : '업계 AI 인용 리더십 유지',
    })
  }

  // ── 엔진별 약점 분석 ────────────────────────────────────────────
  const sortedEngines = [...engines].sort(
    (a, b) => (run.citationRates[a] ?? 0) - (run.citationRates[b] ?? 0)
  )
  const weakEngines = sortedEngines.filter(e => (run.citationRates[e] ?? 0) < 30)

  for (const engine of weakEngines.slice(0, 2)) {
    const adv = ENGINE_ADVICE[engine]
    actions.push({
      id      : `engine-${engine}`,
      priority: (run.citationRates[engine] ?? 0) === 0 ? 'high' : 'medium',
      icon    :
        engine === 'perplexity' ? '🔵' :
        engine === 'chatgpt'    ? '🟢' :
        engine === 'claude'     ? '🟣' :
        engine === 'naver'      ? '🇰🇷' : '🔷',
      title   : adv.weakTitle,
      why     : adv.weakWhy,
      how     : adv.weakHow,
      engine,
      impact  : `${engine} 인용률 +20~30%p 기대`,
    })
  }

  // ── 경쟁사 분석 ────────────────────────────────────────────────
  const allCompetitors = Array.from(new Set(
    (run.aggregated ?? []).flatMap(r => r.competitorMentions ?? [])
  ))
  if (allCompetitors.length > 0) {
    const topCompetitor = allCompetitors[0]
    actions.push({
      id      : 'competitor-gap',
      priority: 'medium',
      icon    : '🎯',
      title   : `경쟁 도메인 분석 — ${topCompetitor} 대응 콘텐츠 필요`,
      why     : `AI가 우리 대신 ${allCompetitors.slice(0,3).join(', ')}을 더 자주 인용하고 있습니다.`,
      how     : `① ${topCompetitor}이 다루는 주제를 분석해 더 깊은 콘텐츠 작성 ② 비교 페이지("우리 vs ${topCompetitor}") 신설 ③ 그들이 약한 영역(예: 한국어 최적화)에 집중`,
      impact  : '해당 쿼리에서 경쟁사 대신 인용될 확률 ↑',
    })
  }

  // ── 반복 실행 횟수 관련 ─────────────────────────────────────────
  if (run.repeatCount === 1) {
    actions.push({
      id      : 'repeat-suggest',
      priority: 'low',
      icon    : '🔄',
      title   : '3회 반복 측정으로 통계 신뢰도 향상 권장',
      why     : 'LLM은 같은 질의에도 30%씩 다른 답변을 생성합니다. 단발 측정은 운에 의한 오차가 큽니다.',
      how     : '"반복 실행 횟수"를 3회로 설정 후 재측정하세요. 같은 API 비용으로 훨씬 신뢰도 높은 데이터를 얻을 수 있습니다.',
      impact  : '신뢰구간 ±30% → ±15%로 개선',
    })
  }

  // 우선순위 정렬
  const order: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return actions.sort((a, b) => order[a.priority] - order[b.priority])
}

// ── 우선순위 스타일 ───────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<Priority, { border: string; bg: string; badge: string; badgeText: string; badgeLabel: string }> = {
  critical: { border: 'border-rose-200',   bg: 'bg-rose-50',   badge: 'bg-rose-100',   badgeText: 'text-rose-700',   badgeLabel: '즉시' },
  high    : { border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100', badgeText: 'text-orange-700', badgeLabel: '높음' },
  medium  : { border: 'border-amber-200',  bg: 'bg-amber-50',  badge: 'bg-amber-100',  badgeText: 'text-amber-700',  badgeLabel: '중간' },
  low     : { border: 'border-slate-200',  bg: 'bg-white',     badge: 'bg-slate-100',  badgeText: 'text-slate-600',  badgeLabel: '참고' },
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export function GeoActionPanel({ run }: { run: GeoMonitoringRun }) {
  const actions = generateActions(run)
  const criticalCount = actions.filter(a => a.priority === 'critical').length
  const highCount     = actions.filter(a => a.priority === 'high').length

  return (
    <div className="glass-card overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50">
          <Lightbulb className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="text-sm font-bold text-[#1b2559]">GEO 개선 액션 플랜</div>
          <div className="text-[11px] text-[#737c9c]">
            인용률 분석 기반 우선순위별 실행 가이드
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="w-2.5 h-2.5" /> {criticalCount}개 즉시
            </span>
          )}
          {highCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              <TrendingUp className="w-2.5 h-2.5" /> {highCount}개 높음
            </span>
          )}
        </div>
      </div>

      {/* 액션 목록 */}
      <div className="divide-y divide-slate-100">
        {actions.map((action) => {
          const s = PRIORITY_STYLE[action.priority]
          return (
            <div key={action.id} className={`p-4 ${s.bg} border-l-2 ${s.border}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[13px] font-bold text-[#1b2559]">{action.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.badge} ${s.badgeText}`}>
                      {s.badgeLabel}
                    </span>
                  </div>

                  {/* 왜 문제인가 */}
                  <p className="text-[11px] text-[#737c9c] mb-2 leading-relaxed">{action.why}</p>

                  {/* 어떻게 고치나 */}
                  <div className="rounded-lg bg-white border border-slate-100 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowRight className="w-3 h-3 text-[#4f6df5] shrink-0" />
                      <span className="text-[10px] font-bold text-[#4f6df5] uppercase tracking-wide">실행 방법</span>
                    </div>
                    <p className="text-[11px] text-[#1b2559] leading-relaxed whitespace-pre-line">{action.how}</p>
                  </div>

                  {/* 예상 효과 */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-[10px] text-emerald-700 font-medium">{action.impact}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 푸터 */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-[#737c9c]">
          ※ 개선 후 GEO 재측정으로 효과를 검증하세요. 인용률은 콘텐츠 변경 후 2~6주 내 반영됩니다.
        </p>
      </div>
    </div>
  )
}
