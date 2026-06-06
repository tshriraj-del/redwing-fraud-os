import { useEffect, useState } from 'react';
import { CONFIDENCE_METER } from '../constants.js';

// Horizontal bar that animates from 0% to its target width on mount.
// Presentational only — `confidence` comes straight from the parsed analysis.
export default function ConfidenceMeter({ confidence, delay = 0 }) {
  const meta = CONFIDENCE_METER[confidence] ?? CONFIDENCE_METER.Low;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(meta.pct), delay + 60);
    return () => clearTimeout(t);
  }, [meta.pct, delay]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
        <span>Confidence</span>
        <span style={{ color: meta.color }}>{confidence ?? '—'}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-[1px] bg-[color:var(--bg-base)] ring-1 ring-[color:var(--border)]">
        <div
          className="h-full rounded-[1px] transition-[width] duration-[600ms] ease-out"
          style={{ width: `${width}%`, backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}55` }}
        />
      </div>
    </div>
  );
}
