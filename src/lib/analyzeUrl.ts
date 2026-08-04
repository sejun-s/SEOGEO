import type {
  AIAnalysisResponse,
  AnalysisEvent,
  AuditResult,
  PageSignals,
} from '../types';
import { generateCustomAudit } from '../data/mockPresets';
import { calcCategoryScore } from '../server/seoAnalyze';

export type OnEvent = (e: AnalysisEvent) => void;

// NDJSON 스트림을 읽어서 이벤트를 콜백으로 전달
export async function analyzeUrl(url: string, onEvent?: OnEvent): Promise<AuditResult> {
  const storedKey = localStorage.getItem('seo-analyzer-gemini-key') || undefined;

  let res: Response;
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, apiKey: storedKey }),
    });
  } catch (err) {
    throw new Error(`서버 연결 실패: ${err}`);
  }

  const contentType = res.headers.get('content-type') ?? '';

  // ─ NDJSON 스트리밍 (로컬 dev) ─────────────────────────────────────────────
  if (contentType.includes('x-ndjson') && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: AuditResult | null = null;
    let signals: PageSignals | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        let event: Record<string, unknown>;
        try { event = JSON.parse(line); } catch { continue; }

        const type = event.type as string;

        if (type === 'error') {
          throw new Error(event.msg as string ?? '분석 오류');
        }

        if (type === 'signals') {
          signals = event.data as PageSignals;
          onEvent?.({ type: 'signals', data: signals, ts: event.ts as number ?? Date.now() });
          continue;
        }

        if (type === 'step') {
          onEvent?.({
            type: 'step',
            msg: event.msg as string,
            level: (event.level as AnalysisEvent['level']) ?? 'info',
            ts: event.ts as number ?? Date.now(),
          });
          continue;
        }

        if (type === 'result') {
          const ai = event.data as AIAnalysisResponse;
          finalResult = mapAIResponseToAudit(url, ai, event.signals as PageSignals | undefined ?? signals ?? undefined);
          onEvent?.({ type: 'result', ts: event.ts as number ?? Date.now() });
        }
      }
    }

    if (!finalResult) throw new Error('분석 결과를 받지 못했습니다.');
    return finalResult;
  }

  // ─ 일반 JSON (Vercel 프로덕션) ────────────────────────────────────────────
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error: string };
    throw new Error(err.error ?? `분석 서버 오류 (${res.status})`);
  }

  const data = await res.json() as AIAnalysisResponse & { signals?: PageSignals };
  onEvent?.({ type: 'result', ts: Date.now() });
  return mapAIResponseToAudit(url, data, data.signals);
}

function mapAIResponseToAudit(url: string, ai: AIAnalysisResponse, signals?: PageSignals): AuditResult {
  const now = new Date().toISOString();
  const domain = url.replace(/^https?:\/\//, '').split('/')[0];

  const metrics = (ai.criteria ?? []).map((c) => ({
    id: c.id,
    title: c.name,
    category: c.category,
    status: c.status,
    score: c.score,
    scoreBoost: c.estimatedScoreGain,
    isResolved: false,
    currentValue: c.currentState,
    recommendation: c.improvement,
    referenceDoc: c.referenceGuide,
  }));

  return {
    url,
    title: ai.title || `${domain} - AI SEO 분석 결과`,
    initialScore: ai.overallScore,
    overallScore: ai.overallScore,
    technicalScore: ai.technicalScore,
    chatGptSearchScore: ai.chatGptSearchScore,
    academicGeoScore: ai.academicGeoScore,
    eeatScore: ai.eeatScore,
    schemaScore: ai.schemaScore,
    bingScore: ai.bingScore,
    lastScanned: now,
    summary: ai.summary,
    criteria: ai.criteria,
    strengthSummary: ai.strengthSummary,
    criticalIssues: ai.criticalIssues,
    quickWins: ai.quickWins,
    pageSignals: signals,
    siteCrawl: ai.siteCrawl,
    // v3 점수 모델 필드 (signals가 있을 때만)
    ...(signals ? (() => {
      const v3 = calcCategoryScore(signals)
      return {
        scoreModelVersion: 'v3.0',
        legacyScore: ai.overallScore,
        searchEligibility: v3.searchEligibility,
        seoFoundationScore: v3.seoFoundationScore as number,
        aiCitationReadinessScore: v3.aiCitationReadinessScore as number,
        measurementConfidence: v3.measurementConfidence,
        schemaEvaluationLevel: v3.schemaEvaluationLevel,
        ruleResults: (ai as any).ruleResults,
      }
    })() : {}),
    metrics,
    scoreHistory: [{
      id: 'h0',
      timestamp: new Date().toLocaleString('ko-KR'),
      label: 'Gemini AI 진단 완료',
      scoreDelta: 0,
      newOverallScore: ai.overallScore,
    }],
    botPolicies: [
      { botName: 'OAI-SearchBot', purpose: 'ChatGPT Search', status: signals?.robotsTxt?.toLowerCase().includes('oai-searchbot') ? 'allowed' : 'missing', impact: 'ChatGPT 답변 출처 노출', recommendation: '허용 유지' },
      { botName: 'Googlebot', purpose: 'Google 색인', status: 'allowed', impact: 'Google AI Overviews', recommendation: '허용 유지' },
    ],
    geoFactors: (ai.criteria ?? []).filter(c => c.category === 'geo').map(c => ({
      name: c.name, score: c.score,
      status: c.score >= 80 ? 'excellent' : c.score >= 60 ? 'moderate' : 'needs_improvement',
      description: c.scoringBasis, arxivReference: c.referenceGuide, actionItem: c.improvement,
    })) as AuditResult['geoFactors'],
    generatedSchemaJson: JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite', name: domain, url }] }, null, 2),
    optimizedMeta: {
      title: `${ai.title} | AI SEO 최적화`,
      description: ai.summary || '',
      keywords: [domain, 'AI SEO', 'AEO'],
      ogTitle: ai.title,
      ogDescription: ai.summary || '',
      ogImage: `https://${domain}/og-image.jpg`,
      canonical: url,
      headings: [{ level: 'H1', text: ai.title }],
    },
    eeatAnalysis: {
      sameAsProfiles: [],
      expertiseSignatures: ai.strengthSummary || [],
      trustSignals: [],
      originalityAssessment: ai.summary || '',
      improvementSuggestions: ai.criticalIssues || [],
    },
    aeoSimulation: {
      targetQuery: `${domain} 서비스`,
      chatGptSearchSnippet: '',
      googleAiOverviewSnippet: '',
      perplexitySnippet: '',
      citationProbable: ai.overallScore >= 70,
      citedUrl: url,
      citedAnchorText: domain,
      keyFactExtractor: ai.quickWins || [],
    },
  };
}

// mock fallback — 외부에서 명시적으로 호출 시만 사용
export { generateCustomAudit };
