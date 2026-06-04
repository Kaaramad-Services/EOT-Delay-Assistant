import { useState } from 'react'

const SYNONYMS = {
  activityName:    ['activity', 'task', 'description', 'activity name', 'activity description', 'name', 'work item'],
  plannedStart:    ['planned start', 'baseline start', 'bl start', 'target start', 'early start', 'scheduled start'],
  plannedFinish:   ['planned finish', 'baseline finish', 'bl finish', 'bl end', 'bl end date', 'target finish', 'planned completion', 'planned end', 'contract finish'],
  actualFinish:    ['actual finish', 'forecast finish', 'revised finish', 'current finish', 'forecast completion', 'expected finish', 'projected finish'],
  activityId:      ['id', 'activity id', 'task id', 'act id', 'wbs', 'code', 'ref'],
  delayCause:      ['delay cause', 'cause', 'reason', 'remarks', 'comment', 'notes', 'delay reason'],
  responsibility:  ['responsibility', 'caused by', 'fault', 'responsible party'],
  percentComplete: ['% complete', 'progress', 'done', 'percent complete', '% done', 'pct'],
  criticalPath:    ['critical', 'cp', 'critical path', 'is critical']
}

const REQUIRED = ['activityName', 'plannedFinish', 'actualFinish']
const OPTIONAL  = ['activityId', 'plannedStart', 'delayCause', 'responsibility', 'percentComplete', 'criticalPath']

function autoMatch(headers) {
  const result = {}
  const lower = headers.map(h => (h || '').toLowerCase().trim())
  Object.entries(SYNONYMS).forEach(([field, variants]) => {
    let idx = lower.findIndex(h => variants.includes(h))
    if (idx === -1) idx = lower.findIndex(h => variants.some(v => h.includes(v) || v.includes(h)))
    if (idx !== -1) result[field] = idx
  })
  return result
}

export default function FileUploader({ mode, api, onUploaded, onBack }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [sheets, setSheets] = useState(null)
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])
  const [error, setError] = useState(null)

  async function handleFile(file) {
    if (!file) return
    setError(null); setUploadedFile(file)

    if (mode === 'excel') {
      setUploading(true)
      const fd = new FormData(); fd.append('file', file)
      try {
        const res = await fetch(`${api}/api/upload/excel`, { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSheets(data.sheets)
        const first = data.sheetNames[0]
        setSelectedSheet(first)
        const hdrs = data.sheets[first]?.headers || []
        setHeaders(hdrs); setPreview(data.sheets[first]?.preview || [])
        setMapping(autoMatch(hdrs))
      } catch(err) { setError(err.message) }
      finally { setUploading(false) }
    } else {
      onUploaded({ file, activities: [], hasScheduleFile: true, mode: 'p6' })
    }
  }

  function selectSheet(name) {
    setSelectedSheet(name)
    const hdrs = sheets[name]?.headers || []
    setHeaders(hdrs); setPreview(sheets[name]?.preview || [])
    setMapping(autoMatch(hdrs))
  }

  async function confirmMapping() {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', uploadedFile)
    fd.append('sheetName', selectedSheet)
    fd.append('columnMapping', JSON.stringify(mapping))
    try {
      const res = await fetch(`${api}/api/upload/excel/parse`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUploaded({ ...data, hasScheduleFile: true, mode: 'excel' })
    } catch(err) { setError(err.message) }
    finally { setUploading(false) }
  }

  const canProceed = REQUIRED.every(f => mapping[f] !== undefined)

  const FIELD_LABELS = {
    activityName: 'Activity name *', plannedFinish: 'Planned finish date *', actualFinish: 'Actual / forecast finish *',
    activityId: 'Activity ID', plannedStart: 'Planned start date', delayCause: 'Delay cause / remarks',
    responsibility: 'Responsibility', percentComplete: '% complete', criticalPath: 'Critical path flag'
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-stone-900">
          {mode === 'excel' ? 'Upload Excel schedule' : 'Upload Primavera P6 file'}
        </h2>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {!uploadedFile && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => document.getElementById('file-input').click()}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors
            ${dragging ? 'border-teal-400 bg-teal-50' : 'border-stone-300 hover:border-teal-400 hover:bg-stone-50'}`}>
          <input id="file-input" type="file" className="hidden"
            accept={mode === 'excel' ? '.xlsx,.xls,.csv' : '.xer,.xml,.xls'}
            onChange={e => handleFile(e.target.files[0])} />
          <div className="text-4xl mb-3">📂</div>
          <div className="text-sm font-medium text-stone-600 mb-1">
            Drop your {mode === 'excel' ? 'Excel (.xlsx, .xls, .csv)' : 'P6 (.xer, .xml)'} file here
          </div>
          <div className="text-xs text-stone-400">or click to browse — max 20MB</div>
        </div>
      )}

      {uploading && <div className="mt-6 text-center text-sm text-stone-400">Reading file...</div>}

      {sheets && !uploading && (
        <div className="mt-4 space-y-4">
          {/* Sheet selector */}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-stone-900 mb-3">Step 1 — Which sheet has your schedule data?</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(sheets).map(name => (
                <button key={name} onClick={() => selectSheet(name)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                    ${selectedSheet === name ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'}`}>
                  {name} <span className="opacity-60">({sheets[name].rowCount} rows)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data preview */}
          {preview.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-stone-900 mb-3">Preview — first 3 rows</h3>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr>{headers.map((h,i) => <th key={i} className="border border-stone-200 bg-stone-50 px-2 py-1.5 text-left font-medium text-stone-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri}>{headers.map((h,ci) => <td key={ci} className="border border-stone-100 px-2 py-1 text-stone-600 max-w-32 truncate">{String(row[h] ?? '')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-teal-700 bg-teal-50 p-2 rounded-lg">✓ Confirm this is the correct sheet, then map your columns below.</div>
            </div>
          )}

          {/* Column mapping */}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-stone-900 mb-1">Step 2 — Map your columns to required fields</h3>
            <p className="text-xs text-stone-400 mb-4">The tool guessed matches. Green = matched. Correct any wrong ones. Required fields marked *</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...REQUIRED.map(f => ({ f, req: true })), ...OPTIONAL.map(f => ({ f, req: false }))].map(({ f, req }) => (
                <div key={f}>
                  <label className="block text-xs mb-1 font-medium text-stone-500">{FIELD_LABELS[f]}</label>
                  <select
                    value={mapping[f] !== undefined ? String(mapping[f]) : ''}
                    onChange={e => setMapping(m => ({
                      ...m,
                      [f]: e.target.value === '' ? undefined : Number(e.target.value)
                    }))}
                    className={`w-full text-xs px-2 py-2 border rounded-lg outline-none transition-colors
                      ${mapping[f] !== undefined ? 'border-teal-300 bg-teal-50 text-teal-800' : req ? 'border-amber-300 bg-white text-stone-500' : 'border-stone-200 bg-white text-stone-400'}`}>
                    <option value="">— not in my file —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!canProceed && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                Map at minimum: activity name, planned finish, and actual/forecast finish to continue.
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => { setUploadedFile(null); setSheets(null) }} className="text-stone-400 hover:text-stone-600 text-sm">Re-upload</button>
            <button onClick={confirmMapping} disabled={!canProceed || uploading}
              className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-40 transition-colors">
              {uploading ? 'Processing...' : 'Confirm & continue →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
