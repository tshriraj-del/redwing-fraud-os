import { useState } from 'react'

const PLATFORM_TYPES = [
  'Fintech / Neobank Onboarding',
  'Marketplace Seller Signup',
  'Crypto Exchange KYC',
  'BNPL / Credit Application',
  'E-commerce Buyer Account',
  'Gig Economy Worker Onboarding',
  'Other',
]

const DEFENSE_OPTIONS = [
  { id: 'gov_id', label: 'Government ID verification' },
  { id: 'selfie', label: 'Selfie / liveness check' },
  { id: 'email', label: 'Email verification' },
  { id: 'phone', label: 'Phone number verification' },
  { id: 'device', label: 'Device fingerprinting' },
  { id: 'ip', label: 'IP reputation check' },
  { id: 'biometrics', label: 'Behavioral biometrics' },
  { id: 'address', label: 'Address verification' },
  { id: 'social', label: 'Social media cross-check' },
  { id: 'manual', label: 'Manual review queue' },
  { id: 'graph', label: 'Graph / network analysis' },
]

const SOPHISTICATION_LEVELS = [
  {
    id: 'Script Kiddie',
    label: 'Script Kiddie',
    desc: 'Cheap off-the-shelf tools, low effort, high volume. Unsophisticated techniques easily detected by basic controls.',
    color: '#e3b341',
  },
  {
    id: 'Organized Ring',
    label: 'Organized Ring',
    desc: 'Coordinated human-in-the-loop operation with moderate resources. Targeted, persistent, capable of bypassing standard KYC.',
    color: '#f85149',
  },
  {
    id: 'AI Fraud Agent',
    label: 'AI Fraud Agent',
    desc: 'Fully autonomous agent that generates synthetic identities, deepfakes documents, learns from rejections, and scales infinitely.',
    color: '#a371f7',
  },
]

export default function InputPanel({ platform, setPlatform, defenses, setDefenses, sophistication, setSophistication, onSimulate, loading }) {
  const [platformInput, setPlatformInput] = useState(platform)
  const [showOther, setShowOther] = useState(false)

  const toggleDefense = (label) => {
    setDefenses(prev =>
      prev.includes(label) ? prev.filter(d => d !== label) : [...prev, label]
    )
  }

  const handlePlatformChange = (val) => {
    if (val === 'Other') {
      setShowOther(true)
      setPlatform('')
    } else {
      setShowOther(false)
      setPlatform(val)
      setPlatformInput(val)
    }
  }

  const activeLevel = SOPHISTICATION_LEVELS.find(l => l.id === sophistication)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-muted)',
      borderRadius: 14,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 22,
      height: 'fit-content',
      position: 'sticky',
      top: 72,
    }}>
      {/* Panel heading */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
          Attack Configuration
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
          Define the target and its current defenses
        </p>
      </div>

      {/* Platform type */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Platform Type
        </label>
        <div style={{ position: 'relative' }}>
          <select
            value={showOther ? 'Other' : platform}
            onChange={e => handlePlatformChange(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              padding: '9px 36px 9px 12px',
              fontSize: 13,
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              fontFamily: 'inherit',
            }}
          >
            {PLATFORM_TYPES.map(p => (
              <option key={p} value={p} style={{ background: '#0d1117' }}>{p}</option>
            ))}
          </select>
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: 'var(--text-muted)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L1 3h10z"/>
            </svg>
          </div>
        </div>
        {showOther && (
          <input
            type="text"
            placeholder="Describe your platform..."
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            style={{
              marginTop: 8,
              width: '100%',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              padding: '9px 12px',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
        )}
      </div>

      {/* Defense checklist */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Defenses
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setDefenses(DEFENSE_OPTIONS.map(d => d.label))}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: 11, cursor: 'pointer', padding: 0,
              }}
            >
              All
            </button>
            <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>·</span>
            <button
              onClick={() => setDefenses([])}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: 11, cursor: 'pointer', padding: 0,
              }}
            >
              None
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEFENSE_OPTIONS.map(({ id, label }) => {
            const active = defenses.includes(label)
            return (
              <button
                key={id}
                onClick={() => toggleDefense(label)}
                className="defense-chip"
                style={{
                  background: active ? 'rgba(56,139,253,0.15)' : 'var(--surface-raised)',
                  border: `1px solid ${active ? 'rgba(56,139,253,0.5)' : 'var(--border-muted)'}`,
                  color: active ? '#388bfd' : 'var(--text-muted)',
                  borderRadius: 20,
                  padding: '5px 11px',
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  lineHeight: 1.4,
                }}
              >
                {active && (
                  <span style={{ marginRight: 4, fontSize: 10 }}>✓</span>
                )}
                {label}
              </button>
            )
          })}
        </div>

        {defenses.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 8 }}>
            {defenses.length} defense{defenses.length !== 1 ? 's' : ''} selected
          </p>
        )}
        {defenses.length === 0 && (
          <p style={{ fontSize: 11, color: 'rgba(248,81,73,0.7)', marginTop: 8 }}>
            Select at least one defense to run the simulation
          </p>
        )}
      </div>

      {/* Sophistication level */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Attack Sophistication
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SOPHISTICATION_LEVELS.map(level => {
            const active = sophistication === level.id
            return (
              <button
                key={level.id}
                onClick={() => setSophistication(level.id)}
                style={{
                  background: active ? `rgba(${hexToRgb(level.color)}, 0.08)` : 'var(--surface-raised)',
                  border: `1px solid ${active ? `rgba(${hexToRgb(level.color)}, 0.4)` : 'var(--border-muted)'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 10, height: 10,
                    borderRadius: '50%',
                    background: active ? level.color : 'var(--border)',
                    flexShrink: 0,
                    boxShadow: active ? `0 0 6px ${level.color}60` : 'none',
                    transition: 'all 0.15s ease',
                  }} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? level.color : 'var(--text-muted)',
                    fontFamily: 'inherit',
                  }}>
                    {level.label}
                  </span>
                  {level.id === 'AI Fraud Agent' && (
                    <span style={{
                      fontSize: 9,
                      background: 'rgba(163,113,247,0.2)',
                      color: '#a371f7',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}>
                      DEFAULT
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: active ? 'var(--text-muted)' : 'var(--text-subtle)', margin: 0, paddingLeft: 18, lineHeight: 1.5, fontFamily: 'inherit' }}>
                  {level.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onSimulate}
        disabled={loading}
        style={{
          width: '100%',
          background: loading
            ? 'rgba(248,81,73,0.3)'
            : 'linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%)',
          border: '1px solid rgba(248,81,73,0.5)',
          borderRadius: 10,
          color: '#fff',
          padding: '13px 20px',
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          transition: 'all 0.2s ease',
          letterSpacing: '0.01em',
          boxShadow: loading ? 'none' : '0 4px 16px rgba(248,81,73,0.25)',
          fontFamily: 'inherit',
        }}
      >
        {loading ? (
          <>
            <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round"/>
            </svg>
            Simulating attack...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round"/>
              <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Simulate Attack
          </>
        )}
      </button>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
