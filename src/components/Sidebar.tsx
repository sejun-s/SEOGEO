import React, { useState } from 'react';
import type { AuditResult } from '../types';
import { Trash2, Globe, ChevronRight, Zap, Swords, CheckSquare, Square, Star, Server } from 'lucide-react';
import { SettingsPanel } from './Settings';
import { AdminPanel } from './AdminPanel';

interface SidebarProps {
  history: AuditResult[];
  selectedAuditUrl: string | null;
  onSelectAudit: (audit: AuditResult) => void;
  onRemoveHistory: (url: string) => void;
  onGoHome: () => void;
  compareMode: boolean;
  compareUrls: string[];
  onToggleCompareMode: () => void;
  onToggleCompareUrl: (url: string) => void;
  onStartCompare: () => void;
  myCompanyUrl: string | null;
  onSetMyCompany: (url: string | null) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 85
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
      : score >= 70
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
      : 'bg-rose-500/15 text-rose-300 border-rose-500/25';
  return (
    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {score}
    </span>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  history,
  selectedAuditUrl,
  onSelectAudit,
  onRemoveHistory,
  onGoHome,
  compareMode,
  compareUrls,
  onToggleCompareMode,
  onToggleCompareUrl,
  onStartCompare,
  myCompanyUrl,
  onSetMyCompany,
}) => {
  const [adminOpen, setAdminOpen] = useState(false);
  return (
    <aside className="w-full md:w-64 lg:w-72 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/60 backdrop-blur-2xl flex flex-col p-4 overflow-y-auto">
      {/* Brand */}
      <button
        onClick={onGoHome}
        title="메인으로"
        className="group flex items-center gap-3 pb-4 mb-4 border-b border-white/10 text-left w-full transition-all"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 group-hover:shadow-indigo-500/40 group-hover:scale-105 transition-all duration-200">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">AI SEO Analyzer</span>
          <div className="text-[9px] text-slate-700 group-hover:text-slate-500 transition-colors mt-0.5">클릭하면 메인으로</div>
        </div>
      </button>

      {/* History */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        {/* History header row */}
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="text-xs text-slate-500 font-medium flex-1">
            분석 기록 {history.length > 0 && <span className="text-slate-600">({history.length})</span>}
          </span>
          {history.length >= 2 && (
            <button
              onClick={onToggleCompareMode}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all font-medium ${
                compareMode
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                  : 'bg-purple-500/10 border-purple-500/25 text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              <Swords className="w-3 h-3" />
              {compareMode ? '취소' : '비교 분석'}
            </button>
          )}
        </div>

        {/* My company hint */}
        {myCompanyUrl && !compareMode && (
          <div className="px-2 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-[10px] text-amber-400 flex items-center gap-1.5">
            <Star className="w-3 h-3 fill-amber-400" />
            <span className="truncate">우리 회사 설정됨</span>
          </div>
        )}

        {/* Compare action bar */}
        {compareMode && (
          <div className="px-2 py-1.5 rounded-lg bg-purple-500/8 border border-purple-500/20 text-[10px] text-slate-400 flex items-center justify-between gap-2">
            <span>{compareUrls.length}개 선택됨 (최대 3개)</span>
            {compareUrls.length >= 2 && (
              <button
                onClick={onStartCompare}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:bg-purple-500/35 transition-all font-semibold"
              >
                비교 시작
              </button>
            )}
          </div>
        )}

        <div className="space-y-1 overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs leading-relaxed">
              아직 분석한 사이트가 없습니다
              <br />URL을 입력해서 분석을 시작하세요
            </div>
          ) : (
            history.map((audit) => {
              const isSelected = (audit.url ?? '') === (selectedAuditUrl ?? '');
              const isChecked = (compareUrls ?? []).includes(audit.url ?? '');
              const isMyCompany = (audit.url ?? '') === (myCompanyUrl ?? '');
              return (
                <div
                  key={audit.url}
                  onClick={() => {
                    if (compareMode) {
                      if (!isChecked && compareUrls.length >= 3) return;
                      onToggleCompareUrl(audit.url);
                    } else {
                      onSelectAudit(audit);
                    }
                  }}
                  className={`group flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    compareMode && isChecked
                      ? 'bg-purple-950/50 border-purple-500/40'
                      : isSelected && !compareMode
                      ? 'bg-purple-950/50 border-purple-500/40'
                      : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'
                  }`}
                >
                  {/* Checkbox in compare mode */}
                  {compareMode && (
                    <div className="shrink-0 text-slate-500">
                      {isChecked
                        ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                        : <Square className="w-3.5 h-3.5" />
                      }
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      {isMyCompany && (
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-slate-200 truncate">{audit.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                      {audit.url.replace(/^https?:\/\//, '')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <ScoreBadge score={audit.overallScore} />
                    {!compareMode && (
                      <>
                        {/* Star button — always visible when starred, on hover otherwise */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onSetMyCompany(isMyCompany ? null : audit.url); }}
                          title={isMyCompany ? '우리 회사 해제' : '우리 회사로 설정'}
                          aria-label={isMyCompany ? '우리 회사 해제' : '우리 회사로 설정'}
                          className={`p-0.5 transition-all ${
                            isMyCompany
                              ? 'text-amber-400 opacity-100'
                              : 'opacity-0 group-hover:opacity-100 text-slate-600 hover:text-amber-400'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${isMyCompany ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveHistory(audit.url); }}
                          title="분석 이력 삭제"
                          aria-label="분석 이력 삭제"
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ChevronRight className={`w-3 h-3 ${isSelected ? 'text-purple-400' : 'text-slate-700'}`} />
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Settings & Admin */}
      <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
        <SettingsPanel />
        <button
          onClick={() => setAdminOpen(true)}
          title="관리자 시스템 현황"
          aria-label="관리자 시스템 현황"
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-purple-300 hover:bg-white/10 transition-all font-mono"
        >
          <Server className="w-3.5 h-3.5 text-purple-400" />
          관리자
        </button>
      </div>

      <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </aside>
  );
};
