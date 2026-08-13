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
  ['naverScore', 'Naver'],
] as const

function statusColor(score: number) {
  return score >= 80 ? '#16a085' : score >= 60 ? '#c88716' : '#dd5b67'
}

function priorityLabel(priority: CriteriaItem['priority']) {
  return { critical: '즉시 수정', high: '중요', medium: '권장', low: '참고' }[priority]
}

export function buildReportHtml(audit: AuditResult, options: { showToolbar?: boolean } = {}): string {
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 }
  const issues = (audit.criteria ?? [])
    .filter(item => item.status !== 'pass')
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.estimatedScoreGain - a.estimatedScoreGain)
  const strengths = (audit.criteria ?? []).filter(item => item.status === 'pass').slice(0, 6)
  const categories = CATEGORY_META.flatMap(([key, label]) => {
    const score = audit[key] as number | undefined
    return typeof score === 'number' ? [{ label, score }] : []
  })
  const crawl = audit.siteCrawl
  const generatedAt = new Date().toLocaleString('ko-KR')
  const naverScore = typeof audit.naverScore === 'number' ? `${audit.naverScore}<small>/100</small>` : '<em>미측정</em>'

  const categoryHtml = categories.map(item => `<div class="score-row"><div><b>${escapeHtml(item.label)}</b><span>${item.score}점</span></div><div class="bar"><i style="width:${item.score}%;background:${statusColor(item.score)}"></i></div></div>`).join('')
  const issueHtml = issues.length ? issues.map((item, index) => `<article class="issue"><div class="issue-no">${index + 1}</div><div><div class="issue-head"><strong>${escapeHtml(item.name)}</strong><span>${priorityLabel(item.priority)} · 영향도 ${item.priority === 'critical' || item.priority === 'high' ? '높음' : item.priority === 'medium' ? '중간' : '낮음'}</span></div><p><b>현재 상태</b>${escapeHtml(item.currentState)}</p><p><b>해결 방법</b>${escapeHtml(item.improvement).replace(/\n/g, '<br>')}</p>${item.codeSnippet ? `<pre>${escapeHtml(item.codeSnippet)}</pre>` : ''}<small>검증 기준: ${escapeHtml(item.evaluationCriteria)} · 실제 점수는 재검사 후 산정</small></div></article>`).join('') : '<div class="empty">주요 개선 항목이 없습니다.</div>'
  const strengthHtml = strengths.map(item => `<li><span>✓</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.currentState)}</small></div></li>`).join('')
  const crawlHtml = crawl ? `<div class="crawl-grid"><div><span>Health Score</span><b>${crawl.healthScore}</b></div><div><span>분석 페이지</span><b>${crawl.scannedPages}</b></div><div><span>정상 페이지</span><b>${crawl.healthyPages}</b></div><div><span>발견 URL</span><b>${crawl.discoveredUrls}</b></div></div><p class="note">점수 모델 ${escapeHtml(crawl.scoreModelVersion)} · robots.txt 제외 ${crawl.blockedByRobots}개 · 최대 ${crawl.limits.maxPages}페이지</p>` : '<div class="empty">사이트 전체 크롤링 데이터가 없습니다.</div>'

  const toolbarHtml = options.showToolbar === false ? '' : '<div class="toolbar"><button onclick="window.print()">PDF로 인쇄</button></div>'

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(audit.title)} SEO·GEO 보고서</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#17213f;font-family:Manrope,'Noto Sans KR',sans-serif}.toolbar{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;padding:12px 24px;background:#fff;border-bottom:1px solid #e5e8ef}.toolbar button{border:0;border-radius:8px;background:#3157d5;color:white;padding:10px 16px;font-weight:700;cursor:pointer}.report{width:min(1040px,calc(100% - 32px));margin:24px auto 48px;background:#fff;border:1px solid #e2e6ee;border-radius:12px;box-shadow:0 12px 36px rgba(28,39,76,.08);overflow:hidden}.cover{padding:42px 48px 34px;background:#fff;color:#17213f;border-top:7px solid #3157d5;border-bottom:1px solid #e5e8ef}.cover:after{display:none}.cover small{color:#3157d5;letter-spacing:.14em;font-weight:800}.cover h1{font-size:29px;line-height:1.35;margin:18px 0 7px;max-width:760px}.cover p{margin:0;color:#737d91}.cover .meta{display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:30px;color:#7f899c;font-size:11px}.section{padding:30px 48px;border-bottom:1px solid #e8ebf1}.section h2{font-size:18px;margin:0 0 18px}.summary{display:grid;grid-template-columns:1fr 1fr 1.65fr;gap:12px}.hero-score,.summary-card{padding:20px;border-radius:9px;background:#f7f8fb;border:1px solid #e4e7ee}.hero-score.ai{background:#f7f8fb;border-color:#e4e7ee}.hero-score span,.summary-card>span{font-size:10px;color:#727d91;font-weight:600}.hero-score b{display:block;font-size:43px;margin-top:13px;color:#17213f}.hero-score b small{font-size:11px;color:#929aab}.score-row{margin:12px 0}.score-row>div:first-child{display:flex;justify-content:space-between;font-size:10px;color:#465169}.bar{height:5px;background:#e8ebf0;border-radius:99px;margin-top:6px;overflow:hidden}.bar i{display:block;height:100%;border-radius:inherit}.issue{display:grid;grid-template-columns:32px 1fr;gap:14px;padding:21px 0;border-top:1px solid #e8ebf1}.issue:first-of-type{border-top:0}.issue-no{width:30px;height:30px;display:grid;place-items:center;border-radius:6px;background:#edf1ff;color:#3157d5;font-size:12px;font-weight:800}.issue-head{display:flex;justify-content:space-between;gap:12px}.issue-head span{font-size:9px;color:#59647b;background:#f1f3f7;padding:5px 8px;border-radius:5px}.issue p{font-size:11px;line-height:1.7;color:#626d82}.issue p b{display:block;color:#17213f;margin-bottom:2px}.issue pre{white-space:pre-wrap;background:#1c2745;color:#edf1ff;padding:15px;border-radius:7px;font-size:10px;overflow:auto}.issue small,.note{color:#8a93a5;font-size:9px}.strengths{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0;list-style:none}.strengths li{display:flex;gap:9px;padding:12px;border:1px solid #e5e9ef;border-radius:7px;background:#fff}.strengths li>span{color:#3157d5;font-weight:800}.strengths b,.strengths small{display:block;font-size:10px}.strengths small{color:#7d8798;margin-top:3px}.crawl-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e3e7ee;border-radius:8px;overflow:hidden}.crawl-grid div{padding:17px;background:#fff;border-right:1px solid #e3e7ee}.crawl-grid div:last-child{border:0}.crawl-grid span,.crawl-grid b{display:block}.crawl-grid span{font-size:9px;color:#7d8798}.crawl-grid b{font-size:23px;margin-top:6px}.empty{padding:22px;background:#f7f8fa;border-radius:7px;color:#7d8798;font-size:11px}.footer{padding:22px 48px;color:#8891a3;font-size:9px;line-height:1.65;background:#fafbfc}
.summary{grid-template-columns:repeat(3,1fr)}.summary-card{grid-column:1/-1}.hero-score span,.summary-card>span{color:#59647b;font-weight:700}.hero-score b em{font-size:19px;font-style:normal;color:#59647b}
@media(max-width:700px){.cover,.section{padding:26px}.cover h1{font-size:25px}.summary{grid-template-columns:1fr}.summary-card{grid-column:auto}.crawl-grid{grid-template-columns:1fr 1fr}.strengths{grid-template-columns:1fr}.issue-head{display:block}.issue-head span{display:inline-block;margin-top:7px}}
@media print{body{background:white}.toolbar{display:none}.report{width:100%;margin:0;box-shadow:none;border:0;border-radius:0}.issue{break-inside:avoid}.section{break-inside:avoid}}
</style></head><body>${toolbarHtml}<main class="report">
<section class="cover"><small>SEOGEO · v1.0 WEBSITE READINESS REPORT</small><h1>${escapeHtml(audit.title)}</h1><p>${escapeHtml(audit.url)}</p><div class="meta"><span>분석일 ${escapeHtml(audit.lastScanned)}</span><span>보고서 생성 ${generatedAt}</span><span>점수 모델 ${escapeHtml(audit.scoreModelVersion ?? 'v1.0-r2')}</span></div></section>
<section class="section"><h2>핵심 요약</h2><div class="summary"><div class="hero-score"><span>SEO 기반 품질</span><b>${audit.seoFoundationScore ?? audit.overallScore}<small>/100</small></b></div><div class="hero-score ai"><span>GEO 인용 준비도</span><b>${audit.aiCitationReadinessScore ?? audit.academicGeoScore}<small>/100</small></b></div><div class="hero-score"><span>네이버 노출 기반</span><b>${naverScore}</b></div><div class="summary-card"><span>세부 영역별 점수</span>${categoryHtml}</div></div><p class="note">확인 가능한 공개 웹 신호 기반의 SEOGEO 자체 준비도 지수이며 공식 검색 순위·노출·AI 인용을 보장하지 않습니다. 측정 신뢰도: ${escapeHtml(audit.measurementConfidence ?? 'low')}.</p></section>
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
