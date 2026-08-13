export interface GeoFactorMetric {
  name: string;
  score: number;
  status: 'excellent' | 'moderate' | 'needs_improvement';
  description: string;
  arxivReference: string;
  actionItem: string;
}

export interface BotPermissionPolicy {
  botName: string;
  purpose: string;
  status: 'allowed' | 'blocked' | 'missing';
  impact: string;
  recommendation: string;
}

export interface MetricItem {
  id: string;
  title: string;
  category: 'technical' | 'chatgpt' | 'geo' | 'eeat' | 'schema' | 'bing' | 'naver' | 'analytics';
  status: 'pass' | 'warning' | 'fail';
  score: number;
  scoreBoost: number;
  isResolved?: boolean;
  currentValue: string;
  recommendation: string;
  codeSnippet?: string;
  referenceDoc?: string;
}

export interface ScoreHistoryEntry {
  id: string;
  timestamp: string;
  label: string;
  scoreDelta: number;
  newOverallScore: number;
}

// AI 분석 기준 아이템
export interface CriteriaItem {
  id: string;
  name: string;
  category: 'technical' | 'chatgpt' | 'geo' | 'eeat' | 'schema' | 'bing' | 'naver' | 'analytics';
  score: number;
  status: 'pass' | 'warning' | 'fail';
  weight: '높음' | '중간' | '낮음' | '참고 (SEO 점수 미영향)';
  scoringBasis: string;         // 점수 근거
  evaluationCriteria: string;   // 평가 기준
  currentState: string;         // 현재 상태
  improvement: string;          // 개선 방안
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedScoreGain: number;   // 개선 시 예상 점수 상승
  referenceGuide: string;       // 참고 가이드
  codeSnippet?: string;         // 복붙 가능한 코드
  codeType?: 'html' | 'robots' | 'json'; // 코드 종류
}

// Schema.org 평가 레벨 (v3)
export type SchemaEvaluationLevel =
  | 'not_applicable'
  | 'missing'
  | 'parse_error'
  | 'valid_but_mismatched'
  | 'valid_but_incomplete'
  | 'appropriate_and_consistent'
  | 'validated_for_supported_feature';

// 단일 원천 검사 객체 (Single Source of Truth - RuleResult)
export interface RuleResult {
  ruleId: string;
  ruleVersion: string;
  title: string;
  category: 'technical' | 'chatgpt' | 'geo' | 'eeat' | 'schema' | 'bing' | 'naver' | 'analytics';
  status: 'pass' | 'warning' | 'fail' | 'unknown' | 'not_applicable';
  severity: 'critical' | 'high' | 'medium' | 'low';
  applicable: boolean;
  observedValue: string;
  rawEvidence: string;
  evidenceType: 'official_requirement' | 'official_recommendation' | 'web_standard' | 'research_evidence' | 'product_heuristic';
  sourceUrl?: string;
  scoreEffect: string;
  recommendation: string;
  verificationMethod: string;
  limitations: string;
  codeSnippet?: string;
  codeType?: 'html' | 'robots' | 'json';
}

// Block 4: 설명 가능한 점수 모델 (v2/v3)
export type SearchEligibility = 'pass' | 'warning' | 'fail' | 'unknown'
export type MeasurementConfidence = 'low' | 'medium' | 'high'

export interface SearchEligibilityResult {
  status: SearchEligibility
  checks: Array<{
    id: string
    label: string
    status: 'pass' | 'fail' | 'warning' | 'unknown'
    detail?: string
  }>
}

export interface AuditResult {
  url: string;
  title: string;
  initialScore: number;
  overallScore: number;
  technicalScore: number;
  chatGptSearchScore: number;
  academicGeoScore: number;
  eeatScore: number;
  schemaScore: number;
  bingScore: number;
  naverScore?: number;
  lastScanned: string;

  // v0.7: 이전 스캔 카테고리 점수 (재스캔 시 델타 표시용)
  previousCategoryScores?: {
    overallScore?: number;
    technicalScore?: number;
    chatGptSearchScore?: number;
    academicGeoScore?: number;
    eeatScore?: number;
    schemaScore?: number;
    bingScore?: number;
  };

  // Block 4 & v3: 점수 모델 필드
  scoreModelVersion?: string       // 예: "v0.6-r1"
  legacyScore?: number             // overallScore의 legacy 복사본
  searchEligibility?: SearchEligibilityResult
  seoFoundationScore?: number      // SEO Foundation 독립 점수 (0-100)
  aiCitationReadinessScore?: number // AI Citation Readiness 독립 점수 (0-100)
  measurementConfidence?: MeasurementConfidence
  ruleResults?: RuleResult[]       // 단일 원천 검사 결과 항목 목록
  schemaEvaluationLevel?: SchemaEvaluationLevel

  // 실제 URL에서 추출한 신호 (스트리밍 분석 시 채워짐)
  pageSignals?: PageSignals;
  siteCrawl?: SiteCrawlResult;

  // AI 분석 결과 (새 구조)
  summary?: string;
  criteria?: CriteriaItem[];
  strengthSummary?: string[];
  criticalIssues?: string[];
  quickWins?: string[];

  // 기존 구조 (하위 호환성)
  metrics: MetricItem[];
  botPolicies: BotPermissionPolicy[];
  geoFactors: GeoFactorMetric[];
  scoreHistory: ScoreHistoryEntry[];

  generatedSchemaJson: string;
  optimizedMeta: {
    title: string;
    description: string;
    keywords: string[];
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    canonical: string;
    headings: { level: string; text: string }[];
  };
  eeatAnalysis: {
    authorName?: string;
    sameAsProfiles: string[];
    expertiseSignatures: string[];
    trustSignals: string[];
    originalityAssessment: string;
    improvementSuggestions: string[];
  };
  aeoSimulation: {
    targetQuery: string;
    chatGptSearchSnippet: string;
    googleAiOverviewSnippet: string;
    perplexitySnippet: string;
    citationProbable: boolean;
    citedUrl: string;
    citedAnchorText: string;
    keyFactExtractor: string[];
  };
}

export interface PresetSite {
  id: string;
  name: string;
  type: string;
  url: string;
  audit: AuditResult;
}

export type DetailTabType = 'technical' | 'chatgpt' | 'geo' | 'schema' | 'eeat' | 'cms';

// ─── Shopify AI 가시성 신호 ─────────────────────────────────────────────────
export interface ShopifySignals {
  isShopify: true;

  // ── AI 크롤러 접근 ──────────────────────────────────────────────────────────
  oaiSearchBotStatus: 'explicitly_allowed' | 'allowed_by_general_rule' | 'explicitly_blocked' | 'unknown';
  gptBotStatus:       'explicitly_allowed' | 'allowed_by_general_rule' | 'explicitly_blocked' | 'unknown';

  // ── 상품 스키마 ─────────────────────────────────────────────────────────────
  hasProductSchema: boolean;         // @type: "Product" JSON-LD
  hasOfferSchema: boolean;           // Offer with price
  hasAggregateRating: boolean;       // AggregateRating (리뷰 점수)
  hasFaqSchema: boolean;             // FAQPage
  hasBreadcrumbSchema: boolean;      // BreadcrumbList
  hasOrganizationSchema: boolean;    // Organization / Brand

  // ── 콘텐츠 & 브랜드 신호 ────────────────────────────────────────────────────
  hasBlogSection: boolean;           // /blogs/ 경로 링크 감지
  hasAboutPage: boolean;             // /pages/about 또는 유사 경로
  hasContactPage: boolean;           // /pages/contact
  reviewAppDetected?: string;        // 감지된 리뷰 앱 이름 (Judge.me 등)

  // ── 기술 신호 ────────────────────────────────────────────────────────────────
  hasIndexNow: boolean;              // IndexNow key 메타 태그
  shopifyVersion?: string;           // CDN 감지 버전

  // ── 스키마 체크 출처 ─────────────────────────────────────────────────────────
  // Product/Offer/AggregateRating은 상품 페이지에서 확인해야 정확함
  productPageChecked?: string;       // 실제로 스키마를 확인한 상품 페이지 URL
  schemaCheckedOnHomepage: boolean;  // true = 홈페이지만 확인 (정확도 낮음)

  // ── 종합 점수 (0-100) ───────────────────────────────────────────────────────
  shopifyAiScore: number;
  scoreBreakdown: { label: string; earned: number; max: number; pass: boolean }[];
}

// 실제 URL에서 추출한 SEO 신호
export interface PageSignals {
  url: string
  isHttps: boolean
  statusCode: number
  responseTime: number
  title: string
  metaDescription: string
  canonical: string
  metaRobots: string
  h1s: string[]
  h2s: string[]
  h3s: string[]
  ogTitle: string
  ogDescription: string
  ogImage: string
  twitterCard: string
  jsonLdRaw: string[]
  robotsTxt: string
  hasViewport: boolean
  hasCharset: boolean
  wordCount: number
  internalLinks: number
  externalLinks: number
  imageCount: number
  imagesWithAlt: number
  hasSchema: boolean
  hasHreflang: boolean
  hasSitemap: boolean
  fetchError?: string
  // Analytics detection
  hasGA4: boolean
  ga4MeasurementId?: string
  hasGTM: boolean
  gtmId?: string
  hasUALegacy: boolean
  hasFbPixel: boolean
  hasNaverAnalytics: boolean
  // v0.7.1: Shopify 전용 신호 (쇼피파이 감지 시에만 채워짐)
  shopify?: ShopifySignals
}

// 스트리밍 분석 이벤트
export interface AnalysisEvent {
  type: 'step' | 'signals' | 'result' | 'error'
  msg?: string
  level?: 'info' | 'success' | 'warn'
  data?: PageSignals
  ts: number
}

export interface AIAnalysisResponse {
  title: string;
  overallScore: number;
  technicalScore: number;
  chatGptSearchScore: number;
  academicGeoScore: number;
  eeatScore: number;
  schemaScore: number;
  bingScore: number;
  naverScore?: number;
  summary: string;
  criteria: CriteriaItem[];
  strengthSummary: string[];
  criticalIssues: string[];
  quickWins: string[];
  siteCrawl?: SiteCrawlResult;
}

export interface CrawlPageResult {
  url: string;
  depth: number;
  statusCode: number;
  redirected: boolean;
  responseTime: number;
  title: string;
  metaDescription: string;
  canonical: string;
  h1Count: number;
  wordCount: number;
  internalLinks: string[];
  noindex: boolean;
  hasSchema: boolean;
  error?: string;
}

export interface SiteCrawlIssue {
  id: string;
  severity: 'error' | 'warning' | 'notice';
  title: string;
  count: number;
  urls: string[];
  recommendation: string;
  scoreImpact: number;
  verification: string;
}

export interface CrawlScoreFactor {
  issueId: string;
  label: string;
  maxPenalty: number;
  appliedPenalty: number;
  affectedPages: number;
  affectedRatio: number;
}

export interface SiteCrawlComparison {
  previousHealthScore: number;
  healthScoreDelta: number;
  resolvedIssueIds: string[];
  newIssueIds: string[];
  improvedIssueIds: string[];
  regressedIssueIds: string[];
}

export interface SiteCrawlResult {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  scannedPages: number;
  discoveredUrls: number;
  healthyPages: number;
  errorCount: number;
  warningCount: number;
  healthScore: number;
  scoreModelVersion: string;
  scoreFactors: CrawlScoreFactor[];
  truncated: boolean;
  blockedByRobots: number;
  limits: { maxPages: number; maxDepth: number; concurrency: number };
  pages: CrawlPageResult[];
  issues: SiteCrawlIssue[];
  comparison?: SiteCrawlComparison;
}

// ─────────────────────────────────────────────────────────────
// GEO 모니터링 (Module C) — AI 인용률 실측 엔진
// ─────────────────────────────────────────────────────────────

export type GeoEngine = 'perplexity' | 'chatgpt' | 'claude' | 'gemini';

export type GeoQueryCategory = 'brand' | 'product' | 'industry' | 'competitor';

export interface GeoQuery {
  id: string;
  text: string;                   // 질의 원문
  synonyms: string[];             // 동의어 군집
  category: GeoQueryCategory;
  targetAudience?: string;        // 대상 독자
}

export interface GeoCheckResult {
  queryId: string;
  queryText: string;
  engine: GeoEngine;
  cited: boolean;                 // 도메인/브랜드 인용 여부
  mentionCount: number;           // 응답 내 언급 횟수
  citationSnippet?: string;       // 인용된 전후 문맥 (±100자)
  competitorMentions: string[];   // 경쟁 도메인 언급 목록
  responsePreview: string;        // 응답 첫 300자
  checkedAt: string;              // ISO timestamp
  error?: string;                 // 엔진 오류 시
}

export interface GeoMonitoringRun {
  id: string;
  targetDomain: string;
  targetBrand: string;
  runAt: string;
  results: GeoCheckResult[];
  /** 엔진별 인용률 (0~100%) */
  citationRates: Record<GeoEngine, number>;
  /** 전체 평균 인용률 */
  overallCitationRate: number;
}

export interface GeoMonitoringState {
  targetDomain: string;
  targetBrand: string;
  queries: GeoQuery[];
  runs: GeoMonitoringRun[];       // 최신순 정렬
}
