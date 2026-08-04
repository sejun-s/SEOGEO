import React from 'react';
import type { AuditResult } from '../../types';
import { BookOpen, CheckCircle2, Award, ExternalLink, Lightbulb } from 'lucide-react';

interface AcademicGeoTabProps {
  audit: AuditResult;
}

export const AcademicGeoTab: React.FC<AcademicGeoTabProps> = ({ audit }) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-5 border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-slate-900 to-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              학술 GEO (Generative Engine Optimization) 9-Factor 진단 모델
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              프린스턴 / 조지아텍 세계 최초 GEO 논문 (arXiv:2311.09735 & arXiv:2509.08919) 실증 검증 지표 기반 평가 리포트
            </p>
          </div>
        </div>
      </div>

      {/* ArXiv Papers Reference Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="https://arxiv.org/abs/2311.09735"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-xl bg-purple-950/60 text-purple-200 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 hover:bg-purple-900/60 transition-colors"
        >
          📄 arXiv:2311.09735 (GEO: Generative Engine Optimization)
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href="https://arxiv.org/abs/2509.08919"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-xl bg-purple-950/60 text-purple-200 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 hover:bg-purple-900/60 transition-colors"
        >
          📄 arXiv:2509.08919 (Benchmarking LLM Citation Visibility)
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* GEO Factors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {audit.geoFactors.map((factor, idx) => (
          <div key={idx} className="glass-card p-5 space-y-3 border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                {factor.name}
              </span>
              <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {factor.score}점
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {factor.description}
            </p>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
              <span className="font-mono text-slate-400">{factor.arxivReference}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-purple-300 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
              <span><strong>개선 액션:</strong> {factor.actionItem}</span>
            </div>
          </div>
        ))}
      </div>

      {/* GEO Academic Summary */}
      <div className="glass-card p-5 border-indigo-500/20">
        <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          GEO 논문이 입증한 AI 검색 노출 4대 황금 법칙
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <strong className="text-purple-300 block mb-1">1. 수치 데이터 추가 (+37% 노출 증가)</strong>
            단순 텍스트 설명보다 <strong>정확한 숫자, % 퍼센트, 측정 수치</strong>가 포함된 콘텐츠를 LLM이 가장 신뢰함.
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <strong className="text-purple-300 block mb-1">2. 학술/공식 인용구 삽입 (+30% 인용 상승)</strong>
            연구 논문, 정부 기관 고시, 전문가 직접 발언(Quotation)을 인용할 때 답변 수록 확률 급증.
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <strong className="text-purple-300 block mb-1">3. 불릿 포인트 구조화 (+25% 파싱 향상)</strong>
            긴 줄글 대신 3~5개의 불릿 포인트와 H2/H3 태그 구조화로 LLM 팩트 파서 접근 용이화.
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <strong className="text-purple-300 block mb-1">4. 전문 도메인 용어 (Technical Specificity)</strong>
            쉬운 일반어와 함께 업계 전문 명사 및 키워드를 정확히 기술하여 LLM 임베딩 유사도 상승.
          </div>
        </div>
      </div>
    </div>
  );
};
