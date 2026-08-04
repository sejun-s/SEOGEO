import React, { useState } from 'react';
import type { AuditResult } from '../../types';
import { Database, Check, Copy, Sparkles, ExternalLink, Code, Share2 } from 'lucide-react';

interface SchemaGeneratorTabProps {
  audit: AuditResult;
}

export const SchemaGeneratorTab: React.FC<SchemaGeneratorTabProps> = ({ audit }) => {
  const [copied, setCopied] = useState(false);
  const [schemaType, setSchemaType] = useState<'graph' | 'product' | 'faq'>('graph');

  const handleCopy = () => {
    navigator.clipboard.writeText(audit.generatedSchemaJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 border-purple-500/30 bg-purple-950/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Schema.org @graph & Linked Data (JSON-LD) 생성기
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Schema.org 공식 명세: 단순 단일 스키마가 아닌 <code className="bg-slate-800 text-purple-300 px-1 py-0.5 rounded font-mono">@graph</code> 구조로 Product, Organization, FAQ, sameAs (Wikidata)를 상호 결합합니다.
              </p>
            </div>
          </div>

          <a
            href="https://search.google.com/test/rich-results?hl=ko"
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-2 rounded-xl bg-purple-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-600/40 transition-colors flex items-center gap-1.5 font-medium"
          >
            Google Rich Results 테스트 실행
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setSchemaType('graph')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            schemaType === 'graph'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          @graph 통합 지식 엔티티 (권장)
        </button>
        <button
          onClick={() => setSchemaType('product')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            schemaType === 'product'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Product & Offer 스키마
        </button>
        <button
          onClick={() => setSchemaType('faq')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            schemaType === 'faq'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          FAQPage 스키마
        </button>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Code className="w-4 h-4 text-purple-400" />
            &lt;script type="application/ld+json"&gt;
          </div>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-purple-900/40"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사 완료!' : 'JSON-LD @graph 스키마 복사'}
          </button>
        </div>

        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-purple-300 border border-slate-800 overflow-x-auto leading-relaxed max-h-96">
          {`<script type="application/ld+json">\n${audit.generatedSchemaJson}\n</script>`}
        </pre>
      </div>

      <div className="glass-card p-5 border-indigo-500/20">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-indigo-300">
          <Share2 className="w-4 h-4" />
          sameAs 외부 지식 그래프 연결 상태 (Wikidata / Social Profiles)
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="text-slate-300 font-mono">
            <strong>Linked Entities:</strong>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {audit.eeatAnalysis.sameAsProfiles.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded bg-purple-950/60 text-purple-300 border border-purple-700/50 hover:underline flex items-center gap-1 font-mono"
              >
                🔗 {url}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 border-indigo-500/20">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-indigo-300">
          <Sparkles className="w-4 h-4" />
          Google 검색 스니펫 / Rich Snippet Preview
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
            {audit.url}
          </div>
          <div className="text-sm font-bold text-indigo-400 hover:underline cursor-pointer">
            {audit.optimizedMeta.title}
          </div>
          <p className="text-xs text-slate-300">
            {audit.optimizedMeta.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-amber-400 pt-2 border-t border-slate-800 font-mono">
            <span>★★★★★ 4.9 (1,280건)</span>
            <span>• ₩49,000</span>
            <span className="text-emerald-400">재고 있음 (InStock)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
