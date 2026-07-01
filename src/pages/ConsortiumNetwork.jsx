import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { Network, Lock, EyeOff, Users, ShieldCheck } from 'lucide-react';
import { fetchConsortium } from '../api.js';

const TEAL = 'var(--accent)';

// Demo fallback (Vercel / operator-down) - the real measured numbers.
const FALLBACK = {
  spec: { mechanism: 'Each bank shares only contribution-clamped (C=2), Laplace-noised aggregate recipient counts. No raw customer data leaves any bank.', dp_network_size: 10 },
  scale_curve: [
    { banks: 3, auc_local: 0.769, auc_consortium: 0.796, lift: 0.027 },
    { banks: 6, auc_local: 0.762, auc_consortium: 0.819, lift: 0.057 },
    { banks: 10, auc_local: 0.738, auc_consortium: 0.823, lift: 0.085 },
    { banks: 15, auc_local: 0.723, auc_consortium: 0.816, lift: 0.093 },
    { banks: 20, auc_local: 0.683, auc_consortium: 0.799, lift: 0.116 },
  ],
  dp_at_banks: 10,
  dp_curve: [
    { epsilon: 0.25, auc: 0.569, lift_retained_pct: 0, beats_single_bank: false },
    { epsilon: 0.5, auc: 0.634, lift_retained_pct: 0, beats_single_bank: false },
    { epsilon: 1.0, auc: 0.729, lift_retained_pct: 0, beats_single_bank: false },
    { epsilon: 2.0, auc: 0.798, lift_retained_pct: 70.6, beats_single_bank: true },
    { epsilon: 5.0, auc: 0.820, lift_retained_pct: 96.5, beats_single_bank: true },
    { epsilon: 10.0, auc: 0.823, lift_retained_pct: 100, beats_single_bank: true },
  ],
  flagship_mules: [
    { recipient_id: 'M16', per_bank_local_rate: { bank_0: 0.173, bank_1: 0.173, bank_2: 0.258, bank_3: 0.239, bank_4: 0.135 }, consortium_rate: 0.399, fraud_received: 14, total_received: 20, lift: 2.0 },
    { recipient_id: 'M3', per_bank_local_rate: { bank_0: 0.249, bank_1: 0.184, bank_2: 0.166, bank_3: 0.094, bank_4: 0.191 }, consortium_rate: 0.333, fraud_received: 12, total_received: 22, lift: 1.9 },
    { recipient_id: 'M13', per_bank_local_rate: { bank_0: 0.124, bank_1: 0.173, bank_2: 0.199, bank_3: 0.142, bank_4: 0.181 }, consortium_rate: 0.314, fraud_received: 9, total_received: 15, lift: 1.9 },
  ],
  real_anchor: { n_banks: 3, n_cross_bank_recipients: 1465, n_eval_txns: 175353, auc_local: 0.6815, auc_consortium: 0.7067, lift: 0.0252 },
  headline: 'Detection compounds with participants: the consortium lift grows from +0.027 AUC at 3 banks to +0.116 at 20, with no bank sharing raw data.',
};

function ScaleTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ color: 'var(--text-muted)' }}>{label} banks</div>
      {payload.map(p => <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value.toFixed(3)}</div>)}
    </div>
  );
}

export default function ConsortiumNetwork() {
  const [d, setD] = useState(FALLBACK);
  const [live, setLive] = useState(null);

  useEffect(() => {
    fetchConsortium().then(r => { setD(r); setLive(true); }).catch(() => setLive(false));
  }, []);

  const sc = d.scale_curve;
  const big = sc[sc.length - 1];
  const dpBase = d.scale_curve.find(c => c.banks === d.dp_at_banks) || sc[2];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Network size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Cross-Institution Consortium</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Catch mule rings that span banks, without any bank sharing customer data</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--green)' : live === false ? 'var(--yellow)' : 'var(--text-muted)' }} />
          {live === null ? 'Connecting…' : live ? 'Live · /consortium' : 'Demo · measured numbers'}
        </div>
      </div>

      {/* the differentiator */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>The incumbent way</div>
          <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>Pool raw customer data</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>Every member ships customer records to a central network. Powerful, but it hits a privacy and regulatory wall that keeps most banks out.</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Lock size={12} style={{ color: TEAL }} />
            <span style={{ fontSize: 10, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>REDWING</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>Share intelligence, not data</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>Each bank shares only differentially-private, contribution-clamped aggregates. The ring is caught at the pool; no bank ever sees another bank's customers.</div>
        </div>
      </div>

      {/* THE NETWORK EFFECT (headline) */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <Users size={13} style={{ color: TEAL }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>The network effect (the moat)</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: TEAL }}>+{(big.lift).toFixed(3)} AUC at {big.banks} banks</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>As more banks join, each one is blinder alone (lower line) and the consortium's edge widens. Detection compounds with participants - a data-pooling vendor cannot copy this without the privacy wall.</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={sc} margin={{ top: 6, right: 12, bottom: 4, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="banks" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} label={{ value: 'banks in network', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 10 }} />
            <YAxis domain={[0.6, 0.9]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(2)} />
            <Tooltip content={<ScaleTip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="auc_local" name="single bank alone" stroke="#94a3b8" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="auc_consortium" name="consortium (privacy-preserving)" stroke={TEAL} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* DP privacy/utility + flagship */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Privacy / utility ({d.dp_at_banks}-bank network)</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>Stronger privacy (lower ε, left) costs detection. You keep the lift at ε ≥ 2; strong privacy on a sparse signal is honestly costly, and that cost shrinks as the network grows.</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.dp_curve} margin={{ top: 6, right: 12, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="epsilon" type="number" scale="log" domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `ε${v}`} />
              <YAxis domain={[0.5, 0.85]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(2)} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={v => v.toFixed(3)} labelFormatter={v => `ε = ${v}`} />
              <ReferenceLine y={dpBase.auc_consortium} stroke={TEAL} strokeDasharray="4 4" label={{ value: 'consortium (raw)', position: 'insideTopLeft', fill: TEAL, fontSize: 9 }} />
              <ReferenceLine y={dpBase.auc_local} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'single bank', position: 'insideBottomLeft', fill: '#94a3b8', fontSize: 9 }} />
              <Line type="monotone" dataKey="auc" name="consortium + DP" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <EyeOff size={13} style={{ color: TEAL }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Mules blind to every single bank</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>Each bank's local fraud rate looks tame; the pool reveals the mule. Rates are smoothed reputation, fraction fraudulent.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.flagship_mules.slice(0, 3).map(m => {
              const rates = Object.values(m.per_bank_local_rate);
              const maxr = Math.max(...rates, m.consortium_rate);
              return (
                <div key={m.recipient_id} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '9px 11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{m.recipient_id}</span>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{m.fraud_received}/{m.total_received} fraud, split {m.n_banks} banks</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: TEAL, fontFamily: 'JetBrains Mono, monospace' }}>{m.lift}x at the pool</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
                    {rates.map((r, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: `${(r / maxr) * 100}%`, background: '#94a3b8', borderRadius: '2px 2px 0 0', minHeight: 2 }} />
                      </div>
                    ))}
                    <div style={{ width: 3 }} />
                    <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: `${(m.consortium_rate / maxr) * 100}%`, background: TEAL, borderRadius: '2px 2px 0 0', minHeight: 2 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    <span>{m.n_banks} banks, each tame</span><span style={{ color: TEAL }}>consortium flags it</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* real-data anchor */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <ShieldCheck size={18} style={{ color: '#34d399', flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 11.5, color: 'var(--text)', lineHeight: 1.6 }}>
          <b>And it holds on real data.</b> The same mechanism on REDWING's actual {(d.real_anchor.n_eval_txns / 1000).toFixed(0)}k held-out transactions across {d.real_anchor.n_cross_bank_recipients.toLocaleString()} cross-bank recipients: single-bank AUC <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{d.real_anchor.auc_local}</b> to consortium <b style={{ fontFamily: 'JetBrains Mono, monospace', color: TEAL }}>{d.real_anchor.auc_consortium}</b> (+{d.real_anchor.lift.toFixed(3)}). Modest at three banks, exactly as the network curve predicts.
        </div>
      </div>

      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', opacity: 0.7, textAlign: 'center', lineHeight: 1.5 }}>
        {d.spec.mechanism} Controlled multi-bank populations + real-data anchor; differential privacy via the Laplace mechanism with per-user contribution clamping.
      </div>
    </div>
  );
}
