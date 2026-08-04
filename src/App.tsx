import { useState, useEffect, useCallback } from 'react';
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
import { Search, Sparkles, Zap, Loader2, ExternalLink, Tag, X, Plus, Globe, BarChart3, Lightbulb } from 'lucide-react';
import { KeywordOptimizer } from './components/KeywordOptimizer';
import { AnalyticsCard } from './components/AnalyticsCard';
import { GA4AccountCard } from './components/GA4AccountCard';
import { InsightPanel } from './components/InsightPanel';
import { CompareView } from './components/CompareView';
import { AnalysisProgress } from './components/AnalysisProgress';
import { MobileNav } from './components/MobileNav';
import { ReportActions } from './components/ReportActions';

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
  const [mainTab, setMainTab] = useState<'seo' | 'ga4' | 'insights'>('seo');
  const [ga4Tab, setGa4Tab] = useState<'list' | 'account'>('list');
  const [highlightCriteriaId, setHighlightCriteriaId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareUrls, setCompareUrls] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [myCompanyUrl, setMyCompanyUrl] = useState<string | null>(
    () => localStorage.getItem('seo-my-company-url')
  );

  const handleSetMyCompany = useCallback((url: string | null) => {
    setMyCompanyUrl(url);
    if (url) localStorage.setItem('seo-my-company-url', url);
    else localStorage.removeItem('seo-my-company-url');
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
    setMainTab('seo');
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
      const enrichedResult: AuditResult = previousAudit?.siteCrawl && result.siteCrawl
        ? {
            ...result,
            siteCrawl: {
              ...result.siteCrawl,
              comparison: compareSiteCrawls(previousAudit.siteCrawl, result.siteCrawl),
            },
          }
        : result;

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

  const handleToggleFixMetric = useCallback((metricId: string) => {
    if (!selectedAudit) return;
    setSelectedAudit((prev) => {
      if (!prev) return prev;
      const target = prev.metrics.find((m) => m.id === metricId);
      if (!target) return prev;

      const isNowResolved = !target.isResolved;
      const boost = target.scoreBoost || 5;

      const updatedMetrics = prev.metrics.map((m) =>
        m.id === metricId
          ? { ...m, isResolved: isNowResolved, status: (isNowResolved ? 'pass' : 'warning') as 'pass' | 'warning' }
          : m
      );

      const newScore = Math.min(100, Math.max(prev.initialScore, prev.overallScore + (isNowResolved ? boost : -boost)));

      const updated: AuditResult = {
        ...prev,
        overallScore: newScore,
        technicalScore: Math.min(100, prev.technicalScore + (isNowResolved ? (target.category === 'technical' ? boost : 1) : -1)),
        chatGptSearchScore: Math.min(100, prev.chatGptSearchScore + (isNowResolved ? (target.category === 'chatgpt' ? boost : 1) : -1)),
        schemaScore: Math.min(100, prev.schemaScore + (isNowResolved ? (target.category === 'schema' ? boost : 1) : -1)),
        metrics: updatedMetrics,
        scoreHistory: [
          {
            id: `h_${Date.now()}`,
            timestamp: new Date().toLocaleString('ko-KR'),
            label: isNowResolved ? `[개선 적용] ${target.title}` : `[원복] ${target.title}`,
            scoreDelta: isNowResolved ? boost : -boost,
            newOverallScore: newScore,
          },
          ...prev.scoreHistory,
        ],
      };

      setHistory((h) => h.map((a) => (a.url === updated.url ? updated : a)));
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
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header only shows when results are displayed */}
        {showResults && (
          <Header onScanUrl={handleScanUrl} isScanning={isScanning} />
        )}

        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Scanning overlay */}
          {isScanning && (
            <div className="v03-progress-overlay"><AnalysisProgress events={analysisEvents} /></div>
          )}

          {showCompare && compareUrls.length >= 2 ? (
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

              {/* 탭 바 */}
              <div className="v03-main-tabs sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-0">
                  {([
                    { id: 'seo', label: 'URL 분석', icon: Globe, beta: false },
                    { id: 'ga4', label: 'GA4 분석', icon: BarChart3, beta: false },
                    { id: 'insights', label: '인사이트', icon: Lightbulb, beta: true },
                  ] as const).map(({ id, label, icon: Icon, beta }) => (
                    <button
                      key={id}
                      onClick={() => setMainTab(id)}
                      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-150 ${
                        mainTab === id
                          ? 'border-purple-500 text-white'
                          : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                      {beta && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold leading-none">
                          BETA
                        </span>
                      )}
                      {id === 'ga4' && selectedAudit.pageSignals && !selectedAudit.pageSignals.hasGA4 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="v03-content max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">

                {/* GA4 탭 */}
                {!showCompare && mainTab === 'ga4' && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* GA4 서브탭 */}
                    <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 w-fit">
                      {([
                        { id: 'list', label: '분석 리스트' },
                        { id: 'account', label: '계정 입력' },
                      ] as const).map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => setGa4Tab(id)}
                          className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
                            ga4Tab === id
                              ? 'bg-white/12 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
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

                {/* URL 분석 탭 */}
                {!showCompare && mainTab === 'seo' && (<>
                <ReportActions audit={selectedAudit} />
                <ScoreOverview audit={selectedAudit} />
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

                {/* 분석 로그 */}
                {showLog && (analysisEvents.length > 0 || analysisSignals) && (
                  <div className="animate-fadeIn">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs text-slate-500 font-semibold">AI 분석 과정</span>
                      <button
                        onClick={() => setShowLog(false)}
                        className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        접기 ✕
                      </button>
                    </div>
                    <AnalysisLog
                      events={analysisEvents}
                      signals={analysisSignals}
                      isScanning={isScanning}
                    />
                  </div>
                )}

                {viewMode === 'detail' ? (
                  <DetailPage
                    audit={selectedAudit}
                    activeTab={activeDetailTab}
                    onSelectTab={setActiveDetailTab}
                    onBackToOverview={handleBackToOverview}
                    onToggleFix={handleToggleFixMetric}
                    autoExpandId={highlightCriteriaId ?? undefined}
                  />
                ) : (
                  <div className="space-y-6 animate-fadeInUp">
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">상세 분석</span>
                      </div>
                      <GlassBlockGrid audit={selectedAudit} onSelectDetailTab={handleSelectBlockTab} />
                    </div>

                  </div>
                )}
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
