import React, { useState } from 'react';
import type { AuditResult } from '../types';
import { Trash2, Globe, ChevronRight, Zap, Swords, CheckSquare, Square, Star, Shield, Server } from 'lucide-react';
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
  // v0.7: 경쟁사 태깅
  competitorUrls: string[];
  onToggleCompetitorUrl: (url: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span title={`종합 점수 ${score}점 / 100점`} aria-label={`종합 점수 ${score}점`} className="sidebar-score-badge text-[11px] font-mono font-extrabold px-2.5 py-1 rounded-full border whitespace-nowrap">
      {score}점
    </span>
  );
}

/** 섹션 헤더 */
function GroupLabel({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-1 pt-3 pb-1">
      <span className="text-slate-600">{icon}</span>
      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] text-slate-700 ml-auto">{count}</span>
    </div>
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
  competitorUrls,
  onToggleCompetitorUrl,
}) => {
  const [adminOpen, setAdminOpen] = useState(false);

  // v0.7: 3개 그룹으로 분류
  const myCompanyAudits = history.filter((a) => a.url === myCompanyUrl);
  const competitorAudits = history.filter(
    (a) => competitorUrls.includes(a.url) && a.url !== myCompanyUrl,
  );
  const otherAudits = history.filter(
    (a) => a.url !== myCompanyUrl && !competitorUrls.includes(a.url),
  );

  const renderCard = (audit: AuditResult) => {
    const isSelected = (audit.url ?? '') === (selectedAuditUrl ?? '');
    const isChecked = (compareUrls ?? []).includes(audit.url ?? '');
    const isMyCompany = (audit.url ?? '') === (myCompanyUrl ?? '');
    const isCompetitor = competitorUrls.includes(audit.url ?? '');

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
        className={`sidebar-history-card group flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
          compareMode && isChecked
            ? 'active'
            : isSelected && !compareMode
            ? 'active'
            : ''
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

        {/* 태그 버튼 그룹 (비교모드 아닐 때) */}
        {!compareMode && (
          <div className="shrink-0 flex flex-col gap-0.5">
            {/* 우리 회사 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // 우리 회사로 설정하면 경쟁사 태그 해제
                if (!isMyCompany && isCompetitor) onToggleCompetitorUrl(audit.url);
                onSetMyCompany(isMyCompany ? null : audit.url);
              }}
              title={isMyCompany ? '우리 회사 해제' : '우리 회사로 설정'}
              aria-label={isMyCompany ? '우리 회사 해제' : '우리 회사로 설정'}
              className={`p-0.5 transition-all ${
                isMyCompany
                  ? 'text-amber-400 opacity-100'
                  : 'text-white/50 opacity-0 group-hover:opacity-100 hover:text-amber-400'
              }`}
            >
              <Star className={`w-3 h-3 ${isMyCompany ? 'fill-amber-400' : ''}`} />
            </button>
            {/* 경쟁사 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // 경쟁사로 설정하면 우리 회사 태그 해제
                if (!isCompetitor && isMyCompany) onSetMyCompany(null);
                onToggleCompetitorUrl(audit.url);
              }}
              title={isCompetitor ? '경쟁사 해제' : '경쟁사로 태그'}
              aria-label={isCompetitor ? '경쟁사 해제' : '경쟁사로 태그'}
              className={`p-0.5 transition-all ${
                isCompetitor
                  ? 'text-rose-400 opacity-100'
                  : 'text-white/50 opacity-0 group-hover:opacity-100 hover:text-rose-400'
              }`}
            >
              <Shield className={`w-3 h-3 ${isCompetitor ? 'fill-rose-400' : ''}`} />
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-medium text-slate-200 truncate">{audit.title}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-slate-500 font-mono truncate">
              {audit.url.replace(/^https?:\/\//, '')}
            </span>
            {audit.pageSignals?.shopify && (
              <span
                title="Shopify 스토어 감지"
                className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold leading-none"
              >
                Shopify
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {!compareMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveHistory(audit.url); }}
              title="분석 이력 삭제"
              aria-label="분석 이력 삭제"
              className="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white transition-all p-0.5"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <ScoreBadge score={audit.overallScore} />
          {!compareMode && <ChevronRight className="w-3 h-3 text-white/80" />}
        </div>
      </div>
    );
  };

  return (
    <aside className="v03-sidebar w-full md:w-64 lg:w-72 shrink-0 flex flex-col p-4 overflow-y-auto">
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
              className={`sidebar-compare-button flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border transition-all font-bold ${compareMode ? 'active' : ''}`}
            >
              <Swords className="w-3 h-3" />
              {compareMode ? '취소' : '비교 분석'}
            </button>
          )}
        </div>

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

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs leading-relaxed">
              아직 분석한 사이트가 없습니다
              <br />URL을 입력해서 분석을 시작하세요
            </div>
          ) : compareMode ? (
            /* 비교 모드: 그룹 없이 전체 목록 */
            <div className="space-y-1">{history.map(renderCard)}</div>
          ) : (
            /* 일반 모드: 우리 회사 / 경쟁사 / 기타 그룹 */
            <>
              {myCompanyAudits.length > 0 && (
                <div>
                  <GroupLabel
                    icon={<Star className="w-3 h-3 fill-amber-500 text-amber-500" />}
                    label="우리 회사"
                    count={myCompanyAudits.length}
                  />
                  <div className="space-y-1">{myCompanyAudits.map(renderCard)}</div>
                </div>
              )}

              {competitorAudits.length > 0 && (
                <div>
                  <GroupLabel
                    icon={<Shield className="w-3 h-3 fill-rose-500 text-rose-500" />}
                    label="경쟁사"
                    count={competitorAudits.length}
                  />
                  <div className="space-y-1">{competitorAudits.map(renderCard)}</div>
                </div>
              )}

              {otherAudits.length > 0 && (
                <div>
                  {(myCompanyAudits.length > 0 || competitorAudits.length > 0) && (
                    <GroupLabel
                      icon={<Globe className="w-3 h-3 text-slate-500" />}
                      label="기타"
                      count={otherAudits.length}
                    />
                  )}
                  <div className="space-y-1">{otherAudits.map(renderCard)}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 태그 안내 (비교모드 아닐 때, 기록 2개 이상) */}
        {!compareMode && history.length >= 2 && (
          <div className="text-[9px] text-slate-700 px-1 pt-1 leading-relaxed">
            ★ = 우리 회사 &nbsp;·&nbsp; 🛡 = 경쟁사 (카드 호버 시 표시)
          </div>
        )}
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
