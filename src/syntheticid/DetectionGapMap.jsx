const EFFECTIVE_CONFIG = {
  Yes: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.3)' },
  Partial: { color: '#e3b341', bg: 'rgba(227,179,65,0.12)', border: 'rgba(227,179,65,0.3)' },
  No: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.3)' },
}

const DIFFICULTY_CONFIG = {
  Easy: { color: '#f85149', bg: 'rgba(248,81,73,0.1)', border: 'rgba(248,81,73,0.25)' },
  Medium: { color: '#e3b341', bg: 'rgba(227,179,65,0.1)', border: 'rgba(227,179,65,0.25)' },
  Hard: { color: '#3fb950', bg: 'rgba(63,185,80,0.1)', border: 'rgba(63,185,80,0.25)' },
}

export default function DetectionGapMap({ data }) {
  const { existing_defenses, missing_defenses } = data

  return (
    <div className="gap-map-grid" style={{ display: 'grid', gap: 24 }}>
      {/* Left: Existing defenses */}
      <div>
        <h3 style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#388bfd', display: 'inline-block' }} />
          Your Defenses ({existing_defenses.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {existing_defenses.map((d, i) => {
            const cfg = EFFECTIVE_CONFIG[d.effective] || EFFECTIVE_CONFIG.Partial
            return (
              <div
                key={i}
                className="step-card"
                style={{
                  animationDelay: `${i * 60}ms`,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{d.defense}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: cfg.color,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 5,
                    padding: '2px 7px',
                    letterSpacing: '0.06em',
                    fontFamily: 'JetBrains Mono, monospace',
                    flexShrink: 0,
                  }}>
                    {d.effective.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                  {d.reason}
                </p>
                {d.circumvention && (
                  <div style={{
                    background: 'rgba(248,81,73,0.06)',
                    border: '1px solid rgba(248,81,73,0.15)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ color: '#f85149', fontSize: 10, flexShrink: 0, marginTop: 1 }}>↳</span>
                    <p style={{ fontSize: 11, color: 'rgba(248,81,73,0.85)', lineHeight: 1.5, margin: 0 }}>
                      {d.circumvention}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Gaps */}
      <div>
        <h3 style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149', display: 'inline-block' }} />
          Critical Gaps ({missing_defenses.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {missing_defenses.map((d, i) => {
            const cfg = DIFFICULTY_CONFIG[d.exploitation_difficulty] || DIFFICULTY_CONFIG.Medium
            return (
              <div
                key={i}
                className="step-card"
                style={{
                  animationDelay: `${i * 60}ms`,
                  background: 'rgba(248,81,73,0.04)',
                  border: '1px solid rgba(248,81,73,0.18)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="#f85149">
                      <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm0 2.5c.3 0 .5.2.5.5v2.3c0 .3-.2.5-.5.5s-.5-.2-.5-.5V4c0-.3.2-.5.5-.5zm0 5.2a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2z"/>
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{d.defense}</span>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: cfg.color,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 5,
                    padding: '2px 7px',
                    letterSpacing: '0.06em',
                    fontFamily: 'JetBrains Mono, monospace',
                    flexShrink: 0,
                  }}>
                    {d.exploitation_difficulty.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1, flexShrink: 0 }}>Exposes:</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    {d.exposed_surface}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{
          marginTop: 14,
          padding: '10px 12px',
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-muted)',
          borderRadius: 8,
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Exploit Difficulty
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            {Object.entries(DIFFICULTY_CONFIG).map(([label, cfg]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
