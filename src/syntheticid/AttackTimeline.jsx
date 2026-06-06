import { useState } from 'react'

const OUTCOME_CONFIG = {
  BYPASSED: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.35)', label: 'BYPASSED', dot: '#f85149' },
  DETECTED: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.35)', label: 'DETECTED', dot: '#3fb950' },
  UNCERTAIN: { color: '#e3b341', bg: 'rgba(227,179,65,0.12)', border: 'rgba(227,179,65,0.35)', label: 'UNCERTAIN', dot: '#e3b341' },
}

export default function AttackTimeline({ data, bypassed, total }) {
  const [expanded, setExpanded] = useState({})

  const toggle = (step) => setExpanded(prev => ({ ...prev, [step]: !prev[step] }))

  return (
    <div>
      {/* Summary line */}
      <div style={{
        marginBottom: 18,
        padding: '10px 14px',
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-muted)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11 }}>SIMULATION RESULT:</span>
        {[
          { outcome: 'BYPASSED', count: data.filter(s => s.outcome === 'BYPASSED').length, color: '#f85149' },
          { outcome: 'DETECTED', count: data.filter(s => s.outcome === 'DETECTED').length, color: '#3fb950' },
          { outcome: 'UNCERTAIN', count: data.filter(s => s.outcome === 'UNCERTAIN').length, color: '#e3b341' },
        ].map(({ outcome, count, color }) => count > 0 && (
          <span key={outcome} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span style={{ color, fontWeight: 600 }}>{count}</span>
            <span style={{ color: 'var(--text-subtle)' }}>{outcome.toLowerCase()}</span>
          </span>
        ))}
        <span style={{ color: 'var(--text-subtle)', marginLeft: 4 }}>
          · {bypassed} of {total} steps bypassed defenses
        </span>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical connector line */}
        <div style={{
          position: 'absolute',
          left: 16,
          top: 17,
          bottom: 17,
          width: 1,
          background: 'linear-gradient(to bottom, var(--border-muted), transparent)',
          zIndex: 0,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((step, i) => {
            const cfg = OUTCOME_CONFIG[step.outcome] || OUTCOME_CONFIG.UNCERTAIN
            const isExpanded = expanded[step.step]

            return (
              <div
                key={step.step}
                className="step-card"
                style={{
                  animationDelay: `${i * 110}ms`,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Step number circle */}
                <div style={{
                  width: 34, height: 34,
                  borderRadius: '50%',
                  background: cfg.bg,
                  border: `1.5px solid ${cfg.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  color: cfg.color,
                  zIndex: 2,
                  position: 'relative',
                }}>
                  {step.step}
                </div>

                {/* Card */}
                <div style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}>
                  {/* Card header */}
                  <div style={{ padding: '12px 14px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
                        {step.name}
                      </h3>
                      {/* Outcome badge */}
                      <span style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        borderRadius: 5,
                        padding: '3px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        fontFamily: 'JetBrains Mono, monospace',
                        flexShrink: 0,
                      }}>
                        {cfg.label}
                      </span>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 10 }}>
                      {step.description}
                    </p>

                    {/* Targeted defense tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500 }}>Targets:</span>
                      <span style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--border-muted)',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {step.targeted_defense}
                      </span>
                    </div>
                  </div>

                  {/* Expandable "Why?" section */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-muted)',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggle(step.step)}
                  >
                    <div style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Why this outcome?
                      </span>
                      <svg
                        width="12" height="12"
                        viewBox="0 0 12 12"
                        fill="var(--text-subtle)"
                        style={{ transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
                      >
                        <path d="M6 8L1 3h10z"/>
                      </svg>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '0 14px 12px',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-start',
                      }}>
                        <div style={{
                          width: 3, flexShrink: 0,
                          alignSelf: 'stretch',
                          background: cfg.color,
                          borderRadius: 2,
                          opacity: 0.5,
                        }} />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                          {step.outcome_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
