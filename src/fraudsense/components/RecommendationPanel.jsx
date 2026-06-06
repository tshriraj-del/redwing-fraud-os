import { ACTION_STYLE, PANEL_ANIM, BORDER_ANIM } from '../constants.js';
import ConfidenceMeter from './ConfidenceMeter.jsx';

export default function RecommendationPanel({ recommendation = {}, order = 7 }) {
  const { action, confidence, reasoning, decision_logic = [], next_steps = [], escalation_path } =
    recommendation;
  const style = ACTION_STYLE[action] ?? ACTION_STYLE.Monitor;

  return (
    <section
      className={`panel ${PANEL_ANIM[order]} overflow-hidden p-5 sm:p-6`}
      aria-label="Recommended action"
      style={{
        // Subtle action-tinted gradient over the surface
        backgroundImage: `linear-gradient(180deg, ${style.dim} 0%, transparent 70%)`,
      }}
    >
      <span className={`edge ${BORDER_ANIM[order]}`} style={{ background: style.color }} />

      <h3 className="panel-label mb-4 text-center text-[12px] text-[color:var(--text-secondary)]">
        Recommended Action
      </h3>

      {/* Verdict — flashes white then settles to the action color */}
      <div
        className="font-display text-center text-[32px] font-extrabold uppercase leading-none tracking-[0.08em] sm:text-5xl sm:tracking-[0.2em]"
        style={{
          color: style.color,
          animation: 'actionFlash 0.4s ease-out both',
          animationDelay: '1050ms',
        }}
      >
        {style.label}
      </div>

      <div className="mx-auto mt-5 max-w-[280px]">
        <ConfidenceMeter confidence={confidence} delay={1100} />
      </div>

      {reasoning && (
        <p className="mx-auto mt-5 max-w-[560px] text-center font-mono text-[13px] leading-[1.8] text-[color:var(--text-secondary)]">
          {reasoning}
        </p>
      )}

      {decision_logic.length > 0 && (
        <div className="mx-auto mt-6 max-w-[560px] rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-base)] p-4">
          <div className="font-display mb-2 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
            Decision Logic
          </div>
          <ul className="space-y-1.5">
            {decision_logic.map((step, i) => (
              <li
                key={i}
                className="flex gap-2 font-mono text-[12px] leading-[1.6] text-[color:var(--text-secondary)]"
              >
                <span style={{ color: style.color }}>→</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {next_steps.length > 0 && (
        <div className="mx-auto mt-6 max-w-[560px]">
          <div className="font-display mb-3 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
            Next Steps
          </div>
          <ol className="space-y-3">
            {next_steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-3"
                style={{ animation: 'fadeUp 0.3s ease-out both', animationDelay: `${1150 + i * 80}ms` }}
              >
                <span
                  className="font-display flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    color: 'var(--accent-cyan)',
                    border: '1px solid var(--accent-cyan)',
                    background: 'var(--accent-cyan-dim)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="font-mono text-[12px] leading-relaxed text-[color:var(--text-primary)]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {escalation_path && (
        <div className="mx-auto mt-6 max-w-[560px] rounded-lg border border-dashed border-[color:var(--border-active)] bg-[color:var(--bg-elevated)] p-4">
          <div className="font-display mb-1.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
            ↗ Escalation Path
          </div>
          <p className="font-mono text-[12px] leading-[1.7] text-[color:var(--text-secondary)]">
            {escalation_path}
          </p>
        </div>
      )}
    </section>
  );
}
