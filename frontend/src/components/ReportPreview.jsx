import { useState } from 'react'

export default function ReportPreview({ narrative, calculation, projectData, isQuick, onDownload, onBack }) {
  const [downloading, setDownloading] = useState(null)

  async function handle(fmt) {
    setDownloading(fmt)
    await onDownload(fmt)
    setDownloading(null)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-stone-900">Report ready</h2>
        {isQuick && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Internal working paper</span>}
        <span className="ml-auto text-xs text-stone-400">
          Generated via {narrative?.source === 'template' ? 'structured template' : `AI (${narrative?.source})`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button onClick={() => handle('docx')} disabled={downloading === 'docx'}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {downloading === 'docx' ? 'Generating...' : '⬇ Download Word (.docx)'}
        </button>
        <button onClick={() => handle('pdf')} disabled={downloading === 'pdf'}
          className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
          {downloading === 'pdf' ? 'Converting...' : '⬇ Download PDF'}
        </button>
      </div>
      <div className={`bg-white border rounded-xl p-6 ${isQuick ? 'border-amber-200' : 'border-stone-200'}`}>
        {isQuick && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium text-center">
            ⚠ INTERNAL WORKING PAPER — NOT FOR SUBMISSION TO ENGINEER
          </div>
        )}
        <pre className="whitespace-pre-wrap text-sm text-stone-700 font-mono leading-relaxed">
          {narrative?.narrative}
        </pre>
      </div>
    </div>
  )
}
