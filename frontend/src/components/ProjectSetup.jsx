import { useState, useEffect } from 'react'
import fidiClauses from '../data/fidic-clauses.json'

const EDITIONS = [
  { id: 'yellowbook1999', label: 'Yellow Book 1999 (Design-Build)' },
  { id: 'redbook1999',    label: 'Red Book 1999 (Construction)' },
  { id: 'yellowbook2017', label: 'Yellow Book 2017 (Design-Build)' },
  { id: 'redbook2017',    label: 'Red Book 2017 (Construction)' }
]

export default function ProjectSetup({ data, onChange, onNext, onBack }) {
  const [form, setForm] = useState({
    projectName: '', contractNumber: '', contractorName: '', employerName: '',
    engineerName: '', fidiCEdition: 'yellowbook1999', contractStart: '',
    plannedCompletion: '', forecastCompletion: '', noticeIssued: 'yes',
    noticeDate: '', noticeReference: '', firstDelayDate: '', ...data
  })
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const fidic = fidiClauses[form.fidiCEdition]
    onChange({ ...form, fidic })
  }, [form])

  function validate() {
    const e = {}
    if (!form.projectName) e.projectName = 'Required'
    if (!form.contractorName) e.contractorName = 'Required'
    if (!form.plannedCompletion) e.plannedCompletion = 'Required'
    if (!form.forecastCompletion) e.forecastCompletion = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const fidic = fidiClauses[form.fidiCEdition]
  const noticeDays = fidic?.clauses[fidic.noticeClause]?.noticeDays || 28

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-stone-900">Project & contract setup</h2>
      </div>

      <div className="space-y-4">
        {/* Contract info */}
        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-stone-900 mb-4">Contract information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Project name *" error={errors.projectName}>
              <input value={form.projectName} onChange={e => set('projectName', e.target.value)}
                placeholder="e.g. NEOM Linear City — Utilities Package C"
                className={inputCls(errors.projectName)} />
            </Field>
            <Field label="Contract number">
              <input value={form.contractNumber} onChange={e => set('contractNumber', e.target.value)}
                placeholder="e.g. NEOM-UC-2023-0041" className={inputCls()} />
            </Field>
            <Field label="Contractor name *" error={errors.contractorName}>
              <input value={form.contractorName} onChange={e => set('contractorName', e.target.value)}
                placeholder="Your company name" className={inputCls(errors.contractorName)} />
            </Field>
            <Field label="Employer / Client name">
              <input value={form.employerName} onChange={e => set('employerName', e.target.value)}
                placeholder="e.g. NEOM Company" className={inputCls()} />
            </Field>
            <Field label="Engineer / PMC name">
              <input value={form.engineerName} onChange={e => set('engineerName', e.target.value)}
                placeholder="e.g. Parsons International" className={inputCls()} />
            </Field>
            <Field label="FIDIC edition">
              <select value={form.fidiCEdition} onChange={e => set('fidiCEdition', e.target.value)} className={inputCls()}>
                {EDITIONS.map(ed => <option key={ed.id} value={ed.id}>{ed.label}</option>)}
              </select>
            </Field>
          </div>
          {fidic && (
            <div className="mt-3 p-3 bg-teal-50 rounded-lg text-xs text-teal-800 flex gap-4">
              <span>EOT clause: <strong>Sub-Clause {fidic.eotClause}</strong></span>
              <span>Claims notice: <strong>Sub-Clause {fidic.noticeClause}</strong></span>
              <span>Notice period: <strong>{noticeDays} days</strong></span>
            </div>
          )}
        </section>

        {/* Schedule dates */}
        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-stone-900 mb-4">Schedule dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Contract start date">
              <input type="date" value={form.contractStart} onChange={e => set('contractStart', e.target.value)} className={inputCls()} />
            </Field>
            <Field label="Original completion date *" error={errors.plannedCompletion}>
              <input type="date" value={form.plannedCompletion} onChange={e => set('plannedCompletion', e.target.value)} className={inputCls(errors.plannedCompletion)} />
            </Field>
            <Field label="Current forecast / revised completion *" error={errors.forecastCompletion}>
              <input type="date" value={form.forecastCompletion} onChange={e => set('forecastCompletion', e.target.value)} className={inputCls(errors.forecastCompletion)} />
            </Field>
            <Field label="">
              {form.plannedCompletion && form.forecastCompletion && (
                <div className="mt-2 p-3 bg-stone-50 rounded-lg text-xs text-stone-600">
                  Total slippage: <strong className="text-stone-900">
                    {Math.max(0, Math.round((new Date(form.forecastCompletion) - new Date(form.plannedCompletion)) / (1000*60*60*24)))} calendar days
                  </strong>
                </div>
              )}
            </Field>
          </div>
        </section>

        {/* Notice compliance */}
        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-stone-900 mb-1">Notice compliance — Sub-Clause {fidic?.noticeClause || '20.1'}</h3>
          <p className="text-xs text-stone-400 mb-4">A {noticeDays}-day notice must be issued from the date the delay event first occurred.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Has notice been issued?">
              <select value={form.noticeIssued} onChange={e => set('noticeIssued', e.target.value)} className={inputCls()}>
                <option value="yes">Yes — notice has been issued</option>
                <option value="no">Not yet — need to issue</option>
                <option value="unsure">Not sure</option>
              </select>
            </Field>
            {form.noticeIssued === 'yes' && (
              <>
                <Field label="Date notice was issued">
                  <input type="date" value={form.noticeDate} onChange={e => set('noticeDate', e.target.value)} className={inputCls()} />
                </Field>
                <Field label="Notice reference number">
                  <input value={form.noticeReference} onChange={e => set('noticeReference', e.target.value)}
                    placeholder="e.g. CL-2024-007" className={inputCls()} />
                </Field>
                <Field label="Date of first delay event">
                  <input type="date" value={form.firstDelayDate} onChange={e => set('firstDelayDate', e.target.value)} className={inputCls()} />
                </Field>
              </>
            )}
          </div>
          {form.noticeIssued === 'no' && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              ⚠ Issue your Sub-Clause {fidic?.noticeClause || '20.1'} notice immediately. Failure to notify within {noticeDays} days may bar your entitlement.
            </div>
          )}
          {form.noticeDate && form.firstDelayDate && (() => {
            const diff = Math.round((new Date(form.noticeDate) - new Date(form.firstDelayDate)) / (1000*60*60*24))
            const ok = diff <= noticeDays
            return (
              <div className={`mt-3 p-3 rounded-lg text-xs ${ok ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {ok ? `✓ Notice compliant — issued ${diff} days after first delay event (within ${noticeDays}-day requirement)`
                     : `✗ Notice issued ${diff} days after first delay event — exceeds ${noticeDays}-day requirement. Address in submission.`}
              </div>
            )
          })()}
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={() => validate() && onNext()}
          className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, error }) {
  return (
    <div>
      {label && <label className="block text-xs text-stone-500 mb-1.5 font-medium">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(error) {
  return `w-full text-sm px-3 py-2 border rounded-lg bg-white text-stone-900 outline-none transition-colors
    ${error ? 'border-red-300 focus:border-red-500' : 'border-stone-200 focus:border-teal-400'}`
}
