import React from 'react';
import type { AuditResult } from '../../types';
import { Bot, CheckCircle2, XCircle, ShieldAlert, Cpu, ExternalLink } from 'lucide-react';

interface BotPolicyTabProps {
  audit: AuditResult;
}

export const BotPolicyTab: React.FC<BotPolicyTabProps> = ({ audit }) => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-card p-5 border-blue-500/30 bg-gradient-to-r from-blue-950/20 via-slate-900 to-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              OpenAI OAI-SearchBot & AI 로봇 크롤링 정책 정밀 진단
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              OpenAI 공식 가이드: <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono">GPTBot</code>(학습용)과 <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">OAI-SearchBot</code>(ChatGPT Search 실시간 답변/출처 인용용)을 구분 관리해야 사이트가 ChatGPT에 노출됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Bot Permission Cards Grouped */}
      <div className="space-y-4">
        {/* 1. 검색 노출 전용 봇 */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            1. 실시간 검색 노출 & 출처 인용 봇 (Search Indexing)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audit.botPolicies.filter(p => p.botName.includes('OAI-Search') || p.botName.includes('Bing') || p.botName.includes('Google')).map((policy, idx) => (
              <div key={idx} className="glass-card p-4 space-y-2.5 bg-emerald-500/5 border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-100 text-sm">{policy.botName}</span>
                    <span className="text-xs text-slate-400 font-mono">({policy.purpose})</span>
                  </div>
                  {policy.status === 'allowed' ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 허용 (Normal)
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
                      <XCircle className="w-3.5 h-3.5" /> 차단됨 (Blocked)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300"><strong>영향:</strong> {policy.impact}</p>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono">
                  💡 {policy.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 모델 학습 전용 봇 */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            2. AI 모델 학습 및 수집 봇 (Model Training & Scraping)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audit.botPolicies.filter(p => !p.botName.includes('OAI-Search') && !p.botName.includes('Bing') && !p.botName.includes('Google')).map((policy, idx) => (
              <div key={idx} className="glass-card p-4 space-y-2.5 bg-purple-500/5 border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-100 text-sm">{policy.botName}</span>
                    <span className="text-xs text-slate-400 font-mono">({policy.purpose})</span>
                  </div>
                  {policy.status === 'allowed' ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 허용 (Normal)
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
                      <XCircle className="w-3.5 h-3.5" /> 차단됨 (Blocked)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300"><strong>영향:</strong> {policy.impact}</p>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono">
                  💡 {policy.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended robots.txt Snippet */}
      <div className="glass-card p-5 border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Cpu className="w-4 h-4 text-blue-400" />
            검색 노출과 모델 학습 제어를 분리한 표준 robots.txt 예시
          </div>
          <a
            href="https://help.openai.com/en/articles/9237897-chatgpt-search"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono"
          >
            OpenAI Official Docs
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-300 border border-slate-800 overflow-x-auto leading-relaxed">
{`# 1. AI 검색 노출 및 출처 인용 전용 (권장: 허용)
User-agent: OAI-SearchBot
Allow: /

User-agent: Bingbot
Allow: /

# 2. 파운데이션 모델 학습 전용 (필요에 따라 차단/허용 선택 가능)
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /`}
        </pre>
      </div>

      {/* Technical SEO Checklist */}
      <div className="glass-card p-5 border-slate-200">
        <h4 className="text-[15px] font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-800" />
          Technical SEO & IndexNow 핵심 진단 목록
        </h4>
        <p className="text-xs text-slate-600 mb-4 ml-6">기술 검색 노출과 AI 크롤러 접근에 영향을 주는 세부 항목입니다.</p>

        <div className="space-y-2.5">
          {audit.metrics
            .filter((m) => m.category === 'technical' || m.category === 'chatgpt' || m.category === 'bing')
            .map((metric) => (
              <div key={metric.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="font-extrabold text-[13px] text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>{metric.title}</span>
                    {metric.referenceDoc && <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 font-mono font-semibold">
                      {metric.referenceDoc}
                    </span>}
                  </div>
                  <p className="text-[12px] text-slate-700 font-medium leading-5">{metric.recommendation}</p>
                </div>
                <span className="font-mono font-extrabold text-sm text-slate-900 shrink-0 bg-white border border-slate-300 rounded-lg px-2.5 py-1">{metric.score}점</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
