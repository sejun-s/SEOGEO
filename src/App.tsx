import React, { useState, useEffect, useCallback } from 'react';
import type { AuditResult, DetailTabType } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ScoreOverview } from './components/ScoreOverview';
import { SiteCrawlPanel } from './components/SiteCrawlPanel';
import { GlassBlockGrid } from './components/GlassBlockGrid';
import { DetailPage } from './components/DetailPage';
import { AnalysisLog } from './components/AnalysisLog';
import { FixChecklist } from './components/FixChecklist';
import { analyzeUrl } from './lib/analyzeUrl';
import { compareSiteCrawls } from './lib/siteCrawlComparison';
import type { AnalysisEvent, PageSignals } from './types';
import { Search, Sparkles, Zap, Loader2, ExternalLink, Tag, X, Plus, Globe, BarChart3, Lightbulb, ShoppingBag } from 'lucide-react';
import { KeywordOptimizer } from './components/KeywordOptimizer';
import { AnalyticsCard } from './components/AnalyticsCard';
import { GA4AccountCard } from './components/GA4AccountCard';
import { InsightPanel } from './components/InsightPanel';
import { CompareView } from './components/CompareView';
import { AnalysisProgress } from './components/AnalysisProgress';
import { MobileNav } from './components/MobileNav';
import { ReportActions } from './components/ReportActions';
import { ShopifyPanel } from './components/ShopifyPanel';
import { NaverReadinessPanel } from './components/NaverReadinessPanel';
import { GeoMonitoringDashboard } from './components/GeoMonitoringDashboard';
import { GeoIntegrationPanel } from './components/GeoIntegrationPanel';

const HISTORY_KEY = 'seo-analyzer-history';

function loadHistory(): AuditResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as AuditResult[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: AuditResult[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore quota errors
  }
}

const EXAMPLE_URLS = ['google.com', 'naver.com', 'notion.so', 'toss.im'];

// LLM-style landing page with search hero
function LandingPage({
  onScanUrl,
  isScanning,
  scanError,
  onDismissError,
  keywords,
  onAddKeyword,
  onRemoveKeyword,
}: {
  onScanUrl: (url: string) => void;
  isScanning: boolean;
  scanError: string | null;
  onDismissError: () => void;
  keywords: string[];
  onAddKeyword: (kw: string) => void;
  onRemoveKeyword: (kw: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);
  const [kwFocused, setKwFocused] = useState(false);
  const [kwInput, setKwInput] = useState('');

  const commitKw = () => {
    const trimmed = kwInput.trim().replace(/,$/, '');
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 10) {
      onAddKeyword(trimmed);
      setKwInput('');
    }
  };

  const onKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitKw(); }
    if (e.key === 'Backspace' && !kwInput && keywords.length > 0) {
      onRemoveKeyword(keywords[keywords.length - 1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isScanning) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    onScanUrl(normalized);
  };

  const handleExample = (example: string) => {
    setUrl(example);
    const normalized = `https://${example}`;
    onScanUrl(normalized);
  };

  return (
    <div className="v03-landing flex-1 flex flex-col items-center justify-center px-6 py-16">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-purple-600/8 blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] rounded-full bg-indigo-500/10 blur-[60px]" />
      </div>

      {/* Hero */}
      <div className="text-center mb-10 relative">
        {/* Logo with glow */}
        <div className="relative w-fit mx-auto mb-5">
          <div className="absolute inset-0 scale-[2.5] rounded-full bg-purple-500/20 blur-2xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
          어떤 사이트를 분석할까요?
        </h1>
        <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          URL 하나로 SEO · AEO · ChatGPT Search 최적화 상태와<br />
          구체적인 코드 수정 가이드를 받아보세요
        </p>
      </div>

      {/* Search box */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className={`v03-search-box relative flex items-center rounded-2xl border transition-all duration-200 ${
          focused
            ? 'border-purple-500/60 shadow-lg shadow-purple-500/10 bg-slate-900'
            : 'border-white/12 bg-slate-900/70'
        }`}>
          <Search className="absolute left-4 w-5 h-5 text-slate-500 pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder="example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={isScanning}
            autoFocus
            className="flex-1 pl-12 pr-4 py-4 bg-transparent text-base text-white placeholder-slate-600 outline-none disabled:opacity-60"
          />
          <div className="pr-2">
            <button
              type="submit"
              disabled={isScanning || !url.trim()}
              className="btn-purple px-5 py-2.5 text-sm"
            >
              {isScanning
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />
              }
              <span>{isScanning ? '분석 중...' : 'AI 분석'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {scanError && (
        <div className="mt-3 w-full max-w-2xl p-3 rounded-xl bg-rose-500/12 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
          <span className="font-semibold">분석 오류:</span>
          {scanError}
          <button onClick={onDismissError} className="ml-auto text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Keyword tag input */}
      <div className="w-full max-w-2xl mt-3">
        <div className={`v03-keyword-box flex flex-wrap items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border transition-all duration-200 ${
          kwFocused ? 'border-purple-500/40 bg-slate-900' : 'border-white/8 bg-slate-900/40'
        }`}>
          <Tag className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          {keywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 font-medium">
              {kw}
              <button onClick={() => onRemoveKeyword(kw)} className="opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={onKwKeyDown}
            onFocus={() => setKwFocused(true)}
            onBlur={() => { setKwFocused(false); commitKw(); }}
            placeholder={keywords.length === 0 ? '유입 원하는 검색어 입력 후 Enter  예: AI SEO 분석, 검색엔진최적화' : '검색어 추가...'}
            className="flex-1 min-w-[180px] bg-transparent text-xs text-white placeholder-slate-600 outline-none"
          />
          {kwInput && (
            <button onClick={commitKw} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 shrink-0">
              <Plus className="w-3 h-3" /> 추가
            </button>
          )}
        </div>
        {keywords.length > 0 && (
          <p className="text-[10px] text-slate-600 mt-1.5 px-1">
            {keywords.length}개 검색어 — 분석 후 각 키워드의 HTML 최적화 코드를 생성합니다
          </p>
        )}
      </div>

      {/* Example quick-picks */}
      <div className="v03-example-row mt-5 flex items-center gap-2 flex-wrap justify-center">
        <span className="text-[11px] text-slate-600">예시:</span>
        {EXAMPLE_URLS.map((ex) => (
          <button
            key={ex}
            onClick={() => handleExample(ex)}
            disabled={isScanning}
            className="text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200 hover:border-white/20 transition-all font-mono disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="mt-10 flex flex-wrap gap-2 justify-center">
        {[
          { label: 'Technical SEO', color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
          { label: 'ChatGPT Search', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
          { label: 'GEO (AI 인용)', color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
          { label: 'E-E-A-T', color: 'text-teal-400 border-teal-500/20 bg-teal-500/5' },
          { label: 'Schema.org', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' },
          { label: 'Bing / AEO', color: 'text-pink-400 border-pink-500/20 bg-pink-500/5' },
        ].map(({ label, color }) => (
          <span key={label} className={`text-[11px] px-3 py-1 rounded-full border ${color}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function App() {
  const [history, setHistory] = useState<AuditResult[]>(() => loadHistory());
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabType>('technical');
  const [topTab, setTopTab] = useState<'seo-geo' | 'geo-monitoring'>('seo-geo');
  const [mainTab, setMainTab] = useState<'seo' | 'ga4' | 'insights' | 'shopify'>('seo');
  const [urlSubTab, setUrlSubTab] = useState<'technical' | 'ai-citation' | 'naver'>('technical');
  const [ga4Tab, setGa4Tab] = useState<'list' | 'account'>('list');
  const [highlightCriteriaId, setHighlightCriteriaId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareUrls, setCompareUrls] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [myCompanyUrl, setMyCompanyUrl] = useState<string | null>(
    () => localStorage.getItem('seo-my-company-url')
  );
  // v0.7: 경쟁사 태깅
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('seo-competitor-urls') ?? '[]') as string[]; }
    catch { return []; }
  });

  const handleSetMyCompany = useCallback((url: string | null) => {
    setMyCompanyUrl(url);
    if (url) localStorage.setItem('seo-my-company-url', url);
    else localStorage.removeItem('seo-my-company-url');
  }, []);

  const handleToggleCompetitorUrl = useCallback((url: string) => {
    setCompetitorUrls((prev) => {
      const updated = prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url];
      localStorage.setItem('seo-competitor-urls', JSON.stringify(updated));
      return updated;
    });
  }, []);
  const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);
  const [analysisSignals, setAnalysisSignals] = useState<PageSignals | null>(null);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const handleSelectAudit = useCallback((audit: AuditResult) => {
    setSelectedAudit(audit);
    setViewMode('overview');
    setScanError(null);
  }, []);

  const handleSelectBlockTab = useCallback((tab: DetailTabType) => {
    setActiveDetailTab(tab);
    setViewMode('detail');
  }, []);

  const handleBackToOverview = useCallback(() => {
    setViewMode('overview');
  }, []);

  const handleScanUrl = useCallback(async (url: string) => {
    setIsScanning(true);
    setScanError(null);
    setAnalysisEvents([]);
    setAnalysisSignals(null);
    setShowLog(false);
    setTopTab('seo-geo');
    setMainTab('seo');
    setUrlSubTab('technical');
    setGa4Tab('list');
    setHighlightCriteriaId(null);
    setShowCompare(false);

    try {
      const result = await analyzeUrl(url, (event) => {
        if (event.type === 'signals') {
          setAnalysisSignals(event.data ?? null);
        } else {
          setAnalysisEvents((prev) => [...prev, event]);
        }
      });

      const previousAudit = history.find((audit) => audit.url === result.url);

      // v0.7: 이전 스캔 점수를 기록해 카테고리별 델타를 보여줌
      const previousCategoryScores = previousAudit
        ? {
            overallScore: previousAudit.overallScore,
            technicalScore: previousAudit.technicalScore,
            chatGptSearchScore: previousAudit.chatGptSearchScore,
            academicGeoScore: previousAudit.academicGeoScore,
            eeatScore: previousAudit.eeatScore,
            schemaScore: previousAudit.schemaScore,
            bingScore: previousAudit.bingScore,
          }
        : undefined;

      const enrichedResult: AuditResult = {
        ...(previousAudit?.siteCrawl && result.siteCrawl
          ? {
              ...result,
              siteCrawl: {
                ...result.siteCrawl,
                comparison: compareSiteCrawls(previousAudit.siteCrawl, result.siteCrawl),
              },
            }
          : result),
        ...(previousCategoryScores ? { previousCategoryScores } : {}),
      };

      setHistory((prev) => {
        const filtered = prev.filter((a) => a.url !== enrichedResult.url);
        return [enrichedResult, ...filtered].slice(0, 20);
      });
      setSelectedAudit(enrichedResult);
      setAnalysisSignals(enrichedResult.pageSignals ?? null);
      setViewMode('overview');
    } catch (err) {
      setScanError(String(err));
    } finally {
      setIsScanning(false);
    }
  }, [history]);

  const handleAddKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.includes(kw) ? prev : [...prev, kw].slice(0, 10));
  }, []);

  const handleRemoveKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }, []);

  const handleGoHome = useCallback(() => {
    setSelectedAudit(null);
    setViewMode('overview');
    setScanError(null);
    setShowLog(false);
    setShowCompare(false);
    setCompareMode(false);
    setCompareUrls([]);
  }, []);

  const handleToggleCompareMode = useCallback(() => {
    setCompareMode(m => !m);
    setCompareUrls([]);
    setShowCompare(false);
  }, []);

  const handleToggleCompareUrl = useCallback((url: string) => {
    setCompareUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url].slice(0, 3)
    );
  }, []);

  const handleStartCompare = useCallback(() => {
    setShowCompare(true);
    setCompareMode(false);
  }, []);

  const handleRemoveHistory = useCallback((url: string) => {
    setHistory((prev) => {
      const updated = prev.filter((a) => a.url !== url);
      if (selectedAudit?.url === url) {
        setSelectedAudit(updated[0] ?? null);
      }
      return updated;
    });
  }, [selectedAudit]);

  const showResults = selectedAudit !== null;

  return (
    <div className="v03-shell h-screen w-screen overflow-hidden flex flex-col md:flex-row">
      <Sidebar
        history={history}
        selectedAuditUrl={selectedAudit?.url ?? null}
        onSelectAudit={handleSelectAudit}
        onRemoveHistory={handleRemoveHistory}
        onGoHome={handleGoHome}
        compareMode={compareMode}
        compareUrls={compareUrls}
        onToggleCompareMode={handleToggleCompareMode}
        onToggleCompareUrl={handleToggleCompareUrl}
        onStartCompare={handleStartCompare}
        myCompanyUrl={myCompanyUrl}
        onSetMyCompany={handleSetMyCompany}
        competitorUrls={competitorUrls}
        onToggleCompetitorUrl={handleToggleCompetitorUrl}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 헤더: 항상 표시 — 최상단 탭 + URL 분석하기 입력 포함 */}
        <Header
          onScanUrl={handleScanUrl}
          isScanning={isScanning}
          topTab={topTab}
          onTopTabChange={(tab) => { setTopTab(tab); }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Scanning overlay */}
          {isScanning && (
            <div className="v03-progress-overlay"><AnalysisProgress events={analysisEvents} /></div>
          )}

          {/* GEO 모니터링 — 분석 기록과 무관하게 독립 표시 */}
          {topTab === 'geo-monitoring' ? (
            <div className="v03-content max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
              <GeoMonitoringDashboard />
            </div>
          ) : showCompare && compareUrls.length >= 2 ? (
            <div className="max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
              <CompareView
                audits={compareUrls.map(u => history.find(a => a.url === u)).filter(Boolean) as AuditResult[]}
                onClose={() => setShowCompare(false)}
                myCompanyUrl={myCompanyUrl}
              />
            </div>
          ) : !showResults ? (
            <LandingPage
              onScanUrl={handleScanUrl}
              isScanning={isScanning}
              scanError={scanError}
              onDismissError={() => setScanError(null)}
              keywords={keywords}
              onAddKeyword={handleAddKeyword}
              onRemoveKeyword={handleRemoveKeyword}
            />
          ) : (
            <>
              {/* Error banner */}
              {scanError && (
                <div className="mx-4 mt-4 p-3 rounded-xl bg-rose-500/12 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
                  <span className="font-semibold">분석 오류:</span>
                  {scanError}
                  <button onClick={() => setScanError(null)} className="ml-auto text-slate-400 hover:text-white">✕</button>
                </div>
              )}

              {/* ── 메인 탭 + URL 서브탭 (SEO·GEO 분석 선택 시) ── */}
              {topTab === 'seo-geo' && showResults && (
                <div className="v03-main-tabs sticky top-0 z-10">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* 메인 탭 */}
                    <div className="flex gap-0">
                      {([
                        { id: 'seo',      label: 'URL 분석',    icon: Globe },
                        { id: 'ga4',      label: 'GA4 분석',    icon: BarChart3 },
                        { id: 'insights', label: 'AI 인사이트', icon: Lightbulb },
                        ...(selectedAudit.pageSignals?.shopify
                          ? [{ id: 'shopify', label: 'Shopify AI', icon: ShoppingBag }]
                          : []),
                      ] as { id: 'seo' | 'ga4' | 'insights' | 'shopify'; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => { setMainTab(id); if (id !== 'seo') setViewMode('overview'); }}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all duration-150 ${
                            mainTab === id
                              ? id === 'shopify'
                                ? 'border-[#059669] text-[#065f46]'
                                : 'border-[#4f6df5] text-[#1b2559]'
                              : 'border-transparent text-[#737c9c] hover:text-[#1b2559] hover:border-[#dce6e9]'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {label}
                          {id === 'shopify' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 font-semibold leading-none">NEW</span>
                          )}
                          {id === 'ga4' && selectedAudit.pageSignals && !selectedAudit.pageSignals.hasGA4 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* URL 서브탭 (URL 분석 선택 시) */}
                    {mainTab === 'seo' && !showCompare && (
                      <div className="flex gap-1 pb-2 pt-1">
                        {([
                          { id: 'technical',   label: 'SEO 기술 준비도' },
                          { id: 'ai-citation', label: 'AI 인용 준비도' },
                          { id: 'naver',       label: '네이버 검색 준비도' },
                        ] as { id: 'technical' | 'ai-citation' | 'naver'; label: string }[]).map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => { setUrlSubTab(id); setViewMode('overview'); }}
                            className={`px-3 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                              urlSubTab === id
                                ? 'bg-[#eef3ff] border-[#4f6df5] text-[#1b2559]'
                                : 'border-transparent text-[#737c9c] hover:text-[#1b2559] hover:border-[#dce6e9]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="v03-content max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">

                {/* GA4 탭 */}
                {!showCompare && mainTab === 'ga4' && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* GA4 서브탭 */}
                    <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
                      {([
                        { id: 'list', label: '분석 리스트' },
                        { id: 'account', label: '계정 입력' },
                      ] as const).map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => setGa4Tab(id)}
                          className={`min-w-24 text-xs px-4 py-2 rounded-lg font-bold transition-all ${
                            ga4Tab === id
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {ga4Tab === 'list' && (
                      selectedAudit.pageSignals ? (
                        <AnalyticsCard signals={selectedAudit.pageSignals} />
                      ) : (
                        <div className="glass-card p-8 text-center text-slate-500 text-sm">
                          분석 데이터가 없습니다. 먼저 URL을 분석해주세요.
                        </div>
                      )
                    )}

                    {ga4Tab === 'account' && (
                      <GA4AccountCard signals={selectedAudit.pageSignals} />
                    )}
                  </div>
                )}

                {/* 인사이트 탭 */}
                {!showCompare && mainTab === 'insights' && (
                  <InsightPanel audit={selectedAudit} />
                )}

                {/* Shopify AI 탭 */}
                {!showCompare && mainTab === 'shopify' && selectedAudit.pageSignals?.shopify && (
                  <div className="animate-fadeIn">
                    <ShopifyPanel audit={selectedAudit} />
                  </div>
                )}

                {/* GEO 모니터링은 최상단에서 처리 — 여기서는 렌더 없음 */}

                {/* URL 분석 탭 (SEO·GEO 분석 선택 시) */}
                {topTab === 'seo-geo' && !showCompare && mainTab === 'seo' && (<>
                {/* 항상 보이는 영역: 보고서 액션 + 종합 점수 개요 */}
                <ReportActions audit={selectedAudit} />
                <ScoreOverview audit={selectedAudit} />

                {/* DetailPage는 서브탭 무관하게 오버레이 */}
                {viewMode === 'detail' ? (
                  <DetailPage
                    audit={selectedAudit}
                    activeTab={activeDetailTab}
                    onSelectTab={setActiveDetailTab}
                    onBackToOverview={handleBackToOverview}
                    autoExpandId={highlightCriteriaId ?? undefined}
                  />
                ) : (<>

                  {/* ── 서브탭 1: SEO 기술 준비도 ── */}
                  {urlSubTab === 'technical' && (
                    <div className="space-y-6 animate-fadeInUp">
                      <GlassBlockGrid
                        audit={selectedAudit}
                        onSelectDetailTab={handleSelectBlockTab}
                        filterIds={['technical', 'schema', 'cms']}
                      />
                      <SiteCrawlPanel audit={selectedAudit} />
                      <KeywordOptimizer
                        audit={selectedAudit}
                        keywords={keywords}
                        onAddKeyword={handleAddKeyword}
                        onRemoveKeyword={handleRemoveKeyword}
                      />
                      <div id="action-hub" className="scroll-mt-24">
                        <FixChecklist
                          audit={selectedAudit}
                          onReanalyze={handleScanUrl}
                          isScanning={isScanning}
                        />
                      </div>
                      {showLog && (analysisEvents.length > 0 || analysisSignals) && (
                        <div className="animate-fadeIn">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-xs text-slate-500 font-semibold">AI 분석 과정</span>
                            <button onClick={() => setShowLog(false)} className="text-[11px] text-slate-600 hover:text-slate-400">접기 ✕</button>
                          </div>
                          <AnalysisLog events={analysisEvents} signals={analysisSignals} isScanning={isScanning} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 서브탭 2: AI 인용 준비도 ── */}
                  {urlSubTab === 'ai-citation' && (
                    <div className="space-y-6 animate-fadeInUp">
                      <GlassBlockGrid
                        audit={selectedAudit}
                        onSelectDetailTab={handleSelectBlockTab}
                        filterIds={['chatgpt', 'geo', 'eeat']}
                      />
                      {/* P1-1: GEO 인용률 연동 패널 */}
                      <GeoIntegrationPanel
                        audit={selectedAudit}
                        onGoToGeo={() => setTopTab('geo-monitoring')}
                      />
                      {/* AI 인용 관련 개선 항목 */}
                      <div id="action-hub" className="scroll-mt-24">
                        <FixChecklist
                          audit={selectedAudit}
                          onReanalyze={handleScanUrl}
                          isScanning={isScanning}
                          filterCategories={['chatgpt', 'geo', 'eeat']}
                        />
                      </div>
                    </div>
                  )}

                  {/* ── 서브탭 3: 네이버 검색 준비도 ── */}
                  {urlSubTab === 'naver' && (
                    <div className="space-y-4 animate-fadeInUp">
                      <NaverReadinessPanel audit={selectedAudit} />
                    </div>
                  )}

                </>)}
                </>)}
              </div>

              {/* Footer */}
              <footer className="shrink-0 border-t border-white/10 bg-slate-950/60 backdrop-blur-xl px-6 py-3 mt-auto">
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">AI SEO Analyzer</span>
                  <span className="text-slate-700">•</span>
                  <a
                    href="https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=ko"
                    target="_blank" rel="noreferrer"
                    className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                  >
                    Google AI Guide <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-700">•</span>
                  <a
                    href="https://help.openai.com/en/articles/9237897-chatgpt-search"
                    target="_blank" rel="noreferrer"
                    className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                  >
                    OpenAI ChatGPT Search <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
      {showResults && <MobileNav onHome={handleGoHome} onCompare={handleToggleCompareMode} />}
    </div>
  );
}

export default App;
