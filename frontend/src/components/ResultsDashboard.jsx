export default function ResultsDashboard({ calculation, delayEvents, projectData, isQuick, onGenerateReport, onBack }) {
  const { summary, noticeCompliance, events } = calculation
  const fidic = projectData.fidic || {}

  const bars = [
    { label: 'Employer-caused delay', days: summary.employerDays, color: 'bg-teal-500', max: summary.grossEOT || 1 },
    { label: 'Third-party / neutral delay', days: summary.neutralDays, color: 'bg-blue-400', max: summary.grossEOT || 1 },
    { label: 'Force majeure', days: summary.forceMajeureDays || 0, color: 'bg-purple-400', max: summary.grossEOT || 1 },
    { label: 'Concurrent (deducted)', days: summary.concurrentDays, color: 'bg-amber-400', max: summary.grossEOT || 1 },
    { label: 'Contractor-caused (no EOT)', days: summary.contractorDays, color: 'bg-red-300', max: summary.grossEOT || 1 }
  ].filter(b => b.days > 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-stone-900">EOT calculation results</h2>
        {isQuick && (
          <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
            Quick assessment — indicative only
          </span>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric label="Net EOT entitlement" value={`${isQuick ? '~' : ''}${summary.netEOT} days`} accent="teal" big />
        <Metric label="Gross EOT (before deductions)" value={`${summary.grossEOT} days`} />
        <Metric label="Concurrent deducted" value={`${summary.concurrentDays} days`} accent="amber" />
        <Metric label="Total slippage" value={summary.totalSlippage ? `${summary.totalSlippage} days` : 'N/A'} />
      </div>

      {/* Notice compliance */}
      <div className={`mb-5 p-4 rounded-xl border text-sm ${
        noticeCompliance.compliant === true ? 'bg-teal-50 border-teal-200 text-teal-800' :
        noticeCompliance.compliant === false ? 'bg-red-50 border-red-200 text-red-800' :
        'bg-stone-50 border-stone-200 text-stone-600'
      }`}>
        <div className="font-medium mb-0.5">
          {noticeCompliance.compliant === true ? `✓ Notice compliant — Sub-Clause ${fidic.noticeClause || '20.1'}` :
           noticeCompliance.compliant === false ? `✗ Notice compliance risk — Sub-Clause ${fidic.noticeClause || '20.1'}` :
           `Sub-Clause ${fidic.noticeClause || '20.1'} — Notice status not confirmed`}
        </div>
        <div className="text-xs opacity-80">
          {noticeCompliance.compliant === true && `Issued within ${noticeCompliance.requiredDays}-day requirement.`}
          {noticeCompliance.compliant === false && `Issued ${noticeCompliance.daysAfterEvent} days after first delay event. Address this in the submission narrative.`}
          {noticeCompliance.compliant === null && 'Enter notice date and first delay date on the project setup screen to check compliance.'}
        </div>
      </div>

      {/* TIA bars */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
        <h3 className="text-sm font-medium text-stone-900 mb-4">Time impact analysis</h3>
        <div className="space-y-3">
          {bars.map(bar => (
            <div key={bar.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-stone-500">{bar.label}</span>
                <span className="font-medium text-stone-900">{bar.days} days</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full ${bar.color} transition-all`}
                  style={{ width: `${Math.min(100, (bar.days / bar.max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between text-sm">
          <span className="text-stone-500">Net EOT entitlement</span>
          <span className="font-semibold text-teal-700">{isQuick ? '~' : ''}{summary.netEOT} calendar days</span>
        </div>
      </div>

      {/* Event table */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-medium text-stone-900 mb-3">Delay event summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100">
                {['Event', 'Days', 'Responsibility', 'FIDIC ref', 'Critical', 'EOT?'].map(h => (
                  <th key={h} className="text-left text-stone-400 font-medium pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(events || delayEvents).map((e, i) => (
                <tr key={e.id || i} className="border-b border-stone-50">
                  <td className="py-2 pr-4 text-stone-700 max-w-xs truncate">{e.activityName || e.delayCause || `Event ${i+1}`}</td>
                  <td className="py-2 pr-4 font-medium text-stone-900">{e.delayDays}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.responsibility === 'employer' ? 'bg-teal-100 text-teal-800' :
                      e.responsibility === 'neutral' ? 'bg-blue-100 text-blue-800' :
                      e.responsibility === 'force_majeure' ? 'bg-purple-100 text-purple-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {e.responsibility === 'employer' ? 'Employer' :
                       e.responsibility === 'neutral' ? 'Third party' :
                       e.responsibility === 'force_majeure' ? 'Force majeure' : 'Contractor'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-blue-600">{e.fidic || '—'}</td>
                  <td className="py-2 pr-4 text-stone-500">{e.criticalPath ? 'Yes' : 'No'}</td>
                  <td className="py-2">
                    {e.eotEntitlement !== false && e.responsibility !== 'contractor' && e.criticalPath
                      ? <span className="text-teal-600">✓</span>
                      : <span className="text-stone-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isQuick && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>Quick assessment note:</strong> This is an indicative result based on manually entered data. The tilde (~) on the EOT figure indicates an estimate. Upload a P6 XER or Excel schedule file to generate a fully substantiated formal submission document.
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm px-4 py-2">← Back</button>
        <button onClick={onGenerateReport}
          className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors">
          Generate {isQuick ? 'assessment' : 'EOT'} report →
        </button>
      </div>
    </div>
  )
}

function Metric({ label, value, accent, big }) {
  return (
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="text-xs text-stone-400 mb-1">{label}</div>
      <div className={`font-semibold ${big ? 'text-2xl' : 'text-lg'} ${
        accent === 'teal' ? 'text-teal-700' :
        accent === 'amber' ? 'text-amber-600' : 'text-stone-900'
      }`}>{value}</div>
    </div>
  )
}
