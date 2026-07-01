import { Activity } from 'lucide-react';
import { STRENGTH_META, CATEGORY_COLOR, BASIS_STYLE, PANEL_ANIM, BORDER_ANIM } from '../constants.js';
import { SignalBars } from './Icons.jsx';
import PanelHead from './PanelHead.jsx';

export default function SignalsPanel({ signals = [], order = 3 }) {
  const count = String(signals.length).padStart(2, '0');

  return (
    <section
      className={`panel ${PANEL_ANIM[order]} overflow-hidden p-5`}
      aria-label="Signals detected"
    >
      <span className={`edge ${BORDER_ANIM[order]} bg-[color:var(--accent)]`} />

      <PanelHead
        icon={Activity}
        title="Signals Detected"
        accent="var(--accent)"
        right={
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-medium"
            style={{ color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--border)' }}
          >
            {count}
          </span>
        }
      />

      {signals.length === 0 ? (
        <p className="text-[12px] text-[color:var(--text-secondary)]">
          No discrete signals extracted.
        </p>
      ) : (
        <ul className="-mx-2">
          {signals.map((s, i) => {
            const meta = STRENGTH_META[s.strength] ?? STRENGTH_META.Weak;
            const cat = CATEGORY_COLOR[s.category] ?? {
              color: 'var(--text-secondary)',
              dim: 'var(--bg-elevated)',
            };
            const basis = BASIS_STYLE[s.basis];
            return (
              <li
                key={i}
                className="group relative flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-[color:var(--bg-elevated)]"
                style={{ animation: 'fadeUp 0.3s ease-out both', animationDelay: `${500 + i * 50}ms` }}
              >
                {/* hover left edge */}
                <span className="absolute left-0 top-1 bottom-1 w-0.5 origin-top scale-y-0 bg-[color:var(--accent)] transition-transform duration-150 group-hover:scale-y-100" />
                <SignalBars bars={meta.bars} color={meta.color} className="mt-0.5 h-4 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-[color:var(--text-primary)]">
                      {s.name}
                    </span>
                    <span
                      className="rounded-lg px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em]"
                      style={{ color: cat.color, background: cat.dim, border: '1px solid var(--border)' }}
                    >
                      {s.category}
                    </span>
                    {basis && (
                      <span
                        className="rounded-lg px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em]"
                        style={{ color: basis.color, background: basis.dim, border: '1px solid var(--border)' }}
                        title={s.basis === 'Observed' ? 'Stated in the case material' : 'Analyst inference'}
                      >
                        {s.basis}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--text-secondary)]">
                    {s.reason}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
