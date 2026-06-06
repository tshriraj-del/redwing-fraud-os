import { PANEL_ANIM, BORDER_ANIM } from '../constants.js';

const SECTIONS = [
  { key: 'attack_narrative', label: 'Attack Narrative', accent: null },
  { key: 'entry_point', label: 'Entry Point', accent: null },
  { key: 'blast_radius', label: 'Blast Radius', accent: 'var(--accent-amber)' },
  { key: 'watch_for', label: 'Watch For', accent: 'var(--accent-red)' },
];

export default function RcaPanel({ rca = {}, order = 5 }) {
  return (
    <section
      className={`panel ${PANEL_ANIM[order]} overflow-hidden p-5`}
      aria-label="Root cause analysis"
    >
      <span className={`edge ${BORDER_ANIM[order]} bg-[color:var(--accent-cyan)]`} />

      <h3 className="panel-label mb-3 text-[12px] text-[color:var(--text-secondary)]">
        Root Cause Analysis
      </h3>

      <div className="divide-y divide-[color:var(--border)]">
        {SECTIONS.map(({ key, label, accent }) => (
          <div
            key={key}
            className="py-3.5 first:pt-0 last:pb-0"
            style={accent ? { borderLeft: `2px solid ${accent}`, paddingLeft: '12px', marginLeft: '-2px' } : undefined}
          >
            <h4
              className="font-display mb-1.5 text-[10px] uppercase tracking-[0.12em]"
              style={{ color: accent ?? 'var(--text-dim)' }}
            >
              {label}
            </h4>
            <p className="font-mono text-[12px] leading-[1.7] text-[color:var(--text-secondary)]">
              {rca[key] ?? '—'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
