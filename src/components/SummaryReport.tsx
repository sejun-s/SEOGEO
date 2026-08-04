import React, { useState } from 'react';
import type { AuditResult, CriteriaItem } from '../types';
import { FileText, AlertTriangle, Lightbulb, CheckCircle, ChevronDown, ArrowRight } from 'lucide-react';

interface Props {
  audit: AuditResult;
  onNavigateToDetail?: (category: string, criteriaId: string) => void;
}


function shortImprovement(item: CriteriaItem): string {
  const first = item.improvement.split('\n')[0].replace(/^[①②③\s]+/, '').trim();
  return first.length > 70 ? first.slice(0, 70) + '…' : first;
}

interface GroupProps {
  items: CriteriaItem[];
  color: 'rose' | 'amber' | 'emerald';
  icon: React.ReactNode;
  label: string;
  clickable: boolean;
  onNavigate?: (category: string, id: string) => void;
}

function ItemGroup({ items, color, icon, label, clickable, onNavigate }: GroupProps) {
  if (items.length === 0) return null;

  const borderCls  = color === 'rose' ? 'border-rose-500/15' : color === 'amber' ? 'border-amber-500/15' : 'border-emerald-500/15';
  const bgCls      = color === 'rose' ? 'bg-rose-500/5'      : color === 'amber' ? 'bg-amber-500/5'      : 'bg-emerald-500/5';
  const labelCls   = color === 'rose' ? 'text-rose-400'       : color === 'amber' ? 'text-amber-400'       : 'text-emerald-400';
  const itemHover  = color === 'rose'
    ? 'hover:bg-rose-500/8 hover:border-rose-500/30'
    : color === 'amber'
    ? 'hover:bg-amber-500/8 hover:border-amber-500/30'
    : '';
  const nameCls    = color === 'rose' ? 'text-rose-300'       : color === 'amber' ? 'text-amber-300'       : 'text-emerald-300';

  return (
    <div className={`rounded-xl border ${borderCls} ${bgCls} p-3 space-y-1.5`}>
      <div className={`flex items-center gap-1.5 ${labelCls} text-[11px] font-semibold mb-2`}>
        {icon}{label}
        <span className="ml-auto text-[10px] font-mono opacity-60">{items.length}개</span>
      </div>
      {items.map((item) =>
        clickable ? (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.category, item.id)}
            className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-lg border border-transparent transition-all ${itemHover} group`}
          >
            <span className={`text-[11px] font-semibold shrink-0 mt-0.5 ${nameCls}`}>[{item.name}]</span>
            <span className="text-[11px] text-slate-400 leading-relaxed flex-1 min-w-0">{shortImprovement(item)}</span>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <div key={item.id} className="flex items-start gap-2 px-2 py-1">
            <span className={`text-[11px] font-semibold shrink-0 mt-0.5 ${nameCls}`}>[{item.name}]</span>
            <span className="text-[11px] text-slate-500 leading-relaxed flex-1 min-w-0">{item.currentState}</span>
          </div>
        )
      )}
    </div>
  );
}

export const SummaryReport: React.FC<Props> = ({ audit, onNavigateToDetail }) => {
  const [open, setOpen] = useState(true);

  const criteria = audit.criteria ?? [];
  const critical  = criteria.filter(c => c.priority === 'critical' && c.status !== 'pass');
  const high      = criteria.filter(c => (c.priority === 'high' || c.priority === 'medium') && c.status !== 'pass');
  const passing   = criteria.filter(c => c.status === 'pass');

  if (criteria.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-sm font-semibold text-white">종합 리포트</span>
          {!open && (
            <div className="flex items-center gap-2 ml-1">
              {critical.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400">
                  즉시 개선 {critical.length}개
                </span>
              )}
              {high.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
                  빠른 개선 {high.length}개
                </span>
              )}
            </div>
          )}
          {open && (
            <span className="text-[10px] text-slate-600 ml-1">항목 클릭 → 상세로 이동</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/8 pt-4 space-y-3 animate-fadeIn">
          <ItemGroup
            items={critical}
            color="rose"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="즉시 개선"
            clickable
            onNavigate={onNavigateToDetail}
          />
          <ItemGroup
            items={high}
            color="amber"
            icon={<Lightbulb className="w-3.5 h-3.5" />}
            label="빠른 개선"
            clickable
            onNavigate={onNavigateToDetail}
          />
          <ItemGroup
            items={passing}
            color="emerald"
            icon={<CheckCircle className="w-3.5 h-3.5" />}
            label="현재 강점"
            clickable={false}
          />
        </div>
      )}
    </div>
  );
};
