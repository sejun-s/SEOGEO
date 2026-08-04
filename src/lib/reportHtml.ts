import type { AuditResult, CriteriaItem } from '../types'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const CATEGORY_META = [
  ['technicalScore', 'Technical SEO'],
  ['chatGptSearchScore', 'ChatGPT Search'],
  ['academicGeoScore', 'GEO'],
  ['eeatScore', 'E-E-A-T'],
  ['schemaScore', 'Schema.org'],
  ['bingScore', 'Bing / AEO'],
] as const

function statusColor(score: number) {
  return score >= 80 ? '#16a085' : score >= 60 ? '#c88716' : '#dd5b67'
}

function priorityLabel(priority: CriteriaItem['priority']) {
  return { critical: '즉시 수정', high: '중요', medium: '권장', low: '참고' }[priority]
}

export function buildReportHtml(audit: AuditResult): string {
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 }
  const issues = (audit.criteria ?? [])
    .filter(item => item.status !== 'pass')
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.estimatedScoreGain - a.estimatedScoreGain)
  const strengths = (audit.criteria ?? []).filter(item => item.status === 'pass').slice(0, 6)
  const categories = CATEGORY_META.map(([key, label]) => ({ label, score: audit[key] as number }))
  const crawl = audit.siteCrawl
  const generatedAt = new Date().toLocaleString('ko-KR')

  const categoryHtml = categories.map(item => `<div class="score-row"><div><b>${escapeHtml(item.label)}</b><span>${item.score}점</span></div><div class="bar"><i style="width:${item.score}%;background:${statusColor(item.score)}"></i></div></div>`).join('')
  const issueHtml = issues.length ? issues.map((item, index) => `<article class="issue"><div class="issue-no">${index + 1}</div><div><div class="issue-head"><strong>${escapeHtml(item.name)}</strong><span>${priorityLabel(item.priority)} · 예상 +${item.estimatedScoreGain}점</span></div><p><b>현재 상태</b>${escapeHtml(item.currentState)}</p><p><b>해결 방법</b>${escapeHtml(item.improvement).replace(/\n/g, '<br>')}</p>${item.codeSnippet ? `<pre>${escapeHtml(item.codeSnippet)}</pre>` : ''}<small>검증 기준: ${escapeHtml(item.evaluationCriteria)}</small></div></article>`).join('') : '<div class="empty">주요 개선 항목이 없습니다.</div>'
  const strengthHtml = strengths.map(item => `<li><span>✓</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.currentState)}</small></div></li>`).join('')
  const crawlHtml = crawl ? `<div class="crawl-grid"><div><span>Health Score</span><b>${crawl.healthScore}</b></div><div><span>분석 페이지</span><b>${crawl.scannedPages}</b></div><div><span>정상 페이지</span><b>${crawl.healthyPages}</b></div><div><span>발견 URL</span><b>${crawl.discoveredUrls}</b></div></div><p class="note">점수 모델 ${escapeHtml(crawl.scoreModelVersion)} · robots.txt 제외 ${crawl.blockedByRobots}개 · 최대 ${crawl.limits.maxPages}페이지</p>` : '<div class="empty">사이트 전체 크롤링 데이터가 없습니다.</div>'

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(audit.title)} SEO·GEO 보고서</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}body{margin:0;background:#eef2fa;color:#1b2559;font-family:Manrope,'Noto Sans KR',sans-serif}.toolbar{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;padding:12px 24px;background:rgba(238,242,250,.9);backdrop-filter:blur(12px)}.toolbar button{border:0;border-radius:999px;background:#4f6df5;color:white;padding:10px 18px;font-weight:700;cursor:pointer}.report{width:min(980px,calc(100% - 32px));margin:0 auto 48px;background:white;border-radius:30px 30px 30px 12px;box-shadow:0 24px 70px rgba(44,57,126,.14);overflow:hidden}.cover{padding:52px;background:linear-gradient(145deg,#4f74f5,#354fce);color:white;position:relative}.cover:after{content:'';position:absolute;width:280px;height:280px;right:-100px;bottom:-160px;border-radius:62% 38% 44% 56%;background:rgba(255,255,255,.1)}.cover small{letter-spacing:.16em;font-weight:800}.cover h1{font-size:34px;line-height:1.3;margin:22px 0 8px;max-width:720px}.cover p{margin:0;opacity:.75}.cover .meta{display:flex;gap:20px;margin-top:46px;font-size:12px}.section{padding:34px 42px;border-bottom:1px solid #e7ebf5}.section h2{font-size:20px;margin:0 0 20px}.summary{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:14px}.hero-score,.summary-card{padding:22px;border-radius:22px 22px 22px 8px;background:#f2f5ff;border:1px solid #e0e6fa}.hero-score.ai{background:#fff3ee;border-color:#f4dfd7}.hero-score span,.summary-card span{font-size:11px;color:#727d9c}.hero-score b{display:block;font-size:46px;margin-top:16px;color:#4f6df5}.hero-score b small{font-size:12px;color:#9ba4bb}.score-row{margin-bottom:13px}.score-row>div:first-child{display:flex;justify-content:space-between;font-size:11px}.bar{height:7px;background:#edf0f6;border-radius:99px;margin-top:7px;overflow:hidden}.bar i{display:block;height:100%;border-radius:inherit}.issue{display:grid;grid-template-columns:38px 1fr;gap:14px;padding:20px 0;border-top:1px solid #edf0f6}.issue:first-of-type{border-top:0}.issue-no{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#eef3ff;color:#4f6df5;font-weight:800}.issue-head{display:flex;justify-content:space-between;gap:12px}.issue-head span{font-size:10px;color:#dd5b67;background:#fff0f2;padding:5px 8px;border-radius:99px}.issue p{font-size:12px;line-height:1.65;color:#606b88}.issue p b{display:block;color:#1b2559;margin-bottom:3px}.issue pre{white-space:pre-wrap;background:#18203f;color:#e7ecff;padding:16px;border-radius:12px;font-size:10px;overflow:auto}.issue small,.note{color:#8a94ab;font-size:10px}.strengths{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0;list-style:none}.strengths li{display:flex;gap:10px;padding:13px;background:#f4fbf8;border-radius:12px}.strengths li>span{color:#16a085;font-weight:800}.strengths b,.strengths small{display:block;font-size:11px}.strengths small{color:#7d879e;margin-top:3px}.crawl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.crawl-grid div{padding:18px;border-radius:16px;background:#f7f9fc}.crawl-grid span,.crawl-grid b{display:block}.crawl-grid span{font-size:10px;color:#7d879e}.crawl-grid b{font-size:25px;margin-top:7px}.empty{padding:24px;background:#f7f9fc;border-radius:14px;color:#7d879e;font-size:12px}.footer{padding:24px 42px;color:#8a94ab;font-size:10px;line-height:1.6}
@media(max-width:700px){.cover,.section{padding:26px}.cover h1{font-size:25px}.summary{grid-template-columns:1fr}.crawl-grid{grid-template-columns:1fr 1fr}.strengths{grid-template-columns:1fr}.issue-head{display:block}.issue-head span{display:inline-block;margin-top:7px}}
@media print{body{background:white}.toolbar{display:none}.report{width:100%;margin:0;box-shadow:none;border-radius:0}.cover{break-after:page}.issue{break-inside:avoid}.section{break-inside:avoid}}
</style></head><body><div class="toolbar"><button onclick="window.print()">PDF로 인쇄</button></div><main class="report">
<section class="cover"><small>SEOGEO · v0.4 REPORT</small><h1>${escapeHtml(audit.title)}</h1><p>${escapeHtml(audit.url)}</p><div class="meta"><span>분석일 ${escapeHtml(audit.lastScanned)}</span><span>보고서 생성 ${generatedAt}</span><span>점수 모델 ${escapeHtml(audit.scoreModelVersion ?? 'v0.3')}</span></div></section>
<section class="section"><h2>핵심 요약</h2><div class="summary"><div class="hero-score"><span>SEO 기반 점수</span><b>${audit.seoFoundationScore ?? audit.overallScore}<small>/100</small></b></div><div class="hero-score ai"><span>AI 인용 준비도</span><b>${audit.aiCitationReadinessScore ?? audit.academicGeoScore}<small>/100</small></b></div><div class="summary-card"><span>영역별 점수</span>${categoryHtml}</div></div></section>
<section class="section"><h2>우선 개선 과제</h2>${issueHtml}</section>
<section class="section"><h2>현재 강점</h2><ul class="strengths">${strengthHtml || '<li>확인된 강점이 없습니다.</li>'}</ul></section>
<section class="section"><h2>사이트 전체 진단</h2>${crawlHtml}</section>
<section class="footer">본 보고서의 점수는 Google 또는 AI 서비스의 공식 순위 점수가 아닙니다. 공개된 지침, 웹 표준과 현재 확인 가능한 데이터를 기반으로 개선 우선순위를 제안합니다. 실제 검색 성과는 경쟁 환경과 검색 수요에 따라 달라질 수 있습니다.</section>
</main></body></html>`
}

export function reportFileName(audit: AuditResult) {
  const host = new URL(audit.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '-')
  return `SEOGEO-${host}-${new Date().toISOString().slice(0, 10)}.html`
}
