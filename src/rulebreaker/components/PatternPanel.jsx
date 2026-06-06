const SIGNIFICANCE_STYLES = {
  High: 'text-red-400 bg-red-500/10 border-red-500/25',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  Low: 'text-gray-400 bg-gray-500/10 border-gray-500/25',
};

export default function PatternPanel({ pattern }) {
  return (
    <div className="bg-gray-900 border border-indigo-500/20 rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Pattern Extracted from Vectors
        </h2>
      </div>

      <p className="text-sm text-gray-200 leading-relaxed mb-5">{pattern.summary}</p>

      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Key Signals</p>
        <div className="flex flex-col gap-2">
          {pattern.key_signals.map((signal, i) => {
            const style = SIGNIFICANCE_STYLES[signal.significance] || SIGNIFICANCE_STYLES.Low;
            return (
              <div key={i} className="flex items-start gap-3 bg-gray-800/50 rounded-lg px-4 py-2.5">
                <span className="font-mono text-xs text-indigo-300 font-semibold flex-shrink-0 mt-0.5 min-w-[120px]">
                  {signal.feature}
                </span>
                <span className="text-xs text-gray-300 flex-1 leading-relaxed">{signal.observation}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 font-mono ${style}`}>
                  {signal.significance}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-2 pt-4 border-t border-gray-800">
        <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-amber-400 font-semibold">Attack hypothesis: </span>
          {pattern.attack_hypothesis}
        </p>
      </div>
    </div>
  );
}
