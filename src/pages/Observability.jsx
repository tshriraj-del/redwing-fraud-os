import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Gauge, AlertTriangle, CheckCircle2, GitMerge, ArrowRight } from 'lucide-react';
import { fetchObservability } from '../api.js';

// Fallback (demo mode). Mirrors GET /observability/skew (the measured analysis).
const FALLBACK = {
  offline_auc: 0.984,
  field_catch_before_pct: 0.3,
  field_catch_after_pct: 91.0,
  feature_count: 23,
  features_reproducible_before: 13,
  root_cause: [
    '10 of 23 features had no reproducible definition at serving time',
    'They silently defaulted to zero — including the #2 and #3 most important features',
    '~24% of the model’s signal was dead in production',
    'Invisible to offline AUC, which is computed where the features still exist',
  ],
  fix: [
    'One feature foundation — a single definition computed identically for training and serving',
    'train == serve → skew impossible by construction',
    '23/23 features restored; field catch 0.3% → 91%',
  ],
};

const CatchTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: payload[0].payload.fill, fontFamily: 'JetBrains Mono, monospace' }}>
        {payload[0].payload.stage}: {payload[0].value}% caught
      </div>
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

export default function Observability() {
  const [data, setData] = useState(FALLBACK);
  const [live, setLive] = useState(null);

  useEffect(() => {
    fetchObservability()
      .then(d => { setData({ ...FALLBACK, ...d }); setLive(true); })
      .catch(() => setLive(false));
  }, []);

  const CATCH = [
    { stage: 'Before — skew', value: data.field_catch_before_pct, fill: '#ef4444' },
    { stage: 'After — fixed', value: data.field_catch_after_pct, fill: '#22c55e' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#818cf8,#c084fc)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Gauge size={15} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Model Observability — Training-Serving Skew Detection</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>The failure standard metrics hide: a model that scores great offline but catches almost no fraud in production</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--green)' : live === false ? 'var(--yellow)' : 'var(--text-muted)' }} />
          {live === null ? 'Connecting…' : live ? 'Live · operator /observability/skew' : 'Demo mode · start operator for live data'}
        </div>
      </div>

      {/* "The metric lied" hero callout */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.1 }}>{data.offline_auc.toFixed(3)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>offline AUC<br />“best-in-class”</div>
        </div>
        <ArrowRight size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AlertTriangle size={14} style={{ color: 'var(--red)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>The metric lied</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
            In the live scoring path the model caught <b style={{ color: 'var(--red)' }}>under 1% of fraud</b> — it was blind to <b>~24% of its own inputs</b> ({data.feature_count - data.features_reproducible_before} of {data.feature_count} features couldn't be reproduced at serving and silently defaulted to zero). No offline metric revealed it.
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <MetricCard label="Offline AUC" value={data.offline_auc.toFixed(3)} sub="What the dashboard reported" />
        <MetricCard label="Field catch — skew" value={`${data.field_catch_before_pct}%`} sub="Live path, before the fix" accent="var(--red)" />
        <MetricCard label="Field catch — fixed" value={`${data.field_catch_after_pct}%`} sub="After feature-consistency rebuild" accent="var(--green)" />
        <MetricCard label="Features restored" value={`${data.feature_count}/${data.feature_count}`} sub="No silent zero-fill" accent="#818cf8" />
      </div>

      {/* Chart + root cause / fix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Gauge size={12} style={{ color: 'var(--accent)' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Production Fraud Catch Rate</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>Held-out, full operator pipeline · same model, same thresholds — only feature reproduction changed</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={CATCH} margin={{ top: 16, right: 8, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="stage" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
              <Tooltip content={<CatchTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={90}>
                {CATCH.map((d, i) => <Cell key={i} fill={d.fill} />)}
                <LabelList dataKey="value" position="top" formatter={v => v + '%'} style={{ fill: 'var(--text)', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text)', textAlign: 'center', padding: '8px 10px', background: 'var(--accent-dim)', borderRadius: 7 }}>
            <b>+90 points of catch rate</b> recovered — entirely from making features reproducible, not retraining a better model.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <AlertTriangle size={12} style={{ color: 'var(--red)' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Root Cause</div>
            </div>
            {data.root_cause.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ color: 'var(--red)', fontSize: 11, lineHeight: 1.5 }}>•</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <GitMerge size={12} style={{ color: 'var(--green)' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>The Fix</div>
            </div>
            {data.fix.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <CheckCircle2 size={12} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', opacity: 0.7 }}>
        Measured leakage-free on held-out data (synthetic benchmark) · features.py (feature foundation) · redteam.py (blind-spot finder)
      </div>
    </div>
  );
}
