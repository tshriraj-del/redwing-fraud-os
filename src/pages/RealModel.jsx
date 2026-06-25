import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Database, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Beaker } from 'lucide-react';
import { fetchPaymentMeta } from '../api.js';

// ── Demo fallback (Vercel / operator-down) - the real measured numbers ────────
const FALLBACK = {
  model: { best_iteration: 153, n_trees: 154, calibration: 'platt (logistic on held-out cal split)' },
  dataset: {
    name: 'ULB Credit Card Fraud (Worldline / ULB)',
    source: 'OpenML id 1597 - real European cardholder transactions, Sept 2013',
    synthetic: false, n_total: 284807, n_fraud: 492, base_rate: 0.00173,
    features: 'V1–V28 (PCA-anonymised) + log amount',
  },
  split: { scheme: 'stratified 60/20/20 (train/cal/test)', seed: 7, n_test: 56962, test_fraud: 99 },
  metrics: {
    pr_auc: 0.8974, roc_auc: 0.9854, precision: 0.9425, recall: 0.8283, f1: 0.8817,
    threshold: 0.056, tp: 82, fp: 5, fn: 17, tn: 56858, base_rate: 0.00174, alert_false_rate: 0.0575,
  },
  pr_curve: [
    { recall: 1.0, precision: 0.0017 }, { recall: 1.0, precision: 0.0022 }, { recall: 1.0, precision: 0.0027 },
    { recall: 0.9899, precision: 0.0038 }, { recall: 0.9899, precision: 0.0055 }, { recall: 0.9798, precision: 0.0069 },
    { recall: 0.9697, precision: 0.0093 }, { recall: 0.9596, precision: 0.0145 }, { recall: 0.9495, precision: 0.0334 },
    { recall: 0.92, precision: 0.18 }, { recall: 0.88, precision: 0.62 }, { recall: 0.85, precision: 0.86 },
    { recall: 0.828, precision: 0.943 }, { recall: 0.74, precision: 0.97 }, { recall: 0.55, precision: 0.99 }, { recall: 0.2, precision: 1.0 },
  ],
  feature_importance: [
    { feature: 'V14', gain: 57.97 }, { feature: 'V10', gain: 31.25 }, { feature: 'V12', gain: 11.37 },
    { feature: 'V17', gain: 8.95 }, { feature: 'V7', gain: 8.16 }, { feature: 'V4', gain: 6.56 },
    { feature: 'V1', gain: 4.16 }, { feature: 'V26', gain: 3.84 },
  ],
  samples: [
    { label: 'Caught fraud (larger ticket)', story: 'Real fraud the model blocked - a higher-value transaction.', amount: 766.36, p_fraud: 0.9816, ground_truth: 1, decision: 'BLOCK' },
    { label: 'Caught fraud', story: 'Real fraud, correctly blocked.', amount: 512.25, p_fraud: 0.9749, ground_truth: 1, decision: 'BLOCK' },
    { label: 'MISSED fraud', story: 'Real fraud the model let through - the honest cost of a usable false-positive rate.', amount: 42.53, p_fraud: 0.0004, ground_truth: 1, decision: 'ALLOW' },
    { label: 'FALSE positive', story: 'Legit transaction the model wrongly blocked - what a non-trivial false-positive rate feels like.', amount: 1.0, p_fraud: 0.8516, ground_truth: 0, decision: 'BLOCK' },
    { label: 'Correct legit', story: 'Legit transaction, correctly allowed.', amount: 50.0, p_fraud: 0.0004, ground_truth: 0, decision: 'ALLOW' },
    { label: 'Correct legit', story: 'Legit transaction, correctly allowed.', amount: 19.99, p_fraud: 0.0004, ground_truth: 0, decision: 'ALLOW' },
  ],
  headline: 'PR-AUC 0.897 on REAL fraud at a 0.17% base rate - the honest metric, not ROC-AUC 0.985.',
};

const EM = '#34d399';   // "real data" accent

function Metric({ label, value, sub, accent, big }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: big ? '16px 18px' : '13px 15px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: big ? 30 : 22, fontWeight: 800, color: accent || 'var(--text)', letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function PRTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 11px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
      recall {(d.recall * 100).toFixed(0)}% · precision {(d.precision * 100).toFixed(0)}%
    </div>
  );
}

function SampleCard({ s }) {
  const [revealed, setRevealed] = useState(false);
  const blocked = s.decision === 'BLOCK';
  const isFraud = s.ground_truth === 1;
  const correct = (blocked && isFraud) || (!blocked && !isFraud);
  const vColor = correct ? '#22c55e' : '#ef4444';
  const vText = correct ? (isFraud ? 'Caught ✓' : 'Correctly allowed ✓') : (isFraud ? 'Missed ✗' : 'False positive ✗');
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>${s.amount.toLocaleString()}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, minHeight: 30 }}>{s.story}</div>
      {!revealed ? (
        <button onClick={() => setRevealed(true)}
          style={{ fontSize: 11, fontWeight: 600, color: EM, background: `${EM}14`, border: `1px solid ${EM}44`, borderRadius: 7, padding: '6px 0', cursor: 'pointer' }}>
          Score it →
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-muted)' }}>model P(fraud)</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: blocked ? '#ef4444' : 'var(--text)' }}>{(s.p_fraud * 100).toFixed(1)}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-muted)' }}>decision → truth</span>
            <span style={{ fontWeight: 600 }}>
              <span style={{ color: blocked ? '#ef4444' : '#22c55e' }}>{s.decision}</span>
              <span style={{ color: 'var(--text-muted)' }}> → {isFraud ? 'fraud' : 'legit'}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: vColor }}>
            {correct ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{vText}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RealModel() {
  const [m, setM] = useState(FALLBACK);
  const [live, setLive] = useState(null);

  useEffect(() => {
    fetchPaymentMeta().then(d => { setM(d); setLive(true); }).catch(() => setLive(false));
  }, []);

  const mt = m.metrics, ds = m.dataset;
  const maxGain = Math.max(...m.feature_importance.map(f => f.gain));

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, background: `linear-gradient(135deg,${EM},#10b981)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Database size={16} color="#062c22" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Real-Data Validation - Payment Fraud</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>The engine, graded on real labels - not the synthetic data it was built on</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: EM, background: `${EM}1a`, border: `1px solid ${EM}55`, padding: '3px 9px', borderRadius: 6, letterSpacing: '0.04em' }}>
            <ShieldCheck size={12} /> REAL DATA · OUT-OF-SAMPLE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--green)' : live === false ? 'var(--yellow)' : 'var(--text-muted)' }} />
            {live === null ? 'Connecting…' : live ? 'Live · /payment/meta' : 'Demo · measured numbers'}
          </span>
        </div>
      </div>

      {/* provenance + honesty callout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Database size={13} style={{ color: EM }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Dataset provenance</span>
            <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: EM, background: `${EM}1a`, border: `1px solid ${EM}55`, padding: '2px 7px', borderRadius: 5 }}>SYNTHETIC: NO</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>{ds.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{ds.source}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 9 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Transactions <b style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{ds.n_total.toLocaleString()}</b></div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Fraud <b style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{ds.n_fraud} ({(ds.base_rate * 100).toFixed(3)}%)</b></div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Features <b style={{ color: 'var(--text)' }}>{ds.features}</b></div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Split <b style={{ color: 'var(--text)' }}>{m.split.scheme}</b></div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>Why PR-AUC, not ROC-AUC</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.65 }}>
            At a <b>{(mt.base_rate * 100).toFixed(2)}%</b> base rate, ROC-AUC <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{mt.roc_auc.toFixed(3)}</b> flatters the model - a near-perfect-looking score that hides the real cost. <b style={{ color: EM }}>PR-AUC {mt.pr_auc.toFixed(3)}</b> is the honest number: it's measured against the rarity of fraud, where false positives actually hurt.
          </div>
        </div>
      </div>

      {/* metric hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 12 }}>
        <Metric label="PR-AUC · headline" value={mt.pr_auc.toFixed(3)} sub="honest at 0.17% base rate" accent={EM} big />
        <Metric label="ROC-AUC" value={mt.roc_auc.toFixed(3)} sub="context - misleading here" />
        <Metric label="Precision" value={mt.precision.toFixed(3)} sub={`${(mt.alert_false_rate * 100).toFixed(0)}% of alerts false`} />
        <Metric label="Recall" value={mt.recall.toFixed(3)} sub={`${mt.tp}/${mt.tp + mt.fn} fraud caught`} />
        <Metric label="F1" value={mt.f1.toFixed(3)} sub={`thr ${mt.threshold.toFixed(3)}`} />
      </div>

      {/* PR curve + confusion + importance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Precision–Recall curve (held-out)</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>The dashed floor is a random classifier ({(mt.base_rate * 100).toFixed(2)}%). The gap above it is real signal.</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={m.pr_curve} margin={{ top: 6, right: 10, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} label={{ value: 'recall', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis domain={[0, 1]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} />
              <Tooltip content={<PRTooltip />} />
              <ReferenceLine y={mt.base_rate} stroke="#64748b" strokeDasharray="5 4" />
              <Line type="monotone" dataKey="precision" stroke={EM} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* confusion */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Confusion (test split)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['True positive', mt.tp, '#22c55e'], ['False positive', mt.fp, '#ef4444'], ['False negative', mt.fn, '#f59e0b'], ['True negative', mt.tn, 'var(--text-muted)']].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '9px 11px' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c, fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>{v.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          {/* importance */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Feature importance (gain)</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>V14 leads - the known-strongest ULB signal. The model learned real structure.</div>
            {m.feature_importance.slice(0, 6).map(f => (
              <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', width: 34, fontFamily: 'JetBrains Mono, monospace' }}>{f.feature}</span>
                <div style={{ flex: 1, height: 7, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(f.gain / maxGain) * 100}%`, height: '100%', background: EM }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', width: 36, textAlign: 'right' }}>{f.gain.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* interactive held-out scorer */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <Beaker size={13} style={{ color: EM }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Score real held-out transactions</span>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 12 }}>
          Six real transactions the model never trained on. Click to see its decision - then the ground truth. The set deliberately includes a miss and a false-positive.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {m.samples.map((s, i) => <SampleCard key={i} s={s} />)}
        </div>
      </div>

      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', opacity: 0.7, textAlign: 'center', lineHeight: 1.5 }}>
        {m.headline} · Trained + validated on real labels; this anchors the engine that REDWING applies to the irrevocable-rail niche where real fraud labels don't exist.
      </div>
    </div>
  );
}
