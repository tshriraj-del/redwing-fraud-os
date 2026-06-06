import { useEffect, useState } from 'react';
import { SEVERITY_STYLE, severityFromScore, PANEL_ANIM, BORDER_ANIM } from '../constants.js';

// Animated count-up from 0 to `target`.
function useCountUp(target, duration = 700, delay = 450) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now() + delay;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setN(Math.round(t * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return n;
}

export default function RiskScorePanel({ riskScore = {}, order = 1 }) {
  const score = Number.isFinite(riskScore.score) ? riskScore.score : 0;
  const severity = riskScore.severity && SEVERITY_STYLE[riskScore.severity]
    ? riskScore.severity
    : severityFromScore(score);
  const style = SEVERITY_STYLE[severity];
  const factors = Array.isArray(riskScore.factors) ? riskScore.factors : [];
  const maxWeight = Math.max(1, ...factors.map((f) => Number(f.weight) || 0));

  const shown = useCountUp(score);
  const [barW, setBarW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarW(score), 500);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <section
      className={`panel ${PANEL_ANIM[order]} overflow-hidden p-5`}
      aria-label="Risk score"
      style={{ backgroundImage: `linear-gradient(180deg, ${style.dim} 0%, transparent 70%)` }}
    >
      <span className={`edge ${BORDER_ANIM[order]}`} style={{ background: style.color }} />

      <div className="flex items-start justify-between">
        <h3 className="panel-label text-[12px] text-[color:var(--text-secondary)]">Risk Score</h3>
        <span
          className="rounded-lg px-2 py-0.5 font-display text-[11px] uppercase tracking-[0.12em]"
          style={{ color: style.color, background: style.dim, border: `1px solid ${style.color}` }}
        >
          {severity}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-5xl font-extrabold leading-none" style={{ color: style.color }}>
          {shown}
        </span>
        <span className="font-mono text-sm text-[color:var(--text-dim)]">/ 100</span>
      </div>

      {/* overall gauge */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-[1px] bg-[color:var(--bg-base)] ring-1 ring-[color:var(--border)]">
        <div
          className="h-full rounded-[1px] transition-[width] duration-700 ease-out"
          style={{ width: `${barW}%`, backgroundColor: style.color, boxShadow: `0 0 12px ${style.color}66` }}
        />
      </div>

      {/* weighted factor breakdown */}
      {factors.length > 0 && (
        <div className="mt-4 space-y-2">
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[color:var(--text-secondary)]">
                {f.name}
              </span>
              <span className="h-1 w-20 overflow-hidden rounded-[1px] bg-[color:var(--bg-base)]">
                <span
                  className="block h-full rounded-[1px] transition-[width] duration-700 ease-out"
                  style={{ width: barW ? `${((Number(f.weight) || 0) / maxWeight) * 100}%` : '0%', backgroundColor: style.color }}
                />
              </span>
              <span className="w-6 text-right font-mono text-[11px] text-[color:var(--text-dim)]">
                {Number(f.weight) || 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
