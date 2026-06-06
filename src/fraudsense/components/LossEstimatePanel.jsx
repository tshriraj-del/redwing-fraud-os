import { PANEL_ANIM, BORDER_ANIM } from '../constants.js';

export default function LossEstimatePanel({ lossEstimate = {}, order = 2 }) {
  const { confirmed, likely_low, likely_high, basis } = lossEstimate;
  const range =
    likely_low && likely_high
      ? `${likely_low} – ${likely_high}`
      : likely_low || likely_high || '—';

  return (
    <section className={`panel ${PANEL_ANIM[order]} overflow-hidden p-5`} aria-label="Loss estimate">
      <span className={`edge ${BORDER_ANIM[order]} bg-[color:var(--accent-amber)]`} />

      <h3 className="panel-label mb-3 text-[12px] text-[color:var(--text-secondary)]">
        Loss Estimate
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-base)] p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-dim)]">
            Confirmed
          </div>
          <div className="mt-1 font-display text-lg font-bold text-[color:var(--text-primary)]">
            {confirmed ?? '—'}
          </div>
        </div>
        <div className="rounded-lg border border-[color:var(--accent-amber)]/40 bg-[color:var(--accent-amber-dim)] p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-dim)]">
            Likely exposure
          </div>
          <div className="mt-1 font-display text-lg font-bold text-[color:var(--accent-amber)]">
            {range}
          </div>
        </div>
      </div>

      {basis && (
        <p className="mt-3 font-mono text-[11px] leading-[1.7] text-[color:var(--text-secondary)]">
          <span className="text-[color:var(--text-dim)]">Basis: </span>
          {basis}
        </p>
      )}
    </section>
  );
}
