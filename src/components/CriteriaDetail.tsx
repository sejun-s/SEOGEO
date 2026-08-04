import React, { useState, useRef, useEffect } from 'react';
import type { CriteriaItem } from '../types';
import {
  CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp,
  TrendingUp, BookOpen, Lightbulb, Target, ExternalLink, Info, Copy, Check
} from 'lucide-react';

function CodeBlock({ code, type }: { code: string; type?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const label = type === 'robots' ? 'robots.txt' : type === 'json' ? 'JSON-LD' : 'HTML';
  return (
    <div className="rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300">
        <span className="text-[11px] font-mono font-semibold text-slate-700">{label} — 복사 후 붙여넣기</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre className="p-4 text-[12px] text-slate-900 font-mono overflow-x-auto leading-6 whitespace-pre-wrap bg-white selection:bg-blue-200">
        {code}
      </pre>
    </div>
  );
}

interface CriteriaDetailProps {
  criteria: CriteriaItem[];
  categoryFilter?: string;
  autoExpandId?: string;
}

// 공식 가이드라인 문서 매핑
const REFERENCE_DOCS: Record<string, { shortName: string; url: string; color: string }> = {
  'how-search-works': {
    shortName: 'Google: How Search Works',
    url: 'https://developers.google.cn/search/docs/fundamentals/how-search-works',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  },
  'chatgpt-search': {
    shortName: 'OpenAI: ChatGPT Search Guide',
    url: 'https://help.openai.com/en/articles/9237897-chatgpt-search',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  },
  'arxiv-2311': {
    shortName: 'arXiv:2311.09735 — GEO Paper',
    url: 'https://arxiv.org/abs/2311.09735',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  },
  'arxiv-2509': {
    shortName: 'arXiv:2509.08919 — GEO 후속',
    url: 'https://arxiv.org/abs/2509.08919',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  },
  'gen-ai-content': {
    shortName: 'Google: Using Gen AI Content (E-E-A-T)',
    url: 'https://developers.google.com/search/docs/fundamentals/using-gen-ai-content',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/25',
  },
  'schema-org': {
    shortName: 'Schema.org 공식 사전',
    url: 'https://schema.org/',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  },
  'bing-guidelines': {
    shortName: 'Bing Webmaster Guidelines',
    url: 'https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a',
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
  },
  'google-ai-optimization': {
    shortName: 'Google: AI Optimization Guide',
    url: 'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
  },
};

// referenceGuide 문자열에서 관련 공식 문서 찾기
function findReferenceDocs(refText: string) {
  const matches: (typeof REFERENCE_DOCS)[string][] = [];
  const text = refText.toLowerCase();
  if (text.includes('how-search') || text.includes('how search works') || (text.includes('google') && text.includes('technical'))) {
    matches.push(REFERENCE_DOCS['how-search-works']);
  }
  if (text.includes('chatgpt') || text.includes('oai-searchbot') || text.includes('openai')) {
    matches.push(REFERENCE_DOCS['chatgpt-search']);
  }
  if (text.includes('2311') || text.includes('geo') || text.includes('generative engine')) {
    matches.push(REFERENCE_DOCS['arxiv-2311']);
  }
  if (text.includes('2509')) {
    matches.push(REFERENCE_DOCS['arxiv-2509']);
  }
  if (text.includes('e-e-a-t') || text.includes('eeat') || text.includes('gen ai content') || text.includes('using gen')) {
    matches.push(REFERENCE_DOCS['gen-ai-content']);
  }
  if (text.includes('schema.org') || text.includes('schema org') || text.includes('json-ld')) {
    matches.push(REFERENCE_DOCS['schema-org']);
  }
  if (text.includes('bing') || text.includes('indexnow') || text.includes('webmaster guidelines')) {
    matches.push(REFERENCE_DOCS['bing-guidelines']);
  }
  if (text.includes('ai optimization') || text.includes('ai-optimization') || text.includes('ai overview')) {
    matches.push(REFERENCE_DOCS['google-ai-optimization']);
  }
  // If URL is directly included
  if (text.includes('developers.google.cn') || text.includes('how-search-works')) {
    if (!matches.some(m => m.url.includes('how-search-works'))) matches.push(REFERENCE_DOCS['how-search-works']);
  }
  if (text.includes('ai-optimization-guide')) {
    if (!matches.some(m => m.url.includes('ai-optimization'))) matches.push(REFERENCE_DOCS['google-ai-optimization']);
  }
  return matches.length > 0 ? matches : null;
}

const STATUS_CONFIG = {
  pass:    { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, label: '양호',        cls: 'score-pass border' },
  warning: { icon: <AlertCircle className="w-4 h-4 text-amber-400" />,  label: '개선 권장',    cls: 'score-warning border' },
  fail:    { icon: <XCircle     className="w-4 h-4 text-rose-400" />,   label: '즉시 개선 필요', cls: 'score-fail border' },
};

const PRIORITY_CONFIG = {
  critical: { label: '긴급',  cls: 'priority-critical border' },
  high:     { label: '높음',  cls: 'priority-high border' },
  medium:   { label: '중간',  cls: 'priority-medium border' },
  low:      { label: '낮음',  cls: 'priority-low border' },
};

const WEIGHT_COLORS: Record<string, string> = {
  '높음': 'text-rose-400',
  '중간': 'text-amber-400',
  '낮음': 'text-slate-400',
};

function CriteriaCard({ item, autoExpand }: { item: CriteriaItem; autoExpand?: boolean }) {
  const [expanded, setExpanded] = useState(autoExpand ?? false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoExpand && cardRef.current) {
      const t = setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      return () => clearTimeout(t);
    }
  }, [autoExpand]);
  const status   = STATUS_CONFIG[item.status]   ?? STATUS_CONFIG.warning;
  const priority = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.medium;
  const weightColor = WEIGHT_COLORS[item.weight] ?? 'text-slate-400';
  const refDocs = findReferenceDocs(item.referenceGuide ?? '');

  const scoreColor =
    item.score >= 85 ? 'text-emerald-400' :
    item.score >= 70 ? 'text-amber-400' :
    'text-rose-400';
  const barColor =
    item.score >= 85 ? 'bg-emerald-500' :
    item.score >= 70 ? 'bg-amber-500' :
    'bg-rose-500';

  return (
    <div ref={cardRef} className={`glass-card overflow-hidden ${autoExpand ? 'ring-1 ring-purple-500/40' : ''}`}>
      {/* Card header — click to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-white/3 transition-colors cursor-pointer"
      >
        <div className="mt-0.5 shrink-0">{status.icon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{item.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.currentState}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${status.cls}`}>
                {item.score}점
              </span>
              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {/* Score bar + badges */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-700`}
                style={{ width: `${item.score}%` }}
              />
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${priority.cls}`}>
              {priority.label}
            </span>
            <span className={`text-[10px] font-semibold ${weightColor}`}>가중치 {item.weight}</span>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-white/8 animate-fadeIn">

          {/* Score reasoning */}
          <div className="p-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold mb-2">
              <Target className="w-3.5 h-3.5" />
              점수 근거 — 왜 <span className={`font-mono font-black ${scoreColor}`}>{item.score}점</span>인가
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{item.scoringBasis}</p>
          </div>

          {/* Official evaluation criteria */}
          <div className="p-3 rounded-xl bg-purple-500/8 border border-purple-500/15">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              공식 평가 기준
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{item.evaluationCriteria}</p>
          </div>

          {/* Improvement suggestion */}
          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-2">
              <Lightbulb className="w-3.5 h-3.5" />
              구체적 개선 방안
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{item.improvement}</p>
          </div>

          {/* Code snippet — 복붙 가능한 코드 */}
          {item.codeSnippet && item.status !== 'pass' && (
            <CodeBlock code={item.codeSnippet} type={item.codeType} />
          )}

          {/* Score gain */}
          {item.estimatedScoreGain > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-emerald-300">
                개선 완료 시 예상 점수 상승: <strong className="font-mono">+{item.estimatedScoreGain}점</strong>
              </span>
            </div>
          )}

          {/* Reference docs — clickable links */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
              <Info className="w-3 h-3" />
              평가 근거 공식 문서
            </div>
            {refDocs && refDocs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {refDocs.map((doc) => (
                  <a
                    key={doc.url}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border font-mono ${doc.color} hover:opacity-80 transition-opacity`}
                  >
                    {doc.shortName}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-mono">{item.referenceGuide}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 카테고리별 공식 문서 헤더
const CATEGORY_REF: Record<string, { title: string; docs: string[] }> = {
  technical: {
    title: 'Technical SEO 평가 기준',
    docs: ['how-search-works'],
  },
  chatgpt: {
    title: 'ChatGPT Search 평가 기준',
    docs: ['chatgpt-search'],
  },
  geo: {
    title: '학술 GEO 평가 기준',
    docs: ['arxiv-2311', 'arxiv-2509'],
  },
  eeat: {
    title: 'E-E-A-T 평가 기준',
    docs: ['gen-ai-content'],
  },
  schema: {
    title: 'Schema.org 평가 기준',
    docs: ['schema-org'],
  },
  bing: {
    title: 'Bing & AEO 평가 기준',
    docs: ['bing-guidelines', 'google-ai-optimization'],
  },
};

export const CriteriaDetail: React.FC<CriteriaDetailProps> = ({ criteria, categoryFilter, autoExpandId }) => {
  const filtered = categoryFilter
    ? criteria.filter((c) => c.category === categoryFilter)
    : criteria;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        이 카테고리에 대한 세부 기준 분석 데이터가 없습니다.
        <div className="text-xs mt-2 text-slate-600">URL을 입력하고 Claude AI 분석을 실행하면 기준별 상세 평가가 제공됩니다.</div>
      </div>
    );
  }

  const catRef = categoryFilter ? CATEGORY_REF[categoryFilter] : null;
  const sorted = [...filtered].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
  });

  return (
    <div className="space-y-3">
      {/* Category reference docs banner */}
      {catRef && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">{catRef.title} 근거 문서:</span>
          {catRef.docs.map((key) => {
            const doc = REFERENCE_DOCS[key];
            if (!doc) return null;
            return (
              <a
                key={key}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border font-mono ${doc.color} hover:opacity-80 transition-opacity`}
              >
                {doc.shortName}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>{filtered.length}개 평가 항목 (클릭하면 상세 근거 펼쳐짐)</span>
        <span className="font-mono">
          ✅ {filtered.filter(c => c.status === 'pass').length}
          &nbsp;⚠️ {filtered.filter(c => c.status === 'warning').length}
          &nbsp;❌ {filtered.filter(c => c.status === 'fail').length}
        </span>
      </div>

      {sorted.map((item) => (
        <CriteriaCard key={item.id} item={item} autoExpand={item.id === autoExpandId} />
      ))}
    </div>
  );
};
