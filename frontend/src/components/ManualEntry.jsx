import { useState } from 'react'

const RESP = [
  { id: 'employer',      label: "Employer's fault",   cls: 'bg-teal-100 border-teal-400 text-teal-800' },
  { id: 'neutral',       label: 'Third party',         cls: 'bg-blue-100 border-blue-400 text-blue-800' },
  { id: 'force_majeure', label: 'Force majeure',       cls: 'bg-purple-100 border-purple-400 text-purple-800' },
  { id: 'contractor',    label: 'Our fault (no EOT)',  cls: 'bg-red-100 border-red-400 text-red-800' }
]

export default function ManualEntry({ events, onChange, projectData, onCalculate, onBack }) {
  const [items, setItems] = useState(
    events.length ? events : [{ id: 'm0', activityName: '', delayCause: '', delayDays: '', responsibility: 'employer', criticalPath: true }]
  )

  function update(id, k, v) {
    const u = items.map(e => e.id === id ? { ...e, [k]: v } : e)
    setItems(u); onChange(u)
  }
  function add() {
    const u = [...items, { id: `m${Date.now()}`, activityName: '', delayCause: '', delayDays: '', responsibility: 'employer', criticalPath: true }]
    setItems(u); onChange(u)
  }
  function remove(id) {
    const u = items.filter(e => e.id !== id); setItems(u); onChange(u)
  }

  const indicative = items.filter(e => e.responsibility !== 'contractor' && e.criticalPath).reduce((s, e) => s + (Number(e.delayDays) || 0), 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-stone-900">Quick assessment — manual entry</h2>
      </div>

      <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <strong>Quick check mode.</strong> Enter what you know right now.
        Output is an internal working paper — not for submission to the Engineer.
        {indicative > 0 && <span className="ml-2 font-semibold">Indicative EOT: ~{indicative} days</span>}
      </div>

      <div className="space-y-3">
        {items.map((e, i) => (
          <div key={e.id} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-stone-500">Delay {i + 1}</span>
              {items.length > 1 && (
                <button onClick={() => remove(e.id)} className="text-stone-300 hover:text-red-400 text-lg leading-none">×</button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">What caused the delay?</label>
                <input value={e.activityName}
                  onChange={ev => update(e.id, 'activityName', ev.target.value)}
                  placeholder="e.g. Late drawings from client for Area B"
                  className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">How many calendar days?</label>
                <input type="number" min="0" value={e.delayDays}
                  onChange={ev => update(e.id, 'delayDays', ev.target.value)}
                  placeholder="e.g. 28"
                  className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400" />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-stone-400 mb-2">Who is responsible?</label>
              <div className="flex flex-wrap gap-2">
                {RESP.map(r => (
                  <button key={r.id} onClick={() => update(e.id, 'responsibility', r.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${e.responsibility === r.id ? r.cls : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer">
              <input type="checkbox" checked={e.criticalPath}
                onChange={ev => update(e.id, 'criticalPath', ev.target.checked)}
                className="w-3.5 h-3.5 accent-teal-600" />
              This held up other work (treating as critical path)
            </label>

            {e.responsibility === 'contractor' && (
              <div className="mt-2 text-xs text-stone-400 bg-stone-50 rounded-lg px-3 py-2">
                Contractor-caused delays are excluded from EOT calculation.
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={add} className="mt-3 w-full border border-dashed border-stone-300 rounded-xl py-3 text-sm text-stone-400 hover:border-teal-300 hover:text-teal-600 transition-colors">
        + Add another delay event
      </button>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm px-4 py-2">← Back</button>
        <button
          onClick={() => { onChange(items); onCalculate() }}
          disabled={!items.some(e => Number(e.delayDays) > 0)}
          className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Calculate →
        </button>
      </div>
    </div>
  )
}
