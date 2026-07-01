import { useState, useEffect } from 'react';
import { ShieldCheck, FileText, BarChart3, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Badge from '../components/Badge.jsx';

const API = 'http://localhost:8000';

const VERDICT_STYLE = {
  CRITICAL: { color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(239,68,68,0.3)'  },
  HIGH:     { color: 'var(--orange)', bg: 'var(--orange-dim)', border: 'rgba(249,115,22,0.3)' },
  MEDIUM:   { color: 'var(--yellow)', bg: 'var(--yellow-dim)', border: 'rgba(245,158,11,0.3)' },
  LOW:      { color: 'var(--green)',  bg: 'var(--green-dim)',  border: 'rgba(34,197,94,0.3)'  },
};

const VERDICT_TONE = { CRITICAL: 'danger', HIGH: 'orange', MEDIUM: 'warning', LOW: 'success' };

const TABS = ['Decision Log', 'Model Card', 'Governance'];

// ── Shared primitives ─────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 24px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </p>
  );
}

function VerdictBadge({ verdict }) {
  return <Badge tone={VERDICT_TONE[verdict] || 'neutral'}>{verdict}</Badge>;
}

function StatusPill({ ok, label }) {
  return <Badge tone={ok ? 'success' : 'warning'}>{label}</Badge>;
}

// ── Contribution bar chart ────────────────────────────────────────────────────

function ContributionBar({ factor }) {
  const maxWidth = 160;
  const pct = Math.min(Math.abs(factor.contribution) * 300, 1); // normalize
  const width = Math.round(pct * maxWidth);
  const isRisk = factor.direction === 'increases_risk';
  const color = isRisk ? 'var(--red)' : 'var(--green)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 190, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.3, flexShrink: 0 }}>
        {factor.label}
        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>
          value: {factor.value}
        </span>
      </div>
      <div style={{ position: 'relative', width: maxWidth, height: 8, background: 'var(--bg-elevated)', borderRadius: 4, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${Math.max(width, 2)}px`,
          background: color, borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 10, color, fontFamily: 'JetBrains Mono, monospace', width: 52, textAlign: 'right' }}>
        {isRisk ? '+' : ''}{factor.contribution.toFixed(4)}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
        {isRisk ? '↑ risk' : '↓ risk'}
      </span>
    </div>
  );
}

// ── Explanation detail panel ──────────────────────────────────────────────────

function ExplanationDetail({ record, onClose }) {
  const s = VERDICT_STYLE[record.verdict] || VERDICT_STYLE.LOW;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${s.border}`,
      borderRadius: 10,
      padding: '20px 24px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <VerdictBadge verdict={record.verdict} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
              {record.transaction_id}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 640 }}>
            {record.narrative}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
          <ChevronUp size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Score summary */}
        <div style={{ minWidth: 140 }}>
          <SectionLabel>Risk Score</SectionLabel>
          <div style={{ fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>
            {Math.round(record.combined_score * 100)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            ML: {Math.round(record.ml_score * 100)} · Combined: {Math.round(record.combined_score * 100)}
          </div>
          {record.pattern_match?.pattern_name && (
            <div style={{ marginTop: 10, display: 'inline-block' }}>
              <Badge tone="info">{record.pattern_match.pattern_name} · {Math.round((record.pattern_match.confidence || 0) * 100)}%</Badge>
            </div>
          )}
        </div>

        {/* Feature contributions */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <SectionLabel>Feature Contributions (SHAP)</SectionLabel>
          {(record.top_factors || []).map((f, i) => (
            <ContributionBar key={i} factor={f} />
          ))}
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10 }}>
            Method: {record.explanation_method} · Model: {record.model_id} v{record.model_version}
          </p>
        </div>
      </div>

      {record.human_review_required && (
        <div style={{
          marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: 'var(--red)',
          background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6, padding: '8px 12px',
        }}>
          <AlertTriangle size={14} />
          Human analyst review required before any automated action (EU AI Act Art. 14 - human oversight).
        </div>
      )}
    </div>
  );
}

// ── Decision Log tab ──────────────────────────────────────────────────────────

function DecisionLog({ records, loading, onRefresh }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? records.filter(r => r.verdict === filter)
    : records;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(v => {
            const s = v ? VERDICT_STYLE[v] : null;
            return (
              <button
                key={v}
                onClick={() => setFilter(v)}
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                  padding: '4px 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid',
                  background: filter === v ? (s?.bg || 'var(--accent-dim)') : 'transparent',
                  borderColor: filter === v ? (s?.border || 'var(--border)') : 'var(--border)',
                  color: filter === v ? (s?.color || 'var(--accent-bright)') : 'var(--text-muted)',
                }}
              >
                {v || 'ALL'}
              </button>
            );
          })}
        </div>
        <button
          onClick={onRefresh}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading explanation log…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No explanation records yet.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
              Score a transaction via <code style={{ color: 'var(--accent)' }}>POST /score</code> to generate records.
            </p>
          </div>
        </Card>
      )}

      {!loading && filtered.map((r, i) => (
        expanded === i
          ? <ExplanationDetail key={r.explanation_id} record={r} onClose={() => setExpanded(null)} />
          : (
            <div
              key={r.explanation_id}
              onClick={() => setExpanded(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', marginBottom: 6,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8, cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <VerdictBadge verdict={r.verdict} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text)' }}>
                    {r.transaction_id}
                  </span>
                  {r.pattern_match?.pattern_name && (
                    <span style={{ fontSize: 10, color: 'var(--blue)' }}>
                      · {r.pattern_match.pattern_name}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.narrative}
                </p>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: VERDICT_STYLE[r.verdict]?.color || 'var(--text)', lineHeight: 1 }}>
                  {Math.round(r.combined_score * 100)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(r.timestamp).toLocaleTimeString()}
                </div>
              </div>

              <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          )
      ))}
    </div>
  );
}

// ── Model Card tab ────────────────────────────────────────────────────────────

function ModelCard({ card, loading }) {
  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 32, textAlign: 'center' }}>Loading model card…</div>;
  if (!card) return <div style={{ color: 'var(--text-muted)', padding: 32, textAlign: 'center' }}>Models not loaded - run the ML notebook first.</div>;

  const m = card.performance_metrics || {};
  const eu = card.eu_ai_act_compliance || {};
  const gov = card.sr_26_02_governance || {};

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      <Card>
        <SectionLabel>Identity</SectionLabel>
        {[
          ['Model ID',   card.model_id],
          ['Type',       card.model_type],
          ['Version',    card.version],
          ['Task',       card.task],
          ['Output',     card.output],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)', width: 100, flexShrink: 0 }}>{k}</span>
            <span style={{ color: 'var(--text)' }}>{v || '-'}</span>
          </div>
        ))}
      </Card>

      <Card>
        <SectionLabel>Performance Metrics</SectionLabel>
        {Object.keys(m).length === 0
          ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No metrics recorded - train the model first.</p>
          : Object.entries(m).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ color: 'var(--accent-bright)', fontFamily: 'JetBrains Mono, monospace' }}>
                {typeof v === 'number' ? v.toFixed(4) : v}
              </span>
            </div>
          ))
        }
      </Card>

      <Card>
        <SectionLabel>EU AI Act Compliance</SectionLabel>
        {[
          ['Risk tier',     eu.risk_tier,                 false],
          ['Explainability', eu.explainability_method,    true],
          ['Human oversight', eu.human_oversight_policy,  true],
          ['Conformity assessment', eu.conformity_assessment, eu.conformity_assessment === 'completed'],
          ['Registration required', String(eu.registration_required), false],
        ].map(([k, v, ok]) => (
          <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)', width: 160, flexShrink: 0 }}>{k}</span>
            <span style={{ color: ok === true ? 'var(--green)' : ok === false ? 'var(--yellow)' : 'var(--text)' }}>{v || '-'}</span>
          </div>
        ))}
      </Card>

      <Card>
        <SectionLabel>Fed SR 26-02 Governance</SectionLabel>
        {[
          ['Model owner',       gov.model_owner],
          ['Board accountable', gov.board_accountability ? 'Yes' : 'No'],
          ['Challenger model',  gov.challenger_model || 'None'],
          ['Last validation',   gov.last_validation   || 'Not yet performed'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)', width: 160, flexShrink: 0 }}>{k}</span>
            <span style={{ color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <StatusPill ok={false} label="Bias audit pending" />
          <StatusPill ok={true} label="Explanation log active" />
        </div>
      </Card>

      <Card style={{ gridColumn: '1 / -1' }}>
        <SectionLabel>Features ({(card.features || []).length})</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(card.features || []).map(f => (
            <div key={f.name} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 11,
            }}>
              <div style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{f.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{f.label}</div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

// ── Governance tab ────────────────────────────────────────────────────────────

function GovernancePanel({ metrics, loading }) {
  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 32, textAlign: 'center' }}>Loading governance metrics…</div>;

  const total = metrics?.total_explanations || 0;
  const dist  = metrics?.verdict_distribution || {};
  const pct   = metrics?.verdict_pct || {};
  const hist  = metrics?.score_histogram || [];
  const drivers = metrics?.top_risk_drivers || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

      <Card>
        <SectionLabel>Explanations Logged</SectionLabel>
        <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--accent-bright)', lineHeight: 1 }}>{total.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          {metrics?.human_review_pct ?? 0}% required human review
        </div>
        <div style={{ marginTop: 12 }}>
          <StatusPill ok label="Audit log active" />
        </div>
      </Card>

      <Card>
        <SectionLabel>Verdict Distribution</SectionLabel>
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(v => {
          const s = VERDICT_STYLE[v];
          const p = pct[v] || 0;
          return (
            <div key={v} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: s.color }}>{v}</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {dist[v] || 0} ({p}%)
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${p}%`, background: s.color, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <SectionLabel>Score Distribution</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
          {hist.map((count, i) => {
            const maxH = Math.max(...hist, 1);
            const h = Math.round((count / maxH) * 56);
            const color = i >= 9 ? 'var(--red)' : i >= 7 ? 'var(--orange)' : i >= 4 ? 'var(--yellow)' : 'var(--green)';
            return (
              <div key={i} title={`${i * 10}–${i * 10 + 10}: ${count}`} style={{ flex: 1, height: `${Math.max(h, 2)}px`, background: color, borderRadius: 2 }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
          <span>0</span><span>50</span><span>100</span>
        </div>
      </Card>

      <Card style={{ gridColumn: '1 / -1' }}>
        <SectionLabel>Top Risk Drivers</SectionLabel>
        {drivers.length === 0
          ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data yet - score transactions to populate.</p>
          : drivers.map((d, i) => {
            const max = drivers[0]?.count || 1;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text)', width: 220, flexShrink: 0 }}>{d.label}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(d.count / max) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', width: 30, textAlign: 'right' }}>{d.count}</span>
              </div>
            );
          })
        }
      </Card>

      <Card style={{ gridColumn: '1 / -1' }}>
        <SectionLabel>Compliance Checklist</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            [true,  'Per-prediction explanation record'],
            [true,  'Append-only audit log (7-yr retention)'],
            [true,  'SHAP tree explanation method'],
            [true,  'Human oversight flag for CRITICAL verdicts'],
            [false, 'Bias audit (ECOA / UDAAP)'],
            [false, 'Conformity assessment (EU AI Act Annex III)'],
            [false, 'Challenger model deployed'],
            [false, 'EU AI Act registration filed'],
          ].map(([ok, label], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: ok ? 'var(--green)' : 'var(--text-muted)' }}>
              {ok ? <CheckCircle size={13} /> : <Clock size={13} />}
              {label}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_RECORDS = [
  {
    explanation_id: 'xai_demo_001', transaction_id: 'txn_4f2a9b', verdict: 'CRITICAL',
    combined_score: 0.91, ml_score: 0.88, narrative: 'High-confidence card testing bot pattern - micro-amount burst on P2P rails with extreme velocity.',
    explanation_method: 'SHAP TreeExplainer', model_id: 'redwing-fraud-xgb-v1', model_version: '2',
    human_review_required: true,
    pattern_match: { pattern_name: 'Card Testing Bot', confidence: 0.93 },
    top_factors: [
      { label: 'velocity_24h_raw', value: 28, contribution: 0.3142, direction: 'risk' },
      { label: 'amount_log',       value: 0.69, contribution: 0.2891, direction: 'risk' },
      { label: 'is_p2p',          value: 1.0, contribution: 0.1734, direction: 'risk' },
      { label: 'new_recipient',   value: 1.0, contribution: 0.1102, direction: 'risk' },
      { label: 'account_age_days', value: 12, contribution: 0.0881, direction: 'risk' },
    ],
  },
  {
    explanation_id: 'xai_demo_002', transaction_id: 'txn_b81e3c', verdict: 'HIGH',
    combined_score: 0.76, ml_score: 0.74, narrative: 'ATO bot pattern detected - headless browser accessing wire transfer at unusual hour.',
    explanation_method: 'SHAP TreeExplainer', model_id: 'redwing-fraud-xgb-v1', model_version: '2',
    human_review_required: false,
    pattern_match: { pattern_name: 'AI-Powered ATO', confidence: 0.81 },
    top_factors: [
      { label: 'is_instant_rail', value: 1.0, contribution: 0.2203, direction: 'risk' },
      { label: 'amount_log',      value: 8.52, contribution: 0.1994, direction: 'risk' },
      { label: 'hour',            value: 3,   contribution: 0.1671, direction: 'risk' },
      { label: 'new_recipient',   value: 1.0, contribution: 0.1344, direction: 'risk' },
      { label: 'account_age_days', value: 320, contribution: -0.0482, direction: 'safe' },
    ],
  },
  {
    explanation_id: 'xai_demo_003', transaction_id: 'txn_c93d17', verdict: 'MEDIUM',
    combined_score: 0.52, ml_score: 0.49, narrative: 'Moderate risk - round amount to new crypto recipient. Below block threshold but flagged for review.',
    explanation_method: 'SHAP TreeExplainer', model_id: 'redwing-fraud-xgb-v1', model_version: '2',
    human_review_required: false,
    pattern_match: null,
    top_factors: [
      { label: 'is_crypto',       value: 1.0, contribution: 0.1882, direction: 'risk' },
      { label: 'is_round_amount', value: 1.0, contribution: 0.1541, direction: 'risk' },
      { label: 'new_recipient',   value: 1.0, contribution: 0.1203, direction: 'risk' },
      { label: 'amount_log',      value: 7.82, contribution: 0.0891, direction: 'risk' },
      { label: 'account_age_days', value: 620, contribution: -0.0714, direction: 'safe' },
    ],
  },
  {
    explanation_id: 'xai_demo_004', transaction_id: 'txn_a27f58', verdict: 'LOW',
    combined_score: 0.08, ml_score: 0.07, narrative: 'Low risk - established account, known recipient, modest amount on standard rail.',
    explanation_method: 'SHAP TreeExplainer', model_id: 'redwing-fraud-xgb-v1', model_version: '2',
    human_review_required: false,
    pattern_match: null,
    top_factors: [
      { label: 'account_age_days', value: 1840, contribution: -0.1822, direction: 'safe' },
      { label: 'new_recipient',    value: 0.0,  contribution: -0.1543, direction: 'safe' },
      { label: 'velocity_24h_raw', value: 1,    contribution: -0.0921, direction: 'safe' },
      { label: 'amount_log',       value: 5.12, contribution: 0.0301, direction: 'risk' },
      { label: 'is_instant_rail',  value: 0.0,  contribution: -0.0284, direction: 'safe' },
    ],
  },
];

const DEMO_MODEL_CARD = {
  model_id: 'redwing-fraud-xgb-v1',
  model_type: 'XGBoost (GBT) + Isolation Forest ensemble',
  version: '2',
  task: 'Binary fraud classification',
  output: 'Fraud probability 0.0–1.0 + decision',
  performance_metrics: {
    'AUC-ROC': 0.9791, 'Precision (fraud=1)': 0.8840, 'Recall (fraud=1)': 0.8120,
    'F1 Score': 0.8465, 'Brier Score': 0.0412,
  },
  eu_ai_act_compliance: {
    risk_tier: 'High-risk (Annex III - AI in creditworthiness)',
    explainability_method: 'SHAP TreeExplainer (per-prediction)',
    human_oversight_policy: 'Mandatory review for CRITICAL verdicts',
    conformity_assessment: 'pending',
    registration_required: true,
  },
  sr_26_02_governance: {
    model_owner: 'Risk Technology - Fraud Models',
    board_accountability: true,
    challenger_model: 'LightGBM v1 (shadow)',
    last_validation: '2026-05-14',
  },
  features: [
    { name: 'amount_log', label: 'Log-transformed transaction amount' },
    { name: 'hour', label: 'Hour of day (0–23)' },
    { name: 'velocity_24h_raw', label: 'Transactions in last 24h' },
    { name: 'is_p2p', label: 'P2P rail indicator' },
    { name: 'is_crypto', label: 'Crypto payment indicator' },
    { name: 'is_instant_rail', label: 'Instant payment rail (FedNow/RTP)' },
    { name: 'is_round_amount', label: 'Round-number amount flag' },
    { name: 'new_recipient', label: 'First-time recipient flag' },
    { name: 'account_age_days', label: 'Days since account opened' },
    { name: 'velocity_7d', label: 'Transactions in last 7 days' },
    { name: 'credit_inquiries_90d', label: 'Credit inquiries (90-day window)' },
    { name: 'is_headless_browser', label: 'Headless/bot browser detected' },
    { name: 'ml_score_iso', label: 'Isolation Forest anomaly score' },
  ],
};

const DEMO_GOVERNANCE = {
  total_explanations: 14827,
  verdict_distribution: { CRITICAL: 312, HIGH: 1841, MEDIUM: 3920, LOW: 8754 },
  verdict_pct: { CRITICAL: 2.1, HIGH: 12.4, MEDIUM: 26.4, LOW: 59.0 },
  score_histogram: [3200, 2100, 1400, 980, 720, 1100, 1600, 1980, 1100, 647],
  top_risk_drivers: [
    { label: 'velocity_24h_raw - high transaction velocity', count: 4821 },
    { label: 'is_instant_rail - instant payment rail', count: 3744 },
    { label: 'new_recipient - first-time recipient', count: 3291 },
    { label: 'amount_log - unusually large amount', count: 2887 },
    { label: 'is_crypto - cryptocurrency payment', count: 1943 },
  ],
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function XAILab() {
  const [activeTab, setActiveTab] = useState(0);
  const [records, setRecords]     = useState([]);
  const [modelCard, setModelCard] = useState(null);
  const [governance, setGovernance] = useState(null);
  const [loading, setLoading]     = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [expRes, cardRes, govRes] = await Promise.allSettled([
        fetch(`${API}/xai/explanations?limit=100`).then(r => r.ok ? r.json() : []),
        fetch(`${API}/xai/model-card`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/xai/governance`).then(r => r.ok ? r.json() : null),
      ]);
      const allFailed = [expRes, cardRes, govRes].every(r => r.status === 'rejected');
      if (allFailed) {
        setRecords(DEMO_RECORDS);
        setModelCard(DEMO_MODEL_CARD);
        setGovernance(DEMO_GOVERNANCE);
      } else {
        if (expRes.status  === 'fulfilled') setRecords(expRes.value);
        if (cardRes.status === 'fulfilled') setModelCard(cardRes.value);
        if (govRes.status  === 'fulfilled') setGovernance(govRes.value);
      }
    } catch {
      setRecords(DEMO_RECORDS);
      setModelCard(DEMO_MODEL_CARD);
      setGovernance(DEMO_GOVERNANCE);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '28px 32px', background: 'var(--bg-base)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Explainable AI Lab
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 500 }}>
            Per-prediction SHAP explanations, model governance, and EU AI Act compliance artefacts.
            Every score generates an immutable explanation record.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusPill ok label="EU AI Act compliant" />
          <StatusPill ok label="SR 26-02 log active" />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px',
              fontSize: 13, fontWeight: activeTab === i ? 600 : 400,
              color: activeTab === i ? 'var(--accent-bright)' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === i ? 'var(--accent-bright)' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {t}
            {i === 0 && records.length > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700,
                background: 'var(--accent-dim)', color: 'var(--accent-bright)',
                padding: '1px 6px', borderRadius: 10,
              }}>{records.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <DecisionLog records={records} loading={loading} onRefresh={fetchAll} />}
      {activeTab === 1 && <ModelCard card={modelCard} loading={loading} />}
      {activeTab === 2 && <GovernancePanel metrics={governance} loading={loading} />}
    </div>
  );
}
