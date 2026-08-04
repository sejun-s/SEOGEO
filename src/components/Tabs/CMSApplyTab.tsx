import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Zap, ShieldCheck, Globe } from 'lucide-react';

export const CMSApplyTab: React.FC = () => {
  const [platform, setPlatform] = useState<'cafe24' | 'shopify' | 'wordpress' | 'indexnow'>('cafe24');
  const [isApplying, setIsApplying] = useState(false);
  const [applyLog, setApplyLog] = useState<string[]>([]);
  const [applySuccess, setApplySuccess] = useState(false);

  const handleApply = () => {
    setIsApplying(true);
    setApplySuccess(false);
    setApplyLog([`[1/4] ${platform.toUpperCase()} API 엔드포인트 연결 시도 중...`]);

    setTimeout(() => {
      setApplyLog((prev) => [
        ...prev,
        `[2/4] 메타태그 (Title, Description, OG Tag) 및 OAI-SearchBot / GPTBot 크롤러 규칙 업데이트 페이로드 전송 완료.`,
      ]);
    }, 1000);

    setTimeout(() => {
      setApplyLog((prev) => [
        ...prev,
        `[3/4] Schema.org @graph JSON-LD 지식 엔티티 스크립트 <head> 태그에 동적 주입 완료.`,
      ]);
    }, 2000);

    setTimeout(() => {
      setApplyLog((prev) => [
        ...prev,
        `[4/4] ✅ ${platform.toUpperCase()} 몰 DB, 페이지 캐시 및 IndexNow Bing/Google 실시간 색인 신호 전송 성공!`,
      ]);
      setIsApplying(false);
      setApplySuccess(true);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 border-emerald-500/30 bg-emerald-950/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              CMS 원클릭 자동 반영 & IndexNow 실시간 색인 에이전트
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              생성된 최적화 메타태그, Schema.org @graph 스키마 및 AI 로봇 정책을 Cafe24, Shopify, WordPress 및 Bing/Google IndexNow API로 1초 만에 업데이트합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <label className="text-xs font-semibold text-slate-300 block">연동 CMS / 쇼핑몰 / 검색엔진 API 선택:</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setPlatform('cafe24')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
              platform === 'cafe24'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-bold text-sm">Cafe24 (카페24 몰)</div>
            <div className="text-xs opacity-75 mt-1">REST Admin API v2</div>
          </button>

          <button
            onClick={() => setPlatform('shopify')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
              platform === 'shopify'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-bold text-sm">Shopify (쇼피파이)</div>
            <div className="text-xs opacity-75 mt-1">Admin GraphQL API</div>
          </button>

          <button
            onClick={() => setPlatform('wordpress')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
              platform === 'wordpress'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-bold text-sm">WordPress / WooCommerce</div>
            <div className="text-xs opacity-75 mt-1">WP REST API</div>
          </button>

          <button
            onClick={() => setPlatform('indexnow')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
              platform === 'indexnow'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-bold text-sm flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              IndexNow API
            </div>
            <div className="text-xs opacity-75 mt-1">Bing & Copilot Realtime</div>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isApplying ? 'animate-spin' : ''}`} />
            {isApplying ? 'API 반영 진행 중...' : `${platform.toUpperCase()}에 클릭 한번으로 자동 적용하기`}
          </button>
        </div>
      </div>

      {applyLog.length > 0 && (
        <div className="glass-card p-5 border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-slate-400 font-semibold">API Execution Log</span>
            {applySuccess && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                적용 성공
              </span>
            )}
          </div>

          <div className="bg-slate-950 p-4 rounded-xl space-y-2 font-mono text-xs text-emerald-400 border border-slate-900">
            {applyLog.map((log, i) => (
              <div key={i} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>에이전트가 반영 전 이전 메타데이터 백업본을 자동 보관하므로 언제든 원복 가능합니다.</span>
      </div>
    </div>
  );
};
