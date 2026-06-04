const MODES = [
  {
    id: 'p6',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: 'Primavera P6 File',
    subtitle: 'Upload XER or XML export',
    desc: 'Best accuracy. The tool reads your schedule directly — activities, critical path, float values, and actual dates extracted automatically.',
    badge: 'Formal submission',
    badgeColor: 'bg-teal-100 text-teal-800'
  },
  {
    id: 'excel',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Excel / CSV Tracker',
    subtitle: 'Upload your progress spreadsheet',
    desc: 'Upload any Excel format — planned vs actual dates, progress percentages. Smart column mapper handles any column name you use.',
    badge: 'Formal submission',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'manual',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: 'Manual Entry',
    subtitle: 'Enter dates and numbers directly',
    desc: 'No file needed. Enter what you know right now — useful for quick position checks before a meeting. Produces an internal working paper.',
    badge: 'Quick assessment',
    badgeColor: 'bg-amber-100 text-amber-800'
  }
]

export default function ModeSelector({ onSelect }) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-stone-900 mb-2">EOT & Delay Analysis Assistant</h2>
        <p className="text-stone-500 text-sm max-w-lg mx-auto">
          Prepare FIDIC-compliant Extension of Time claims in minutes. Supports all four FIDIC editions.
          Select how your project data is maintained.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="text-left p-5 bg-white border border-stone-200 rounded-xl hover:border-teal-400 hover:shadow-sm transition-all group"
          >
            <div className="text-stone-400 group-hover:text-teal-600 transition-colors mb-3">{m.icon}</div>
            <div className="font-medium text-stone-900 text-sm mb-0.5">{m.title}</div>
            <div className="text-xs text-stone-400 mb-3">{m.subtitle}</div>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">{m.desc}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${m.badgeColor}`}>{m.badge}</span>
          </button>
        ))}
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm">
        <div className="font-medium text-teal-900 mb-1">Supports all four FIDIC editions</div>
        <div className="text-teal-700 text-xs flex flex-wrap gap-3">
          {['Yellow Book 1999', 'Red Book 1999', 'Yellow Book 2017', 'Red Book 2017'].map(e => (
            <span key={e} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full inline-block" />
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
