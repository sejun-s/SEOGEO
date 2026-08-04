import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, X, Key, Eye, EyeOff, CheckCircle, AlertCircle, Trash2, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'seo-analyzer-gemini-key';

function maskKey(key: string) {
  if (key.length < 12) return '••••••••';
  return key.slice(0, 6) + '••••••••' + key.slice(-4);
}

export const SettingsPanel: React.FC = () => {
  const [open, setOpen]         = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [stored, setStored]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setStored(localStorage.getItem(STORAGE_KEY)); }, [open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);

  function handleSave() {
    const key = inputVal.trim();
    if (!key) return;
    localStorage.setItem(STORAGE_KEY, key);
    setStored(key);
    setInputVal('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleRemove() {
    localStorage.removeItem(STORAGE_KEY);
    setStored(null);
    setInputVal('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setOpen(false);
  }

  const modal = open ? createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }}
        onClick={() => setOpen(false)}
      />

      {/* Modal card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} color="#60a5fa" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Gemini API 키 설정</span>
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
              background: 'rgba(16,185,129,0.15)', color: '#34d399',
              border: '1px solid rgba(16,185,129,0.25)', fontFamily: 'monospace',
            }}>무료</span>
          </div>
          <button onClick={() => setOpen(false)} title="설정 창 닫기" aria-label="설정 창 닫기" style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Current key status */}
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            현재 사용 중인 키
          </div>
          {stored ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={14} color="#34d399" />
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#34d399' }}>{maskKey(stored)}</span>
              </div>
              <button
                onClick={handleRemove}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={12} /> 삭제
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} color="#fbbf24" />
              <span style={{ fontSize: '12px', color: '#fbbf24' }}>키 없음 — 아래에서 입력해주세요</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
            {stored ? 'API 키 교체' : 'Gemini API 키 입력'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showKey ? 'text' : 'password'}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="AIzaSy..."
              style={{
                width: '100%',
                padding: '10px 40px 10px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={!inputVal.trim()}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              cursor: inputVal.trim() ? 'pointer' : 'not-allowed',
              background: inputVal.trim() ? '#2563eb' : 'rgba(255,255,255,0.06)',
              color: inputVal.trim() ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
          >
            {saved ? '✅ 저장됨' : '저장'}
          </button>
        </div>

        {/* Get key guide */}
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
          <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600, marginBottom: '6px' }}>Gemini API 키 무료 발급</div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#93c5fd', fontFamily: 'monospace', textDecoration: 'none' }}
          >
            aistudio.google.com/app/apikey <ExternalLink size={11} />
          </a>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
            Google 계정 로그인 → "Create API key" → 복사
          </div>
        </div>

        {/* Priority */}
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>키 우선순위</div>
          <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <li>여기서 저장한 키 (개인/회사 계정 전환 가능)</li>
            <li>서버 환경변수 <code style={{ color: '#94a3b8', fontFamily: 'monospace' }}>GEMINI_API_KEY</code></li>
          </ol>
          <div style={{ fontSize: '10px', color: '#334155', marginTop: '6px' }}>키는 localStorage에만 저장되며 서버로만 전송됩니다.</div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/12
                   text-slate-400 hover:text-white hover:bg-white/12 transition-all text-xs font-medium"
        title="Gemini API 키 설정"
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">설정</span>
      </button>

      {modal}
    </>
  );
};
