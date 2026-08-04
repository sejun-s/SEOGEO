import React, { useState } from 'react';
import type { AuditResult } from '../../types';
import { Sparkles, ExternalLink, Bot, CheckCircle2, MessageSquare } from 'lucide-react';

interface AEOCitationTabProps {
  audit: AuditResult;
}

export const AEOCitationTab: React.FC<AEOCitationTabProps> = ({ audit }) => {
  const [engine, setEngine] = useState<'all' | 'chatgpt' | 'google' | 'perplexity'>('all');

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-slate-900 to-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              AEO / GEO AI 답장 엔진 인용 시뮬레이터 (ChatGPT Search vs Google AI vs Perplexity)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              OpenAI ChatGPT Search, Google AI Overviews, Perplexity 답변에 자사 웹사이트 URL이 출처 링크(Citation)로 채택되어 인용되는 노출 결과입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Engine Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEngine('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            engine === 'all'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
              : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          전체 AI 엔진 동시 비교
        </button>
        <button
          onClick={() => setEngine('chatgpt')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            engine === 'chatgpt'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
              : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          OpenAI ChatGPT Search
        </button>
        <button
          onClick={() => setEngine('google')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            engine === 'google'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
              : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          Google AI Overviews
        </button>
      </div>

      {/* Simulation Box */}
      <div className="glass-card p-5 space-y-4 border-cyan-500/20">
        <div className="flex items-start gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-indigo-400 font-mono font-semibold">User Query (대화형 검색 질의)</div>
            <div className="text-sm font-semibold text-slate-100 mt-1">
              "{audit.aeoSimulation.targetQuery}"
            </div>
          </div>
        </div>

        {/* 1. ChatGPT Search */}
        {(engine === 'all' || engine === 'chatgpt') && (
          <div className="flex items-start gap-3 bg-slate-950 p-4 rounded-2xl border border-emerald-500/30">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-emerald-400 font-mono font-semibold">
                  OpenAI ChatGPT Search Simulated Response (OAI-SearchBot Allowed)
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Citation Probability: 96%
                </span>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {audit.aeoSimulation.chatGptSearchSnippet}
              </div>
            </div>
          </div>
        )}

        {/* 2. Google AI Overviews */}
        {(engine === 'all' || engine === 'google') && (
          <div className="flex items-start gap-3 bg-slate-950 p-4 rounded-2xl border border-indigo-500/30">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-indigo-400 font-mono font-semibold">
                  Google AI Overviews Simulated Response (E-E-A-T Verified)
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Citation Probability: 92%
                </span>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {audit.aeoSimulation.googleAiOverviewSnippet}
              </div>
            </div>
          </div>
        )}

        {/* Citation Box */}
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-cyan-200 font-medium">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>AI 엔진 공통 인용 출처 URL (Cited Source):</span>
            <span className="font-mono text-cyan-300 underline">{audit.aeoSimulation.citedAnchorText}</span>
          </div>
          <a
            href={audit.aeoSimulation.citedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center gap-1"
          >
            페이지 이동
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Extracted Key Facts */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          LLM 지식 파서가 추출한 팩트 지표 (Extracted Fact Metrics)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {audit.aeoSimulation.keyFactExtractor.map((fact, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
              ✓ {fact}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
