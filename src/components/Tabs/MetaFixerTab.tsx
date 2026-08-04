import React, { useState } from 'react';
import type { AuditResult } from '../../types';
import { Check, Copy, Code, AlertTriangle, Lightbulb } from 'lucide-react';

interface MetaFixerTabProps {
  audit: AuditResult;
}

export const MetaFixerTab: React.FC<MetaFixerTabProps> = ({ audit }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const metaHtmlCode = `<!-- Antigravity SEO & AEO Agent Generated Metadata -->
<title>${audit.optimizedMeta.title}</title>
<meta name="description" content="${audit.optimizedMeta.description}" />
<meta name="keywords" content="${audit.optimizedMeta.keywords.join(', ')}" />
<link rel="canonical" href="${audit.optimizedMeta.canonical}" />

<!-- Open Graph / Social Media -->
<meta property="og:type" content="website" />
<meta property="og:title" content="${audit.optimizedMeta.ogTitle}" />
<meta property="og:description" content="${audit.optimizedMeta.ogDescription}" />
<meta property="og:image" content="${audit.optimizedMeta.ogImage}" />
<meta property="og:url" content="${audit.optimizedMeta.canonical}" />`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 border-amber-500/20">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            현재 웹사이트 메타 태그 상태 (수정 전)
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 font-mono">Title:</span>
              <div className="bg-slate-900/80 p-3 rounded-lg text-slate-300 font-mono mt-1 border border-slate-800 break-all">
                {audit.title}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-mono">Description:</span>
              <div className="bg-slate-900/80 p-3 rounded-lg text-slate-300 font-mono mt-1 border border-slate-800 break-all">
                {audit.metrics.find((m) => m.id.includes('m2'))?.currentValue || '설명 태그가 미흡하거나 구체적인 키워드가 부족합니다.'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-mono font-semibold">진단 권장사항:</span>
              <ul className="list-disc list-inside text-amber-200/80 space-y-1 mt-1">
                {audit.metrics
                  .filter((m) => m.category === 'technical')
                  .map((m) => (
                    <li key={m.id}>{m.recommendation}</li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border-emerald-500/30 bg-emerald-950/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Lightbulb className="w-4 h-4" />
              에이전트 추천 최적화 메타 태그 (Google 가이드 적용)
            </div>
            <button
              onClick={() => handleCopy(metaHtmlCode, 'meta-code')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5 font-medium"
            >
              {copiedSection === 'meta-code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'meta-code' ? '복사 완료!' : 'HTML 태그 복사'}
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-emerald-300 font-mono font-semibold">Optimized Title (Google 스니펫 30~60자 규격):</span>
              <div className="bg-slate-900 p-3 rounded-lg text-emerald-300 font-mono mt-1 border border-emerald-500/30 font-medium">
                {audit.optimizedMeta.title}
              </div>
            </div>

            <div>
              <span className="text-emerald-300 font-mono font-semibold">Optimized Description (120~150자):</span>
              <div className="bg-slate-900 p-3 rounded-lg text-emerald-200 font-mono mt-1 border border-emerald-500/30">
                {audit.optimizedMeta.description}
              </div>
            </div>

            <div>
              <span className="text-emerald-300 font-mono font-semibold">추천 키워드 (LLM Semantic Context):</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {audit.optimizedMeta.keywords.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Code className="w-4 h-4 text-indigo-400" />
            HTML &lt;head&gt; 적용 코드 스니펫
          </div>
          <button
            onClick={() => handleCopy(metaHtmlCode, 'full-code')}
            className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium flex items-center gap-1"
          >
            {copiedSection === 'full-code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            전체 코드 복사
          </button>
        </div>

        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-300 border border-slate-800 overflow-x-auto leading-relaxed">
          {metaHtmlCode}
        </pre>
      </div>
    </div>
  );
};
