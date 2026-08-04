import { Download, FileText, Printer } from 'lucide-react'
import type { AuditResult } from '../types'
import { buildReportHtml, reportFileName } from '../lib/reportHtml'

function reportBlob(audit: AuditResult) {
  return new Blob([buildReportHtml(audit)], { type: 'text/html;charset=utf-8' })
}

export function ReportActions({ audit }: { audit: AuditResult }) {
  const preview = () => {
    const url = URL.createObjectURL(reportBlob(audit))
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const download = () => {
    const url = URL.createObjectURL(reportBlob(audit))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = reportFileName(audit)
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  return <section className="v04-report-bar">
    <div><span><FileText size={17} /> HTML 보고서</span><p>분석 결과를 공유하거나 브라우저에서 PDF로 인쇄하세요.</p></div>
    <div className="v04-report-actions"><button onClick={preview}><Printer size={15} /> 보고서 열기</button><button onClick={download}><Download size={15} /> HTML 저장</button></div>
  </section>
}
