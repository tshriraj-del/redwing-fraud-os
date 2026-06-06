const GROUPS = [
  {
    key: 'observed_facts',
    label: 'Observed Facts',
    note: 'Stated in the case material',
    color: 'var(--accent-green)',
  },
  {
    key: 'assessments',
    label: 'Analyst Assessments',
    note: 'Inferences held with confidence',
    color: 'var(--accent-amber)',
  },
  {
    key: 'hypotheses',
    label: 'Unverified Hypotheses',
    note: 'Need more evidence to confirm',
    color: 'var(--accent-purple)',
  },
];

import { PANEL_ANIM, BORDER_ANIM } from '../constants.js';

export default function EvidenceBasisPanel({ factAssessment = {}, order = 6 }) {
  return (
    <section
      className={`panel ${PANEL_ANIM[order]} overflow-hidden p-5`}
      aria-label="Evidence basis"
    >
      <span className={`edge ${BORDER_ANIM[order]} bg-[color:var(--accent-green)]`} />

      <h3 className="panel-label mb-4 text-[12px] text-[color:var(--text-secondary)]">
        Evidence Basis
      </h3>

      <div className="space-y-4">
        {GROUPS.map(({ key, label, note, color }) => {
          const items = Array.isArray(factAssessment[key]) ? factAssessment[key] : [];
          return (
            <div key={key} style={{ borderLeft: `2px solid ${color}`, paddingLeft: '12px' }}>
              <div className="flex items-baseline justify-between">
                <h4 className="font-display text-[10px] uppercase tracking-[0.12em]" style={{ color }}>
                  {label}
                </h4>
                <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[color:var(--text-dim)]">
                  {note}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="mt-1 font-mono text-[11px] text-[color:var(--text-dim)]">—</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {items.map((it, i) => (
                    <li
                      key={i}
                      className="flex gap-2 font-mono text-[11px] leading-[1.6] text-[color:var(--text-secondary)]"
                    >
                      <span style={{ color }}>›</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
