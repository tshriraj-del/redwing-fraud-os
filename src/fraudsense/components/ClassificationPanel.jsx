import { useEffect, useState } from 'react';
import ConfidenceMeter from './ConfidenceMeter.jsx';
import { PANEL_ANIM, BORDER_ANIM } from '../constants.js';

// Types `text` out one character at a time once, after `startDelay`.
function useTypewriter(text, startDelay = 0, speed = 40) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setOut('');
    setDone(false);
    let i = 0;
    let interval;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, startDelay, speed]);

  return { out, done };
}

export default function ClassificationPanel({ classification = {}, order = 4 }) {
  const { primary_type, secondary_type, confidence, reasoning } = classification;
  const { out, done } = useTypewriter(primary_type ?? '—', 650);

  return (
    <section
      className={`panel ${PANEL_ANIM[order]} overflow-hidden p-5`}
      aria-label="Classification"
    >
      <span className={`edge ${BORDER_ANIM[order]} bg-[color:var(--accent-cyan)]`} />

      <h3 className="panel-label mb-3 text-[12px] text-[color:var(--text-secondary)]">
        Classification
      </h3>

      <h2
        className={`font-display text-2xl font-bold leading-tight text-[color:var(--text-primary)] ${
          done ? '' : 'caret'
        }`}
      >
        {out}
      </h2>

      {secondary_type && (
        <span className="mt-2 inline-block rounded-lg border border-[color:var(--border-active)] bg-[color:var(--bg-elevated)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          + {secondary_type}
        </span>
      )}

      <div className="mt-4 max-w-[280px]">
        <ConfidenceMeter confidence={confidence} delay={700} />
      </div>

      {reasoning && (
        <p className="mt-4 font-mono text-[12px] leading-[1.7] text-[color:var(--text-secondary)]">
          {reasoning}
        </p>
      )}
    </section>
  );
}
