import React, { useState } from 'react';
import type { PageSignals } from '../types';
import { KeyRound, Check, AlertTriangle, Save, Trash2 } from 'lucide-react';

interface GA4Account {
  measurementId: string;
  propertyId: string;
}

const STORAGE_KEY = 'ga4-account';

function load(): GA4Account {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { measurementId: '', propertyId: '' };
  } catch {
    return { measurementId: '', propertyId: '' };
  }
}

interface Props {
  signals?: PageSignals | null;
}

export const GA4AccountCard: React.FC<Props> = ({ signals }) => {
  const [account, setAccount] = useState<GA4Account>(load);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setAccount({ measurementId: '', propertyId: '' });
    localStorage.removeItem(STORAGE_KEY);
  };

  const detectedId = signals?.ga4MeasurementId;
  const matchesDetected =
    !!detectedId &&
    !!account.measurementId &&
    account.measurementId.toUpperCase() === detectedId.toUpperCase();

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
        <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 grid place-items-center shadow-sm"><KeyRound className="w-4 h-4 text-blue-800" /></span>
        <div>
          <div className="text-sm font-extrabold text-slate-900">GA4 계정 입력</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Measurement ID와 Property ID를 등록하면 심층 데이터 연동이 가능합니다
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="p-5 space-y-4">
        {/* Measurement ID */}
        <div>
          <label className="text-[11px] text-slate-400 font-medium block mb-1.5">
            Measurement ID
          </label>
          <input
            type="text"
            value={account.measurementId}
            onChange={(e) => setAccount((a) => ({ ...a, measurementId: e.target.value }))}
            placeholder="G-XXXXXXXXXX"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors font-mono"
          />

          {/* Detected hint */}
          {detectedId && !account.measurementId && (
            <button
              onClick={() => setAccount((a) => ({ ...a, measurementId: detectedId }))}
              className="mt-1.5 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              ↑ 현재 페이지에서 감지된 ID 사용: {detectedId}
            </button>
          )}

          {/* Match status */}
          {detectedId && account.measurementId && (
            <div
              className={`mt-1.5 text-[10px] flex items-center gap-1 ${
                matchesDetected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {matchesDetected ? (
                <>
                  <Check className="w-3 h-3" /> 감지된 ID와 일치합니다
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> 감지된 ID와 다릅니다 (감지:{' '}
                  {detectedId})
                </>
              )}
            </div>
          )}
        </div>

        {/* Property ID */}
        <div>
          <label className="text-[11px] text-slate-400 font-medium block mb-1.5">
            Property ID
          </label>
          <input
            type="text"
            value={account.propertyId}
            onChange={(e) => setAccount((a) => ({ ...a, propertyId: e.target.value }))}
            placeholder="123456789"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors font-mono"
          />
          <p className="mt-1 text-[10px] text-slate-600">
            Google Analytics → 관리 → 속성 → 속성 세부정보에서 확인
          </p>
        </div>
      </div>

      {/* What this enables */}
      <div className="mx-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
        <div className="text-[11px] font-extrabold text-slate-900">입력 후 연동 가능한 데이터</div>
        <div className="text-[11px] text-slate-400 space-y-1">
          <div>• 세션 수 · 사용자 수 · 이탈률</div>
          <div>• 상위 방문 페이지 및 채널별 트래픽</div>
          <div>• 전환 이벤트 목록 및 달성률</div>
        </div>
        <p className="text-[10px] text-slate-600 pt-1">
          ※ 현재는 저장만 됩니다. GA4 Data API 연동은 추후 업데이트 예정
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-4 mt-5 border-t border-slate-200 bg-slate-50">
        <button
          onClick={handleSave}
          className="btn-purple text-xs px-4 py-2 gap-1.5 !rounded-xl flex-1"
        >
          {saved ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saved ? '저장됨' : '저장'}
        </button>
        {(account.measurementId || account.propertyId) && (
          <button
            onClick={handleClear}
            className="text-xs px-3 py-2 rounded-xl border border-white/10 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            초기화
          </button>
        )}
      </div>
    </div>
  );
};
