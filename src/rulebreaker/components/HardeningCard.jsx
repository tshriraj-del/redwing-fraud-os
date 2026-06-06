export default function HardeningCard({ recommendations }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <svg
          className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          How to Strengthen This Rule
        </h2>
      </div>

      <div className="flex flex-col gap-5 flex-1">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex gap-3">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full
                bg-indigo-500/15 border border-indigo-500/30
                text-indigo-400 text-[10px] font-bold font-mono
                flex items-center justify-center mt-0.5"
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100 mb-1 leading-snug">
                {rec.recommendation}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed mb-1.5">
                {rec.rationale}
              </p>
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-wider flex-shrink-0 mt-px">
                  Trade-off:
                </span>
                <p className="text-[11px] text-gray-500 leading-relaxed">{rec.tradeoff}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
