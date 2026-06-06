import { useEffect, useRef, useState } from 'react'

const SCORE_DIMENSIONS = [
  { key: 'identity_spoofability', label: 'Identity Spoofability', desc: 'How easily can an agent fake a valid identity on this platform?' },
  { key: 'liveness_bypassability', label: 'Liveness Bypassability', desc: 'How vulnerable is biometric/video verification to deepfake injection?' },
  { key: 'signal_evasion', label: 'Signal Evasion', desc: 'How easily can the agent mask device, IP, and network signals?' },
  { key: 'scale_potential', label: 'Scale Potential', desc: 'How many accounts could an agent farm before triggering detection?' },
  { key: 'recovery_speed', label: 'Recovery Speed', desc: 'How quickly could the platform detect and contain the attack?' },
]

const BENCHMARKS = {
  'Fintech / Neobank Onboarding': 62,
  'Crypto Exchange KYC': 58,
  'BNPL / Credit Application': 65,
  'Marketplace Seller Signup': 55,
  'E-commerce Buyer Account': 48,
  'Gig Economy Worker Onboarding': 57,
}

function scoreColor(score) {
  if (score > 70) return '#f85149'
  if (score > 40) return '#e3b341'
  return '#3fb950'
}

function scoreLabel(score) {
  if (score > 70) return 'CRITICAL'
  if (score > 40) return 'MODERATE'
  return 'RESILIENT'
}

function CircularScore({ score }) {
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const [animated, setAnimated] = useState(false)
  const color = scoreColor(score)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(t)
  }, [score])

  const dashOffset = animated ? circumference - (score / 100) * circumference : circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <svg width="144" height="144" viewBox="0 0 144 144">
          {/* Background ring */}
          <circle
            cx="72" cy="72" r={radius}
            fill="none"
            stroke="var(--border-muted)"
            strokeWidth="10"
          />
          {/* Colored arc */}
          <circle
            cx="72" cy="72" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 72 72)"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
          {/* Score text */}
          <text
            x="72" y="68"
            textAnchor="middle"
            fill={color}
            fontSize="30"
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
          >
            {score}
          </text>
          <text
            x="72" y="86"
            textAnchor="middle"
            fill="var(--text-subtle)"
            fontSize="10"
            fontFamily="Space Grotesk, sans-serif"
            fontWeight="500"
            letterSpacing="1"
          >
            / 100
          </text>
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          background: `rgba(${hexToRgb(color)}, 0.12)`,
          border: `1px solid rgba(${hexToRgb(color)}, 0.3)`,
          borderRadius: 5,
          padding: '3px 10px',
          letterSpacing: '0.1em',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {scoreLabel(score)} EXPOSURE
        </span>
      </div>
    </div>
  )
}

function ScoreBar({ score, label, desc }) {
  const [animated, setAnimated] = useState(false)
  const color = scoreColor(score)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginLeft: 8 }}>{desc}</span>
        </div>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color,
          fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
          marginLeft: 8,
        }}>
          {score}
        </span>
      </div>
      <div style={{
        height: 6,
        background: 'var(--surface-raised)',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid var(--border-muted)',
      }}>
        <div style={{
          height: '100%',
          width: animated ? `${score}%` : '0%',
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: 3,
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: `0 0 6px ${color}50`,
        }} />
      </div>
    </div>
  )
}

export default function ExposureScore({ data, platform }) {
  const benchmark = BENCHMARKS[platform] || 58
  const overall = data.overall
  const delta = overall - benchmark

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 28,
        alignItems: 'start',
      }} className="md:grid-cols-[auto_1fr]">
        {/* Circular gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <CircularScore score={overall} />

          {/* Benchmark comparison */}
          <div style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-muted)',
            borderRadius: 8,
            padding: '10px 16px',
            textAlign: 'center',
            minWidth: 160,
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Industry Benchmark
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>
              {platform.replace(' / ', '/')} avg: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{benchmark}</span>
            </p>
            <p style={{
              fontSize: 12,
              color: delta > 0 ? '#f85149' : '#3fb950',
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {delta > 0 ? `+${delta}` : delta} vs. industry
            </p>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ paddingTop: 4 }}>
          {SCORE_DIMENSIONS.map(({ key, label, desc }) => (
            <ScoreBar key={key} score={data[key]} label={label} desc={desc} />
          ))}
        </div>
      </div>

      {/* Verdict */}
      <div style={{
        marginTop: 22,
        padding: '14px 16px',
        background: `rgba(${hexToRgb(scoreColor(overall))}, 0.06)`,
        border: `1px solid rgba(${hexToRgb(scoreColor(overall))}, 0.2)`,
        borderRadius: 10,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: 18, height: 18,
          borderRadius: '50%',
          background: scoreColor(overall),
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#000">
            {overall > 70
              ? <path d="M5 1a4 4 0 1 0 0 8A4 4 0 0 0 5 1zm0 2c.3 0 .5.2.5.5v2c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-2c0-.3.2-.5.5-.5zm0 4.5a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2z"/>
              : <path d="M3.5 5.5L4.5 6.5l3-3" stroke="#000" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            }
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: scoreColor(overall), marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Analyst Verdict
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
            {data.verdict}
          </p>
        </div>
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
