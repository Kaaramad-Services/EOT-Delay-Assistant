import { useState } from 'react'
import ModeSelector from './components/ModeSelector'
import ProjectSetup from './components/ProjectSetup'
import FileUploader from './components/FileUploader'
import ExcelMapper from './components/ExcelMapper'
import DelayEventForm from './components/DelayEventForm'
import ManualEntry from './components/ManualEntry'
import ResultsDashboard from './components/ResultsDashboard'
import ReportPreview from './components/ReportPreview'

const STEPS = ['mode', 'project', 'upload', 'delays', 'results', 'report']

export default function App() {
  const [step, setStep] = useState('mode')
  const [mode, setMode] = useState(null) // 'p6' | 'excel' | 'manual'
  const [projectData, setProjectData] = useState({})
  const [uploadedData, setUploadedData] = useState(null)
  const [columnMapping, setColumnMapping] = useState(null)
  const [delayEvents, setDelayEvents] = useState([])
  const [calculation, setCalculation] = useState(null)
  const [narrative, setNarrative] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const go = (s) => { setError(null); setStep(s) }

  async function calculateEOT(events) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/calculate/eot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delayEvents: events, projectData })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCalculation(data)
      go('results')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function generateNarrative() {
    setLoading(true)
    try {
      const fidic = projectData.fidic
      const res = await fetch(`${API}/api/generate/narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectData, calculation: calculation?.summary, delayEvents, fidic })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNarrative(data)
      go('report')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function downloadReport(format) {
    setLoading(true)
    try {
      const fidic = projectData.fidic
      const res = await fetch(`${API}/api/report/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectData, calculation: calculation?.summary, delayEvents, fidic, narrative: narrative?.narrative })
      })
      if (!res.ok) throw new Error('Report generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EOT_Claim_${projectData.contractNumber || 'Report'}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-700 rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-stone-900">EOT & Delay Analysis Assistant</h1>
            <p className="text-xs text-stone-500">FIDIC-compliant claims preparation tool</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          {['mode','project','upload/manual','delays','results','report'].map((s, i) => (
            <span key={s} className={`flex items-center gap-1 ${step === STEPS[i] ? 'text-teal-700 font-medium' : ''}`}>
              {i > 0 && <span className="text-stone-300">›</span>}
              {s}
            </span>
          ))}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-sm text-red-700 flex justify-between">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-stone-600">Processing...</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {step === 'mode' && (
          <ModeSelector onSelect={(m) => { setMode(m); go('project') }} />
        )}
        {step === 'project' && (
          <ProjectSetup
            data={projectData}
            onChange={setProjectData}
            onNext={() => go(mode === 'manual' ? 'delays' : 'upload')}
            onBack={() => go('mode')}
            api={API}
          />
        )}
        {step === 'upload' && mode === 'excel' && (
          <FileUploader
            mode={mode}
            api={API}
            onUploaded={(data) => { setUploadedData(data); go('delays') }}
            onBack={() => go('project')}
          />
        )}
        {step === 'upload' && mode === 'p6' && (
          <FileUploader
            mode={mode}
            api={API}
            onUploaded={(data) => { setUploadedData(data); setDelayEvents(data.activities || []); go('delays') }}
            onBack={() => go('project')}
          />
        )}
        {step === 'delays' && mode === 'manual' && (
          <ManualEntry
            events={delayEvents}
            onChange={setDelayEvents}
            projectData={projectData}
            onCalculate={() => calculateEOT(delayEvents)}
            onBack={() => go('project')}
          />
        )}
        {step === 'delays' && mode !== 'manual' && (
          <DelayEventForm
            events={delayEvents}
            uploadedData={uploadedData}
            mode={mode}
            onChange={setDelayEvents}
            projectData={projectData}
            onCalculate={() => calculateEOT(delayEvents)}
            onBack={() => go('upload')}
          />
        )}
        {step === 'results' && calculation && (
          <ResultsDashboard
            calculation={calculation}
            delayEvents={delayEvents}
            projectData={projectData}
            isQuick={mode === 'manual'}
            onGenerateReport={generateNarrative}
            onBack={() => go('delays')}
          />
        )}
        {step === 'report' && narrative && (
          <ReportPreview
            narrative={narrative}
            calculation={calculation}
            projectData={projectData}
            isQuick={mode === 'manual'}
            onDownload={downloadReport}
            onBack={() => go('results')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-stone-400 border-t border-stone-200 mt-12">
        EOT & Delay Analysis Assistant — Built for FIDIC contract projects in the KSA market
        <br />
        <a href="https://github.com/suleman-muhammad/eot-delay-assistant" className="text-teal-600 hover:underline mt-1 inline-block" target="_blank" rel="noreferrer">
          View on GitHub
        </a>
      </footer>
    </div>
  )
}
