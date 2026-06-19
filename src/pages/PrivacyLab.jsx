import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ShieldCheck, Lock, TrendingUp, Layers, Maximize2 } from 'lucide-react';

// Measured leakage-free on held-out data (privacy_layer.py). Differential privacy
// on the recipient-reputation / cross-user graph signal: % of fraud-detection
// utility retained vs the privacy budget ε, at two guarantee strengths.
const CURVE = [
  { eps: 'ε=0.1', label: 'very strong', event: 33,  user: 7   },
  { eps: 'ε=0.5', label: 'strong',      event: 81,  user: 33  },
  { eps: 'ε=1',   label: 'moderate',    event: 91,  user: 54  },
  { eps: 'ε=2',   label: 'light',       event: 95,  user: 75  },
  { eps: 'ε=5',   label: 'minimal',     event: 97,  user: 91  },
  { eps: 'none',  label: 'no',          event: 100, user: 100 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: 'JetBrains Mono, monospace' }}>
          {p.dataKey === 'event' ? 'Event-level' : 'User-level'}: {p.value}% kept
        </div>
      ))}
    </div>
  );
};

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || 'var(--text)', letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

export default function PrivacyLab() {
  const [epsIdx, setEpsIdx] = useState(2); // default ε=1
  const sel = CURVE[epsIdx];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#818cf8,#c084fc)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldCheck size={15} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Privacy-Preserving Fraud Detection</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Differential privacy on the cross-user network signal — catch fraud without centralizing or inferring any individual's raw data</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <Lock size={11} /> ε-DP · held-out, leakage-free
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <MetricCard label="Non-private baseline" value="0.724" sub="Recipient-reputation AUC (no privacy)" />
        <MetricCard label="Detection kept @ ε=1" value="91%" sub="Event-level DP — protects a transaction" accent="#818cf8" />
        <MetricCard label="Detection kept @ ε=5" value="91%" sub="User-level DP — protects a whole user" accent="#c084fc" />
        <MetricCard label="Data clamped (C=5)" value="1.06%" sub="Contribution bound enabling user-level DP" accent="var(--green)" />
      </div>

      {/* Chart + interactive panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Trade-off curve + ε slider */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={12} style={{ color: 'var(--accent)' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Privacy ↔ Detection Trade-off</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>% detection utility retained vs privacy budget ε · stronger privacy ← left</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 2, background: '#818cf8' }} />Event-level</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 2, background: '#c084fc' }} />User-level</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={CURVE} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="eps" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={sel.eps} stroke="var(--text-muted)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="event" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="user" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Privacy budget</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{sel.eps} · {sel.label} privacy</span>
            </div>
            <input type="range" min={0} max={CURVE.length - 1} step={1} value={epsIdx} onChange={e => setEpsIdx(+e.target.value)} style={{ width: '100%', accentColor: '#818cf8', cursor: 'pointer' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#818cf8', fontFamily: 'JetBrains Mono, monospace' }}>{sel.event}%</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Event-level detection kept</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#c084fc', fontFamily: 'JetBrains Mono, monospace' }}>{sel.user}%</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>User-level detection kept</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scale advantage + guarantees */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Maximize2 size={12} style={{ color: 'var(--accent)' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>The Scale Advantage</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              User-level DP at ε=1 — detection retained grows with data volume:
            </div>
            {[
              { label: 'Full data', val: 54, color: '#c084fc' },
              { label: '25% subsample', val: 18, color: 'var(--yellow)' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{r.val}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${r.val}%`, borderRadius: 2, background: r.color, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text)', lineHeight: 1.6, padding: '8px 10px', background: 'var(--accent-dim)', borderRadius: 7 }}>
              DP noise is fixed by sensitivity/ε, not data size — so at consumer-payments scale, strong formal privacy is nearly free. <b>Privacy is a scale advantage.</b>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Layers size={12} style={{ color: 'var(--accent)' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Two Guarantees</div>
            </div>
            {[
              { c: '#818cf8', t: 'Event-level DP', d: 'Protects one transaction. Laplace(1/ε) noise on counts.' },
              { c: '#c084fc', t: 'User-level DP', d: 'Protects a whole user. Contribution clamp (C=5) bounds sensitivity → Laplace(C/ε).' },
            ].map(r => (
              <div key={r.t} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 3, borderRadius: 2, background: r.c, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{r.t}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 1 }}>{r.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', opacity: 0.7 }}>
        Measured leakage-free on held-out data (synthetic benchmark) · privacy_layer.py · PRIVACY_FRAUD_PRD.md
      </div>
    </div>
  );
}
