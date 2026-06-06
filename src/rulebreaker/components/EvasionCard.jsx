const DIFFICULTY_STYLES = {
  Easy: 'text-red-400 bg-red-500/10 border-red-500/25',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  Hard: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
};

const DETECTABILITY_STYLES = {
  Low: 'text-red-400 bg-red-500/10 border-red-500/25',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  High: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
};

function Badge({ label, value, styles }) {
  const style = styles[value] || 'text-gray-400 bg-gray-500/10 border-gray-500/25';
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider
        px-1.5 py-0.5 rounded border ${style} font-mono`}
    >
      {value}
    </span>
  );
}

export default function EvasionCard({ patterns }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <svg
          className="w-3.5 h-3.5 text-red-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          How Attackers Would Evade This
        </h2>
      </div>

      <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-1 -mr-1">
        {patterns.map((pattern, i) => (
          <div
            key={i}
            className="border-l-2 border-gray-700/70 pl-4 hover:border-indigo-500/50 transition-colors duration-200"
          >
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-sm font-semibold text-gray-100">{pattern.name}</span>
              <Badge label="Difficulty" value={pattern.difficulty} styles={DIFFICULTY_STYLES} />
              <Badge
                label="Detectability"
                value={pattern.detectability}
                styles={DETECTABILITY_STYLES}
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{pattern.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800">
        <p className="text-[10px] text-gray-600 font-medium">
          Difficulty: Easy = high attacker risk &nbsp;·&nbsp; Detectability: High = other signals catch it
        </p>
      </div>
    </div>
  );
}
