import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, Printer, X } from 'lucide-react'
import type { AuditResult } from '../types'
import { buildReportHtml, reportFileName } from '../lib/reportHtml'

function reportBlob(html: string) {
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}

export function ReportActions({ audit }: { audit: AuditResult }) {
  const [isOpen, setIsOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const html = useMemo(() => buildReportHtml(audit), [audit])

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const print = () => {
    const reportWindow = iframeRef.current?.contentWindow
    if (!reportWindow) return
    reportWindow.focus()
    reportWindow.print()
  }

  const download = () => {
    const url = URL.createObjectURL(reportBlob(html))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = reportFileName(audit)
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  return <>
    <section className="v04-report-bar">
      <div><span><FileText size={17} /> HTML 보고서</span><p>분석 결과를 확인하고 PDF 또는 HTML로 저장하세요.</p></div>
      <div className="v04-report-actions"><button onClick={() => setIsOpen(true)}><FileText size={15} /> 보고서 보기</button><button onClick={download}><Download size={15} /> HTML 저장</button></div>
    </section>

    {isOpen && <div className="v04-report-modal" role="dialog" aria-modal="true" aria-label="SEO GEO 분석 보고서 미리보기" onMouseDown={event => { if (event.target === event.currentTarget) setIsOpen(false) }}>
      <div className="v04-report-window">
        <header>
          <div><strong>HTML 보고서 미리보기</strong><span>{audit.url.replace(/^https?:\/\//, '')}</span></div>
          <div>
            <button onClick={download}><Download size={15} /> HTML 저장</button>
            <button className="primary" onClick={print}><Printer size={15} /> PDF로 인쇄</button>
            <button className="close" onClick={() => setIsOpen(false)} aria-label="보고서 닫기"><X size={18} /></button>
          </div>
        </header>
        <iframe ref={iframeRef} title={`${audit.title} SEO GEO 보고서`} srcDoc={html} />
      </div>
    </div>}
  </>
}
