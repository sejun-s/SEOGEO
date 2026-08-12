import React, { useState } from 'react'
import type { AuditResult, ShopifySignals } from '../types'
import {
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  ShoppingBag, Bot, BookOpen, HelpCircle, Globe, Shield,
} from 'lucide-react'

// ── 상태 아이콘 ──────────────────────────────────────────────────────────────

type CheckStatus = 'pass' | 'fail' | 'warn'

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
  if (status === 'warn') return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
  return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
}

function botLabel(status: ShopifySignals['oaiSearchBotStatus']): { text: string; ck: CheckStatus } {
  switch (status) {
    case 'explicitly_allowed':    return { text: '명시적 허용', ck: 'pass' }
    case 'allowed_by_general_rule': return { text: '기본 규칙 허용', ck: 'pass' }
    case 'explicitly_blocked':    return { text: '차단됨', ck: 'fail' }
    default:                      return { text: '미명시 (허용)', ck: 'warn' }
  }
}

// ── 섹션 ─────────────────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-2 pl-1">{children}</div>
    </div>
  )
}

// ── 체크 행 ──────────────────────────────────────────────────────────────────

interface CheckRowProps {
  status: CheckStatus
  label: string
  statusText: string
  detail?: string
  tip?: string
}

function CheckRow({ status, label, statusText, detail, tip }: CheckRowProps) {
  const [open, setOpen] = useState(false)
  const hasDetail = !!(detail || tip)

  return (
    <div
      className={`shopify-check-row rounded-xl border px-3.5 py-2.5 transition-all ${
        status === 'pass'
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : status === 'warn'
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-rose-500/20 bg-rose-500/5'
      } ${hasDetail ? 'cursor-pointer' : ''}`}
      onClick={hasDetail ? () => setOpen(o => !o) : undefined}
    >
      <div className="flex items-center gap-2.5">
        <StatusIcon status={status} />
        <span className="text-xs font-medium text-slate-200 flex-1">{label}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
          status === 'pass'
            ? 'text-emerald-400 bg-emerald-500/10'
            : status === 'warn'
            ? 'text-amber-400 bg-amber-500/10'
            : 'text-rose-400 bg-rose-500/10'
        }`}>
          {statusText}
        </span>
        {hasDetail && (
          open
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        )}
      </div>

      {open && (detail || tip) && (
        <div className="mt-2.5 pl-6 space-y-1.5 animate-fadeIn">
          {detail && (
            <p className="text-[11px] text-slate-400 leading-relaxed">{detail}</p>
          )}
          {tip && (
            <p className="text-[11px] text-purple-300 leading-relaxed">
              💡 {tip}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── 점수 바 ──────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
  const textColor = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400'
  const label = score >= 70 ? '양호' : score >= 40 ? '개선 필요' : '위험'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-baseline gap-1.5 shrink-0">
        <span className={`text-2xl font-black font-mono ${textColor}`}>{score}</span>
        <span className="text-xs text-slate-500">/100</span>
        <span className={`text-[10px] font-bold ${textColor}`}>{label}</span>
      </div>
    </div>
  )
}

// ── 메인 패널 ─────────────────────────────────────────────────────────────────

interface ShopifyPanelProps {
  audit: AuditResult
}

export function ShopifyPanel({ audit }: ShopifyPanelProps) {
  const s = audit.pageSignals?.shopify
  if (!s) return null

  const oai = botLabel(s.oaiSearchBotStatus)
  const gpt = botLabel(s.gptBotStatus)

  return (
    <div className="glass-card p-5 space-y-5">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white">Shopify AI 노출 체크리스트</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
              Shopify 감지됨
            </span>
            {s.reviewAppDetected && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-semibold">
                {s.reviewAppDetected}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            GPT Search · Perplexity · Google AI Overviews 노출 준비도
          </p>
        </div>
      </div>

      {/* 종합 점수 */}
      <div className="space-y-2">
        <span className="text-[11px] text-slate-500 font-medium">Shopify AI 가시성 점수</span>
        <ScoreBar score={s.shopifyAiScore} />
        {/* 점수 breakdown 작은 뱃지 */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {s.scoreBreakdown.map((b) => (
            <span
              key={b.label}
              title={`${b.label}: ${b.earned}/${b.max}점`}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                b.pass
                  ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400'
                  : 'border-rose-500/25 bg-rose-500/8 text-rose-400'
              }`}
            >
              {b.pass ? '✓' : '✗'} {b.label}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-white/8" />

      {/* ─ AI 크롤러 접근 ─ */}
      <Section icon={<Bot className="w-3.5 h-3.5" />} title="AI 크롤러 접근">
        <CheckRow
          status={oai.ck}
          label="OAI-SearchBot (ChatGPT Search)"
          statusText={oai.text}
          detail="ChatGPT Search가 스토어를 수집·인용하려면 OAI-SearchBot을 허용해야 합니다."
          tip={oai.ck === 'fail'
            ? 'robots.txt에서 OAI-SearchBot Disallow 규칙을 제거하거나 Allow: /를 추가하세요.'
            : oai.ck === 'warn'
            ? 'robots.txt에 User-agent: OAI-SearchBot / Allow: / 를 명시적으로 추가하면 더 안정적입니다.'
            : undefined}
        />
        <CheckRow
          status={gpt.ck}
          label="GPTBot (ChatGPT 학습·크롤링)"
          statusText={gpt.text}
          detail="OpenAI의 GPTBot은 ChatGPT 답변 품질 개선에 사용됩니다. 차단하면 GPT 인용에서 불리할 수 있습니다."
          tip={gpt.ck === 'fail'
            ? 'robots.txt에서 GPTBot Disallow 규칙을 제거하세요.'
            : undefined}
        />
      </Section>

      {/* ─ 상품 스키마 ─ */}
      <Section icon={<ShoppingBag className="w-3.5 h-3.5" />} title="상품 Schema.org 마크업">
        <CheckRow
          status={s.hasProductSchema ? 'pass' : 'fail'}
          label="Product JSON-LD 스키마"
          statusText={s.hasProductSchema ? '있음' : '없음'}
          detail="AI가 상품명·설명·카테고리를 구조화 데이터로 읽습니다. 홈페이지가 아닌 상품 페이지에 있어야 합니다."
          tip={!s.hasProductSchema
            ? 'Shopify 테마 product.liquid에 @type:Product JSON-LD를 추가하거나 Schema App을 설치하세요.'
            : undefined}
        />
        <CheckRow
          status={s.hasOfferSchema ? 'pass' : 'fail'}
          label="Offer.price 스키마 (가격 구조화)"
          statusText={s.hasOfferSchema ? '있음' : '없음'}
          detail="AI가 가격·재고 상태(InStock/OutOfStock)를 직접 읽어 검색 결과에 표시합니다."
          tip={!s.hasOfferSchema
            ? 'Product 스키마 안에 "offers": { "@type": "Offer", "price": "...", "availability": "..." }를 포함하세요.'
            : undefined}
        />
        <CheckRow
          status={s.hasAggregateRating ? 'pass' : 'fail'}
          label="AggregateRating (리뷰 평점 스키마)"
          statusText={s.hasAggregateRating ? '있음' : '없음'}
          detail="평점이 있는 상품이 AI 검색에서 인용될 확률이 2-3배 높습니다. Judge.me·Okendo 등 앱이 자동 생성합니다."
          tip={!s.hasAggregateRating
            ? `${s.reviewAppDetected ? `${s.reviewAppDetected}가 감지되었지만 스키마가 없습니다. 앱 설정에서 Schema 출력을 확인하세요.` : 'Judge.me(무료) 또는 Okendo를 설치하면 리뷰 스키마가 자동 생성됩니다.'}`
            : undefined}
        />
        <CheckRow
          status={s.hasFaqSchema ? 'pass' : 'warn'}
          label="FAQPage 스키마"
          statusText={s.hasFaqSchema ? '있음' : '권장'}
          detail="제품 FAQ를 FAQPage 스키마로 마크업하면 AI가 질문-답변 쌍을 직접 인용합니다."
          tip={!s.hasFaqSchema
            ? '상품 페이지 또는 /pages/faq에 @type:FAQPage JSON-LD를 추가하세요. Shopify에서 직접 Liquid 코드로 삽입 가능합니다.'
            : undefined}
        />
        {(s.hasBreadcrumbSchema || s.hasOrganizationSchema) && (
          <CheckRow
            status="pass"
            label={`추가 스키마: ${[s.hasBreadcrumbSchema && 'BreadcrumbList', s.hasOrganizationSchema && 'Organization'].filter(Boolean).join(', ')}`}
            statusText="있음"
          />
        )}
      </Section>

      {/* ─ 콘텐츠 & 브랜드 ─ */}
      <Section icon={<BookOpen className="w-3.5 h-3.5" />} title="콘텐츠 & 브랜드 신호">
        <CheckRow
          status={s.hasBlogSection ? 'pass' : 'fail'}
          label="블로그 섹션 (/blogs/)"
          statusText={s.hasBlogSection ? '활성화' : '없음'}
          detail="구매 가이드·비교 글·사용 후기 등 AI가 가장 많이 인용하는 콘텐츠 유형입니다."
          tip={!s.hasBlogSection
            ? 'Shopify 관리자 → 온라인 스토어 → 블로그 게시물에서 블로그를 활성화하고 /blogs/ 경로를 네비게이션에 추가하세요.'
            : undefined}
        />
        <CheckRow
          status={s.hasAboutPage ? 'pass' : 'warn'}
          label="브랜드 About 페이지"
          statusText={s.hasAboutPage ? '있음' : '권장'}
          detail="E-E-A-T 신호 — 설립 연도·창업자 스토리·미디어 언급을 포함하면 AI 인용 신뢰도가 높아집니다."
          tip={!s.hasAboutPage
            ? 'Shopify 관리자 → 온라인 스토어 → 페이지에서 "about-us" 핸들의 페이지를 만들고 네비게이션에 추가하세요.'
            : undefined}
        />
        <CheckRow
          status={s.hasContactPage ? 'pass' : 'warn'}
          label="Contact 페이지"
          statusText={s.hasContactPage ? '있음' : '권장'}
          detail="연락처 정보는 브랜드 신뢰도 신호로 E-E-A-T에 긍정적 영향을 줍니다."
        />
        <CheckRow
          status={s.reviewAppDetected ? 'pass' : 'warn'}
          label="리뷰 앱"
          statusText={s.reviewAppDetected ?? '미감지'}
          detail={s.reviewAppDetected
            ? `${s.reviewAppDetected}가 감지되었습니다. AggregateRating 스키마 출력 여부를 위에서 확인하세요.`
            : 'Judge.me(무료)·Okendo·Yotpo 중 하나를 설치하면 리뷰 수집과 스키마 자동 생성이 됩니다.'}
          tip={!s.reviewAppDetected
            ? 'Judge.me 무료 플랜은 리뷰 수 제한 없이 AggregateRating 스키마를 자동으로 삽입합니다.'
            : undefined}
        />
      </Section>

      {/* ─ 기술 신호 ─ */}
      <Section icon={<Globe className="w-3.5 h-3.5" />} title="기술 신호">
        <CheckRow
          status={s.hasIndexNow ? 'pass' : 'warn'}
          label="IndexNow (Bing/Yandex 실시간 색인)"
          statusText={s.hasIndexNow ? '있음' : '권장'}
          detail="상품 등록·수정 시 Bing Copilot에 즉시 통보해 AI 검색 반영 속도를 높입니다."
          tip={!s.hasIndexNow
            ? 'Shopify 파트너 앱 스토어에서 IndexNow 앱을 검색하거나 Bing Webmaster Tools에서 직접 연동하세요.'
            : undefined}
        />
      </Section>

      {/* ─ 다음 액션 요약 ─ */}
      {s.shopifyAiScore < 100 && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] font-semibold text-purple-300">우선 해결 순서</span>
          </div>
          <ol className="text-[11px] text-slate-400 leading-relaxed space-y-1 list-decimal list-inside">
            {!s.hasProductSchema && <li>상품 페이지에 Product + Offer JSON-LD 추가 <span className="text-rose-400">(+35점)</span></li>}
            {!s.hasAggregateRating && <li>리뷰 앱 설치 → AggregateRating 스키마 활성화 <span className="text-amber-400">(+15점)</span></li>}
            {!s.hasBlogSection && <li>블로그 섹션 활성화 + 구매 가이드 1편 작성 <span className="text-amber-400">(+10점)</span></li>}
            {!s.hasFaqSchema && <li>상품 FAQ 섹션에 FAQPage 스키마 추가 <span className="text-amber-400">(+10점)</span></li>}
            {!s.hasAboutPage && <li>브랜드 About 페이지 작성 (설립 스토리 포함) <span className="text-slate-500">(+10점)</span></li>}
            {s.oaiSearchBotStatus === 'explicitly_blocked' && <li>robots.txt에서 OAI-SearchBot 차단 해제 <span className="text-rose-400">(+20점)</span></li>}
          </ol>
        </div>
      )}

      {s.shopifyAiScore >= 100 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">Shopify AI 가시성 최적화 완료</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            모든 핵심 항목이 설정되어 있습니다. 다음 단계로 hreflang 다국어 설정과 IndexNow를 검토하세요.
          </p>
        </div>
      )}
    </div>
  )
}
