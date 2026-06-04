import { useState } from 'react'
import fidiClauses from '../data/fidic-clauses.json'

const RESP_OPTIONS = [
  { id: 'employer',      label: "Employer's fault",        color: 'teal' },
  { id: 'neutral',       label: 'Third party / authority', color: 'blue' },
  { id: 'force_majeure', label: 'Force majeure',           color: 'purple' },
  { id: 'contractor',    label: 'Our fault (no EOT)',       color: 'red' }
]

function newEvent(i) {
  return { id: `evt-${Date.now()}-${i}`, activityName: '', activityId: '', delayCause: '', delayDays: '', startDate: '', endDate: '', responsibility: 'employer', criticalPath: true, fidic: '' }
}

export default function DelayEventForm({ events, uploadedData, mode, onChange, projectData, onCalculate, onBack }) {
  const [localEvents, setLocalEvents] = useState(events.length ? events : [newEvent(0)])
  const fidic = projectData.fidic || {}
  const edition = fidic.name || 'FIDIC Yellow Book 1999'
  const eotClause = fidic.eotClause || '8.4'
  const grounds = fidic.clauses?.[eotClause]?.grounds || []

  function update(id, key, val) {
    const updated = localEvents.map(e => e.id === id ? { ...e, [key]: val } : e)
    setLocalEvents(updated)
    onChange(updated)
  }

  function add() {
    const updated = [...localEvents, newEvent(localEvents.length)]
    setLocalEvents(updated)
    onChange(updated)
  }

  function remove(id) {
    const updated = localEvents.filter(e => e.id !== id)
    setLocalEvents(updated)
    onChange(updated)
  }

  const entitled = localEvents.filter(e => e.responsibility !== 'contractor' && e.criticalPath).length
  const totalDays = localEvents.filter(e => e.responsibility !== 'contractor' && e.criticalPath)
    .reduce((s, e) => s + (Number(e.delayDays) || 0), 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-stone-900">Delay event register</h2>
      </div>
      <p className="text-xs text-stone-400 mb-6">Enter one row per delay cause. Be specific — the AI uses your descriptions to write the formal narrative.</p>

      {/* Summary bar */}
      {localEvents.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5 flex gap-6 text-sm">
          <div><span className="text-teal-600 text-xs">Events entered</span><div className="font-semibold text-teal-900">{localEvents.length}</div></div>
          <div><span className="text-teal-600 text-xs">EOT-entitled events</span><div className="font-semibold text-teal-900">{entitled}</div></div>
          <div><span className="text-teal-600 text-xs">Indicative EOT</span><div className="font-semibold text-teal-900">~{totalDays} days</div></div>
          <div className="ml-auto self-center text-xs text-teal-600">{edition}</div>
        </div>
      )}

      <div className="space-y-4">
        {localEvents.map((event, idx) => (
          <div key={event.id} className={`bg-white border rounded-xl p-5 ${event.responsibility === 'contractor' ? 'border-stone-200 opacity-75' : 'border-stone-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-stone-700">Delay event {idx + 1}</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  event.responsibility === 'employer' ? 'bg-teal-100 text-teal-800' :
                  event.responsibility === 'neutral' ? 'bg-blue-100 text-blue-800' :
                  event.responsibility === 'force_majeure' ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {RESP_OPTIONS.find(r => r.id === event.responsibility)?.label || event.responsibility}
                </span>
                {localEvents.length > 1 && (
                  <button onClick={() => remove(event.id)} className="text-stone-300 hover:text-red-400 text-lg leading-none">×</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">Activity / delay description *</label>
                <input value={event.activityName} onChange={e => update(event.id, 'activityName', e.target.value)}
                  placeholder="e.g. Late issuance of IFC drawings for Area B foundations"
                  className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">Cause / reason for delay</label>
                <input value={event.delayCause} onChange={e => update(event.id, 'delayCause', e.target.value)}
                  placeholder="e.g. Employer failed to issue approved drawings by agreed date"
                  className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">P6 Activity ID (if available)</label>
                <input value={event.activityId} onChange={e => update(event.id, 'activityId', e.target.value)}
                  placeholder="e.g. A1040" className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">Number of days delayed *</label>
                <input type="number" min="0" value={event.delayDays} onChange={e => update(event.id, 'delayDays', e.target.value)}
                  placeholder="e.g. 28" className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">Delay start date</label>
                <input type="date" value={event.startDate} onChange={e => update(event.id, 'startDate', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">Delay end date</label>
                <input type="date" value={event.endDate} onChange={e => update(event.id, 'endDate', e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
            </div>

            {/* Responsibility selector */}
            <div className="mb-4">
              <label className="block text-xs text-stone-500 mb-2 font-medium">Who is responsible?</label>
              <div className="flex flex-wrap gap-2">
                {RESP_OPTIONS.map(r => (
                  <button key={r.id} onClick={() => update(event.id, 'responsibility', r.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      event.responsibility === r.id
                        ? r.id === 'employer' ? 'bg-teal-100 border-teal-400 text-teal-800' :
                          r.id === 'neutral' ? 'bg-blue-100 border-blue-400 text-blue-800' :
                          r.id === 'force_majeure' ? 'bg-purple-100 border-purple-400 text-purple-800' :
                          'bg-red-100 border-red-400 text-red-800'
                        : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Critical path + FIDIC clause */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                <input type="checkbox" checked={event.criticalPath}
                  onChange={e => update(event.id, 'criticalPath', e.target.checked)}
                  className="w-3.5 h-3.5 accent-teal-600" />
                On critical path (delay held up other work)
              </label>

              {grounds.length > 0 && event.responsibility !== 'contractor' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">FIDIC clause:</span>
                  <select value={event.fidic} onChange={e => update(event.id, 'fidic', e.target.value)}
                    className="text-xs px-2 py-1 border border-stone-200 rounded-lg outline-none focus:border-teal-400 bg-white text-stone-700">
                    <option value="">Auto-select</option>
                    {grounds.map(g => <option key={g.id} value={g.ref}>{g.ref} — {g.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            {event.responsibility === 'contractor' && (
              <div className="mt-3 p-2.5 bg-stone-50 rounded-lg text-xs text-stone-500">
                Contractor-caused delays do not attract EOT entitlement and will be excluded from the calculation.
              </div>
            )}
            {!event.criticalPath && event.responsibility !== 'contractor' && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                Non-critical path delays generally do not attract EOT — they may support additional cost claims only.
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={add}
        className="mt-4 w-full border border-dashed border-stone-300 rounded-xl py-3 text-sm text-stone-400 hover:text-stone-600 hover:border-stone-400 transition-colors">
        + Add another delay event
      </button>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm px-4 py-2">← Back</button>
        <button
          onClick={() => { onChange(localEvents); onCalculate() }}
          disabled={!localEvents.some(e => e.delayDays > 0)}
          className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Calculate EOT →
        </button>
      </div>
    </div>
  )
}
