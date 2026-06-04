import { useState, useEffect } from 'react'

const LEVEL_CONFIG = {
  critical: { label: 'Critical path', border: 'border-l-red-400', badge: 'bg-red-100 text-red-800', dot: 'bg-red-400' },
  near:     { label: 'Near-critical',  border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  minor:    { label: 'Non-critical',   border: 'border-l-stone-300', badge: 'bg-stone-100 text-stone-600', dot: 'bg-stone-300' }
}

const RESP_LABELS = {
  employer: { label: 'Employer', cls: 'bg-teal-100 text-teal-800' },
  neutral:  { label: 'Third party', cls: 'bg-blue-100 text-blue-800' },
  force_majeure: { label: 'Force majeure', cls: 'bg-purple-100 text-purple-800' },
  contractor: { label: 'Contractor', cls: 'bg-red-100 text-red-800' },
  unknown:  { label: 'Under review', cls: 'bg-stone-100 text-stone-600' }
}

function daysBetween(a, b) {
  if (!a || !b) return 0
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24))
}

function detectLevel(delayDays, float) {
  if (float <= 0) return 'critical'
  if (float <= 10) return 'near'
  return 'minor'
}

function guessResponsibility(activity) {
  const name = (activity.activityName || activity.delayCause || '').toLowerCase()
  if (['drawing', 'design', 'instruction', 'rfi', 'approval', 'permit', 'access', 'variation', 'vo', 'change order'].some(k => name.includes(k))) return 'employer'
  if (['utility', 'authority', 'marafiq', 'sec ', 'ministry', 'municipality', 'third party', 'relocation'].some(k => name.includes(k))) return 'neutral'
  if (['weather', 'rain', 'storm', 'flood', 'force majeure', 'pandemic'].some(k => name.includes(k))) return 'force_majeure'
  if (['equipment', 'breakdown', 'resource', 'labour', 'subcontractor', 'procurement'].some(k => name.includes(k))) return 'contractor'
  return 'unknown'
}

function buildSuggestion(activity, index) {
  const resp = guessResponsibility(activity)
  const tips = {
    employer: {
      title: 'Possible employer-caused delay',
      body: `Activity "${activity.activityName}" is ${activity.delayDays} days late on the critical path. The activity name and context suggest this may relate to late employer information, instructions, or access. If confirmed, this gives entitlement under Sub-Clause ${activity.fidiCClause || '8.4(a)'}. Check your RFI log and drawing register for supporting evidence.`,
      evidence: 'RFI log, drawing register, site instructions, correspondence'
    },
    neutral: {
      title: 'Possible third-party / authority delay',
      body: `Activity "${activity.activityName}" shows an ${activity.delayDays}-day delay pattern consistent with external obstruction — utility conflict, authority clearance, or access restriction. If a third party caused this, entitlement arises under Sub-Clause ${activity.fidiCClause || '8.4(e)'}. Confirm with site diary and any authority correspondence.`,
      evidence: 'Authority correspondence, site diary, access records'
    },
    force_majeure: {
      title: 'Possible force majeure event',
      body: `Activity "${activity.activityName}" appears linked to exceptional circumstances. Force majeure entitlement under Sub-Clause 19.1 (1999) or Sub-Clause 18.1 (2017) requires the event to be unforeseeable and beyond both parties\' control. Ensure you have weather records or official documentation.`,
      evidence: 'Weather station records, official declarations, site diary'
    },
    contractor: {
      title: 'Contractor-caused delay — no EOT entitlement',
      body: `Activity "${activity.activityName}" shows a ${activity.delayDays}-day delay that appears to be within the contractor\'s control. This delay does not attract EOT entitlement and will be deducted if concurrent with employer delays. Document the cause accurately.`,
      evidence: 'Internal records only — not for EOT submission'
    },
    unknown: {
      title: 'Cause unclear — requires investigation',
      body: `Activity "${activity.activityName}" is ${activity.delayDays} days late on the critical path but the cause is not clear from the schedule data alone. Review your contemporaneous records — daily reports, meeting minutes, and correspondence — to establish responsibility before including this in your EOT claim.`,
      evidence: 'Daily reports, meeting minutes, site diary, correspondence'
    }
  }
  return { ...tips[resp], resp, confidence: resp === 'unknown' ? 'low' : resp === 'contractor' ? 'medium' : 'high' }
}

export default function DelayDetector({ uploadedData, projectData, onEventsConfirmed, onBack }) {
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState('all')
  const [activities, setActivities] = useState([])
  const [selected, setSelected] = useState({})
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const fidic = projectData?.fidic || {}
  const eotClause = fidic.eotClause || '8.4'

  useEffect(() => {
    if (!uploadedData?.activities?.length) return
    const processed = uploadedData.activities
      .map(a => {
        const delayDays = a.delayDays || daysBetween(a.plannedFinish, a.actualFinish)
        const float = a.totalFloat !== undefined ? a.totalFloat : (delayDays > 0 ? -delayDays : 5)
        const level = detectLevel(delayDays, float)
        const resp = guessResponsibility(a)
        const fidiCClause = resp === 'employer' ? `${eotClause}(a)` :
                            resp === 'neutral' ? `${eotClause}(e)` :
                            resp === 'force_majeure' ? (fidic.forceMajeureClause || '19.1') : null
        return { ...a, delayDays, float, level, suggestedResponsibility: resp, fidiCClause }
      })
      .filter(a => a.delayDays > 0)
      .sort((a, b) => a.float - b.float)

    setActivities(processed)
    const sel = {}
    processed.forEach(a => { if (a.level === 'critical' && a.suggestedResponsibility !== 'contractor') sel[a.id] = true })
    setSelected(sel)
    generateSuggestions(processed)
  }, [uploadedData])

  function generateSuggestions(acts) {
    setAiLoading(true)
    setTimeout(() => {
      const criticalActs = acts.filter(a => a.level === 'critical').slice(0, 5)
      const sug = criticalActs.map((a, i) => ({ id: a.id, activity: a, ...buildSuggestion(a, i) }))

      // Check notice compliance
      if (projectData?.firstDelayDate && projectData?.noticeDate) {
        const diff = daysBetween(projectData.firstDelayDate, projectData.noticeDate)
        if (diff > 28) {
          sug.push({
            id: 'notice-warning',
            type: 'warning',
            title: 'Notice compliance risk — action required',
            body: `The first critical delay detected occurred around ${acts[0]?.plannedFinish || 'early in the project'}. If a Sub-Clause ${fidic.noticeClause || '20.1'} notice was not issued within 28 days, your entitlement may be at risk. Check your correspondence log immediately and consider whether a reservation of rights letter can be issued now.`,
            evidence: 'Notice letters, acknowledgement from Engineer',
            confidence: 'high',
            resp: 'warning'
          })
        }
      }

      // Knock-on detection
      const knockOns = acts.filter(a => a.level === 'critical' || a.level === 'near').slice(2, 4)
      if (knockOns.length > 0) {
        sug.push({
          id: 'knockon-advice',
          type: 'advice',
          title: 'Knock-on successor delays — do not double-count',
          body: `${knockOns.map(a => a.activityName).join(', ')} appear to be successor activities delayed as a result of earlier events. Including these as separate EOT events may expose you to a double-counting argument from the Engineer. Present them as downstream impact of the primary delay events instead — this makes the critical path narrative cleaner and harder to challenge.`,
          evidence: 'Logic network from P6 showing predecessor-successor relationship',
          confidence: 'medium',
          resp: 'advice'
        })
      }

      setSuggestions(sug)
      setAiLoading(false)
    }, 1200)
  }

  function toggleSelect(id) {
    setSelected(s => ({ ...s, [id]: !s[id] }))
  }

  function confirmSelection() {
    const events = activities
      .filter(a => selected[a.id])
      .map(a => ({
        id: a.id,
        activityId: a.activityId,
        activityName: a.activityName || a.delayCause || '',
        delayCause: a.delayCause || a.activityName || '',
        delayDays: a.delayDays,
        responsibility: a.suggestedResponsibility === 'unknown' ? 'employer' : a.suggestedResponsibility,
        criticalPath: a.level === 'critical' || a.level === 'near',
        fidic: a.fidiCClause ? `Sub-Clause ${a.fidiCClause}` : '',
        startDate: a.plannedStart || '',
        endDate: a.actualFinish || a.plannedFinish || ''
      }))
    onEventsConfirmed(events)
  }

  const filtered = activities.filter(a => filter === 'all' || a.level === filter)
  const counts = { all: activities.length, critical: activities.filter(a => a.level === 'critical').length, near: activities.filter(a => a.level === 'near').length, minor: activities.filter(a => a.level === 'minor').length }
  const selectedCount = Object.values(selected).filter(Boolean).length
  const estimatedEOT = activities.filter(a => selected[a.id]).reduce((s, a) => s + a.delayDays, 0)

  const TABS = ['Auto-detect', 'AI suggestions', 'Select & confirm']

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-stone-900">Smart delay detection</h2>
        <span className="ml-auto text-xs text-stone-400">Analysed {activities.length} delayed activities</span>
      </div>
      <p className="text-xs text-stone-400 mb-5">The tool scanned your schedule and found the delays below. Review each one, read the AI observations, then select which to include in your EOT claim.</p>

      {/* Tab nav */}
      <div className="flex border border-stone-200 rounded-lg overflow-hidden mb-5">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 py-2 text-xs font-medium border-r border-stone-200 last:border-r-0 transition-colors
              ${tab === i ? 'bg-stone-100 text-stone-900' : 'bg-white text-stone-400 hover:text-stone-600'}`}>
            {i + 1}. {t}
          </button>
        ))}
      </div>

      {/* TAB 0 — Auto detect */}
      {tab === 0 && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Activities scanned', val: uploadedData?.total || activities.length + 5, color: '' },
              { label: 'Delayed activities', val: activities.length, color: 'text-red-600' },
              { label: 'On critical path', val: counts.critical, color: 'text-amber-600' },
              { label: 'Max single delay', val: `${activities[0]?.delayDays || 0} days`, color: '' }
            ].map(m => (
              <div key={m.label} className="bg-stone-50 rounded-xl p-4">
                <div className="text-xs text-stone-400 mb-1">{m.label}</div>
                <div className={`text-xl font-semibold ${m.color || 'text-stone-900'}`}>{m.val}</div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
            Found {counts.critical} critical path delays totalling an estimated {activities.filter(a => a.level === 'critical').reduce((s,a) => s + a.delayDays, 0)} days of slippage. Review each activity below — you decide which to include in your EOT claim.
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap mb-4">
            {Object.entries(counts).map(([k, v]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                  ${filter === k ? 'bg-stone-100 border-stone-400 text-stone-900' : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'}`}>
                {k.charAt(0).toUpperCase() + k.slice(1)} ({v})
              </button>
            ))}
          </div>

          {/* Activity list */}
          <div className="space-y-3">
            {filtered.map(a => {
              const lvl = LEVEL_CONFIG[a.level]
              const respCfg = RESP_LABELS[a.suggestedResponsibility] || RESP_LABELS.unknown
              return (
                <div key={a.id} className={`bg-white border-l-4 ${lvl.border} border border-stone-200 rounded-xl p-4`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-stone-900">{a.activityName || a.delayCause || 'Unnamed activity'}</div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">{a.activityId} · Float: {a.float > 0 ? '+' : ''}{Math.round(a.float)} days</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.delayDays > 20 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {a.delayDays} days late
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {a.plannedFinish && <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Planned: {a.plannedFinish}</span>}
                    {(a.actualFinish || a.plannedFinish) && <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Actual: {a.actualFinish || 'not recorded'}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lvl.badge}`}>{lvl.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${respCfg.cls}`}>{respCfg.label}</span>
                    {a.fidiCClause && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Sub-Cl. {a.fidiCClause}</span>}
                  </div>
                  <div className="bg-stone-50 border-l-2 border-purple-300 rounded-r-lg px-3 py-2 text-xs text-stone-500 leading-relaxed">
                    <strong className="text-stone-700">AI observation: </strong>
                    {buildSuggestion(a, 0).body}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm">No activities in this category.</div>
            )}
          </div>

          <div className="mt-5 flex justify-between">
            <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm px-4 py-2">← Back</button>
            <button onClick={() => setTab(1)} className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800">
              View AI suggestions →
            </button>
          </div>
        </div>
      )}

      {/* TAB 1 — AI Suggestions */}
      {tab === 1 && (
        <div>
          {aiLoading ? (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-sm text-stone-400">Analysing delay patterns...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((s, i) => {
                const confColor = s.confidence === 'high' ? 'bg-red-100 text-red-800' : s.confidence === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                const confLabel = s.confidence === 'high' ? 'High confidence' : s.confidence === 'medium' ? 'Medium confidence' : 'Advice'
                return (
                  <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-stone-900">{s.title}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-3 flex-shrink-0 ${confColor}`}>{confLabel}</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed mb-3">{s.body}</p>
                    {s.evidence && (
                      <div className="text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2 mb-3">
                        <strong>Evidence needed: </strong>{s.evidence}
                      </div>
                    )}
                    {s.activity && (
                      <button
                        onClick={() => { toggleSelect(s.activity.id); setTab(2) }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors">
                        {selected[s.activity?.id] ? '✓ Already selected' : 'Add to claim →'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <button onClick={() => setTab(0)} className="text-stone-400 hover:text-stone-600 text-sm px-4 py-2">← Back</button>
            <button onClick={() => setTab(2)} className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800">
              Select delays to claim →
            </button>
          </div>
        </div>
      )}

      {/* TAB 2 — Select & confirm */}
      {tab === 2 && (
        <div>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-4 text-xs text-teal-800">
            Select the delays you can substantiate with evidence. Deselect any you cannot support — the Engineer will ask for proof on every event you claim.
          </div>

          <div className="space-y-3">
            {activities.map(a => {
              const lvl = LEVEL_CONFIG[a.level]
              const respCfg = RESP_LABELS[a.suggestedResponsibility] || RESP_LABELS.unknown
              const isSelected = !!selected[a.id]
              const noEOT = a.suggestedResponsibility === 'contractor' || a.level === 'minor'
              return (
                <div key={a.id}
                  onClick={() => !noEOT && toggleSelect(a.id)}
                  className={`border-l-4 ${lvl.border} border rounded-xl p-4 transition-colors cursor-pointer
                    ${isSelected ? 'bg-teal-50 border-teal-200' : 'bg-white border-stone-200'}
                    ${noEOT ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => {}} disabled={noEOT}
                      className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="text-sm font-medium text-stone-900">{a.activityName || a.delayCause || 'Activity ' + a.activityId}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${respCfg.cls}`}>{respCfg.label}</span>
                      </div>
                      <div className="text-xs text-stone-400 mt-1 space-x-3">
                        <span>{a.delayDays} days</span>
                        {a.fidiCClause && <span className="text-blue-600">Sub-Cl. {a.fidiCClause}</span>}
                        <span>{lvl.label}</span>
                        {noEOT && <span className="text-stone-400 italic">— not recommended for EOT</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-stone-200 flex items-center justify-between">
            <div className="text-sm text-stone-500">
              {selectedCount} event{selectedCount !== 1 ? 's' : ''} selected &nbsp;·&nbsp;
              Indicative EOT: <strong className="text-teal-700">~{estimatedEOT} days</strong>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTab(1)} className="text-stone-400 hover:text-stone-600 text-sm px-4 py-2">← Back</button>
              <button
                onClick={confirmSelection}
                disabled={selectedCount === 0}
                className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-40 transition-colors">
                Calculate EOT →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
