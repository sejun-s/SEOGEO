import React from 'react';
import type { AuditResult, DetailTabType } from '../types';
import { CriteriaDetail } from './CriteriaDetail';
import { BotPolicyTab } from './Tabs/BotPolicyTab';
import { EEATTab } from './Tabs/EEATTab';
import { AcademicGeoTab } from './Tabs/AcademicGeoTab';
import { SchemaGeneratorTab } from './Tabs/SchemaGeneratorTab';
import { AEOCitationTab } from './Tabs/AEOCitationTab';
import { CMSApplyTab } from './Tabs/CMSApplyTab';
import { AnalysisSummaryTable } from './AnalysisSummaryTable';
import { ArrowLeft, BookOpen, ShieldCheck, Database, Zap, Cpu, Bot } from 'lucide-react';

interface DetailPageProps {
  audit: AuditResult;
  activeTab: DetailTabType;
  onSelectTab: (tab: DetailTabType) => void;
  onBackToOverview: () => void;
  onToggleFix: (metricId: string) => void;
  autoExpandId?: string;
}

const TABS: { id: DetailTabType; label: string; icon: React.ReactNode; categoryFilter: string }[] = [
  { id: 'technical', label: 'Technical SEO', icon: <Cpu className="w-4 h-4" />, categoryFilter: 'technical' },
  { id: 'chatgpt',   label: 'ChatGPT Search', icon: <Bot className="w-4 h-4" />, categoryFilter: 'chatgpt' },
  { id: 'geo',       label: '학술 GEO',        icon: <BookOpen className="w-4 h-4" />, categoryFilter: 'geo' },
  { id: 'eeat',      label: 'E-E-A-T',         icon: <ShieldCheck className="w-4 h-4" />, categoryFilter: 'eeat' },
  { id: 'schema',    label: 'Schema.org',       icon: <Database className="w-4 h-4" />, categoryFilter: 'schema' },
  { id: 'cms',       label: 'Bing & AEO',       icon: <Zap className="w-4 h-4" />, categoryFilter: 'bing' },
];

export const DetailPage: React.FC<DetailPageProps> = ({
  audit,
  activeTab,
  onSelectTab,
  onBackToOverview,
  onToggleFix,
  autoExpandId,
}) => {
  const activeTabConfig = TABS.find((t) => t.id === activeTab);
  const hasCriteria = (audit.criteria?.length ?? 0) > 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Breadcrumb / Back */}
      <div className="glass-card p-3.5 flex items-center justify-between gap-3">
        <button
          onClick={onBackToOverview}
          className="btn-white py-2 px-4 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
          대시보드로 돌아가기
        </button>
        <div className="text-xs font-mono text-slate-400 truncate hidden sm:block">
          {audit.url}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area: AI Criteria + Legacy Tab Content */}
      <div className="space-y-5">
        {/* AI 기준별 분석 패널 (AI 분석 데이터가 있을 때) */}
        {hasCriteria && activeTabConfig && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-500 to-cyan-500" />
              <h3 className="text-sm font-bold text-white">
                Claude AI 기준별 상세 분석
              </h3>
              <span className="text-[11px] text-slate-400">— 각 항목의 점수 근거와 개선 방안 포함</span>
            </div>
            <CriteriaDetail
              criteria={audit.criteria ?? []}
              categoryFilter={activeTabConfig.categoryFilter}
              autoExpandId={autoExpandId}
            />
          </div>
        )}

        {/* Legacy Tab Content */}
        <div className="space-y-3">
          {hasCriteria && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-blue-500" />
              <h3 className="text-sm font-bold text-white">상세 분석 데이터</h3>
            </div>
          )}
          <div className="transition-all duration-300">
            {activeTab === 'technical' && <BotPolicyTab audit={audit} />}
            {activeTab === 'chatgpt' && <AEOCitationTab audit={audit} />}
            {activeTab === 'geo' && <AcademicGeoTab audit={audit} />}
            {activeTab === 'eeat' && <EEATTab audit={audit} />}
            {activeTab === 'schema' && <SchemaGeneratorTab audit={audit} />}
            {activeTab === 'cms' && <CMSApplyTab />}
          </div>
        </div>

        {/* Metrics Summary Table */}
        {audit.metrics && audit.metrics.length > 0 && (
          <AnalysisSummaryTable audit={audit} onToggleFix={onToggleFix} />
        )}
      </div>
    </div>
  );
};
