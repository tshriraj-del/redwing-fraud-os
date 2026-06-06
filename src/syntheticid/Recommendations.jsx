const DIFFICULTY_CONFIG = {
  Low: {
    color: '#3fb950',
    bg: 'rgba(63,185,80,0.1)',
    border: 'rgba(63,185,80,0.25)',
    icon: '●',
  },
  Medium: {
    color: '#e3b341',
    bg: 'rgba(227,179,65,0.1)',
    border: 'rgba(227,179,65,0.25)',
    icon: '◆',
  },
  High: {
    color: '#f85149',
    bg: 'rgba(248,81,73,0.1)',
    border: 'rgba(248,81,73,0.25)',
    icon: '▲',
  },
}

const PRIORITY_COLORS = ['#f85149', '#e3b341', '#388bfd', '#a371f7']

export default function Recommendations({ data }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
        Ranked by fraud reduction impact. Implement these in sequence for maximum ROI on your defense investment.
      </p>

      <div className="rec-grid" style={{ display: 'grid', gap: 12 }}>
        {data.map((rec, i) => {
          const diff = DIFFICULTY_CONFIG[rec.implementation_difficulty] || DIFFICULTY_CONFIG.Medium
          const priorityColor = PRIORITY_COLORS[i] || '#388bfd'

          return (
            <div
              key={i}
              className="step-card"
              style={{
                animationDelay: `${i * 100}ms`,
                background: 'var(--surface)',
                border: '1px solid var(--border-muted)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Priority header strip */}
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: `rgba(${hexToRgb(priorityColor)}, 0.06)`,
              }}>
                <div style={{
                  width: 26, height: 26,
                  borderRadius: '50%',
                  background: `rgba(${hexToRgb(priorityColor)}, 0.15)`,
                  border: `1px solid rgba(${hexToRgb(priorityColor)}, 0.4)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  color: priorityColor,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Priority {i + 1}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: diff.color,
                    background: diff.bg,
                    border: `1px solid ${diff.border}`,
                    borderRadius: 4,
                    padding: '2px 7px',
                    letterSpacing: '0.07em',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {rec.implementation_difficulty.toUpperCase()} EFFORT
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '14px 16px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
                  {rec.defense}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 12 }}>
                  {rec.rationale}
                </p>

                {/* Fraud reduction estimate */}
                <div style={{
                  background: 'rgba(63,185,80,0.07)',
                  border: '1px solid rgba(63,185,80,0.2)',
                  borderRadius: 7,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="#3fb950">
                    <path d="M6.5 1a5.5 5.5 0 1 0 0 11A5.5 5.5 0 0 0 6.5 1zm2.5 3.5L5.5 8 3.5 6" stroke="#3fb950" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 500 }}>
                    Est. impact: <strong>{rec.estimated_fraud_reduction}</strong>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Implementation note */}
      <div style={{
        marginTop: 18,
        padding: '12px 16px',
        background: 'rgba(56,139,253,0.06)',
        border: '1px solid rgba(56,139,253,0.18)',
        borderRadius: 10,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="#388bfd" style={{ marginTop: 1, flexShrink: 0 }}>
          <path d="M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1zm0 2.5c.3 0 .5.2.5.5v3c0 .3-.2.5-.5.5s-.5-.2-.5-.5V4c0-.3.2-.5.5-.5zm0 6.5a.65.65 0 1 1 0-1.3.65.65 0 0 1 0 1.3z"/>
        </svg>
        <p style={{ fontSize: 12, color: 'rgba(56,139,253,0.85)', lineHeight: 1.6, margin: 0 }}>
          Estimates assume proper implementation and tuning. Start with Priority 1 — it typically delivers the highest risk reduction per dollar spent before tackling deeper infrastructure changes.
        </p>
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
