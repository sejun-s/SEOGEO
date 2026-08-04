import React from 'react';
import type { AuditResult } from '../../types';
import { ShieldCheck, Award, UserCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface EEATTabProps {
  audit: AuditResult;
}

export const EEATTab: React.FC<EEATTabProps> = ({ audit }) => {
  return (
    <div className="space-y-6">
      <div className="glass-card p-5 border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Google E-E-A-T & People-First Content 평가 리포트
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Google AI 가이드라인: 단순히 AI가 요약 가능한 정보(Commodity)가 아닌, 실제 경험과 전문성이 검증된 독창적 콘텐츠인지 평가합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm border-b border-slate-800 pb-3">
            <UserCheck className="w-4 h-4" />
            저자 전문성 신호 (Expertise & Experience Signatures)
          </div>

          <div className="text-xs space-y-3">
            <div>
              <span className="text-slate-400 font-mono">저자 / 검수자 표기:</span>
              <div className="text-slate-200 font-medium text-sm mt-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                {audit.eeatAnalysis.authorName || '저자/전문가 프로필 정보 없음 (추가 필요)'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-mono">전문성 신증 요소 (Expertise Signals):</span>
              <div className="space-y-1.5 mt-1">
                {audit.eeatAnalysis.expertiseSignatures.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-emerald-950/30 text-emerald-300 p-2 rounded border border-emerald-800/40">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm border-b border-slate-800 pb-3">
            <Award className="w-4 h-4" />
            신뢰성 신호 & 독창성 평가 (Trust & Non-Commodity)
          </div>

          <div className="text-xs space-y-3">
            <div>
              <span className="text-slate-400 font-mono">신뢰 보증 신호 (Trust Signals):</span>
              <div className="space-y-1.5 mt-1">
                {audit.eeatAnalysis.trustSignals.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-cyan-950/30 text-cyan-300 p-2 rounded border border-cyan-800/40">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-mono">Google Non-Commodity (독창적 가치) 판정:</span>
              <div className="text-slate-200 font-medium mt-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                {audit.eeatAnalysis.originalityAssessment}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 border-indigo-500/20">
        <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          에이전트 권장 E-E-A-T 개선 조치 항목
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {audit.eeatAnalysis.improvementSuggestions.map((sug, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-start gap-2">
              <span className="font-mono text-indigo-400 font-bold">#{i + 1}</span>
              <span>{sug}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
