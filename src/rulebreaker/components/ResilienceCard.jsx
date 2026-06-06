import { useState, useEffect, useRef } from 'react';

const RING_SIZE = 144;
const RING_RADIUS = 56;
const RING_STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ringColor(score) {
  if (score > 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function ScoreRing({ score }) {
  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE);
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const delay = setTimeout(() => {
      setDashOffset(CIRCUMFERENCE * (1 - score / 100));

      const duration = 1200;
      const startTime = performance.now();

      const tick = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(eased * score));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, 350);

    return () => {
      clearTimeout(delay);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const color = ringColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={RING_STROKE}
        />
        {/* Value arc */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
        <span
          className="text-4xl font-bold font-mono leading-none"
          style={{ color }}
        >
          {displayScore}
        </span>
        <span className="text-xs text-gray-500 font-medium mt-0.5">/100</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const color =
    value > 70
      ? 'bg-emerald-500'
      : value >= 40
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className="text-xs font-mono text-gray-300 tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%`, transition: 'width 1s ease-out' }}
        />
      </div>
    </div>
  );
}

const SCORE_DIMS = [
  { key: 'coverage', label: 'Coverage' },
  { key: 'precision', label: 'Precision' },
  { key: 'evasion_resistance', label: 'Evasion Resistance' },
  { key: 'signal_stability', label: 'Signal Stability' },
];

export default function ResilienceCard({ score }) {
  const overall = score.overall;
  const label =
    overall > 70 ? 'Strong' : overall >= 40 ? 'Moderate' : 'Fragile';
  const labelColor =
    overall > 70
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : overall >= 40
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-red-400 bg-red-500/10 border-red-500/25';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <svg
          className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Rule Resilience Score
        </h2>
      </div>

      {/* Ring */}
      <div className="flex flex-col items-center mb-6">
        <ScoreRing score={overall} />
        <span
          className={`mt-3 text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border font-mono ${labelColor}`}
        >
          {label}
        </span>
      </div>

      {/* Sub-scores */}
      <div className="flex flex-col gap-3.5 flex-1">
        {SCORE_DIMS.map((dim, i) => (
          <ScoreBar
            key={dim.key}
            label={dim.label}
            value={score[dim.key]}
            delay={500 + i * 120}
          />
        ))}
      </div>

      {/* Verdict */}
      <div className="mt-5 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 leading-relaxed">{score.verdict}</p>
      </div>
    </div>
  );
}
