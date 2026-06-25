import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, User, CreditCard, FileSearch, Network, Clock, Gavel,
  CheckCircle2, XCircle, AlertTriangle, MinusCircle, Search, RefreshCw, FileText,
  Sparkles, Quote,
} from 'lucide-react';
import { fetchCase, fetchAlertQueue } from '../api.js';
import { investigateStructuredCase } from '../fraudsense/api.js';

// ── Demo fallback (Vercel / operator-down) - a confirmed card-fraud case ──────
const FALLBACK = {
  case_id: 'CASE-014943', transaction_id: 'txn_014943', priority: 'P1',
  queue: 'Card Fraud', status: 'Open - under investigation',
  opened_at: new Date().toISOString(), sla_due_at: new Date(Date.now() + 4 * 3600e3).toISOString(),
  alert: {
    trigger_label: 'Card-testing pattern', model_score: 0.88, combined_score: 0.85,
    verdict: 'CRITICAL', fraud_typology: 'card_testing_bot',
    matched_signals: ['low_value_auth', 'velocity_spike'],
    top_features: [
      { feature: 'velocity_1h', contribution: 0.31 },
      { feature: 'amount_vs_max', contribution: 0.22 },
      { feature: 'recipient_familiarity', contribution: 0.18 },
    ],
    ground_truth_label: 'fraud',
  },
  customer: {
    name_masked: 'Customer ••••4943', risk_rating: 'High', kyc_status: 'Partial - review',
    cip_verified: false, id_type: 'Passport', nationality: 'NG', location: 'Lagos, NG',
    account_age_days: 41, tenure_band: 'New (<90d)', pep: false, sanctions_match: false,
    prior_cases: 1, prior_sars: 0, prior_disputes: 2, lifetime_value_band: 'Low',
    products: ['Credit Card', 'Wallet'],
    risk_drivers: ['Account < 90 days old', 'KYC not fully verified', 'Linked to flagged counterparties'],
    baseline: { avg_txn: 38.2, typical_max: 210.0, known_devices: 1, known_recipients: 3, home_geo: 'Lagos, NG' },
  },
  transaction: {
    amount: 0.31, currency: 'USD', rail: 'card', merchant_category: 'subscription',
    mcc_code: '7372', mcc_label: 'Computer / IT services', recipient_id: 'r_5521', is_new_recipient: true,
    timestamp: new Date().toISOString(),
  },
  instrument: {
    type: 'card', network: 'Visa', funding: 'credit', presence: 'Card-Not-Present',
    entry_mode: 'ecommerce', bin: '411203', last4: '8841', avs_result: 'No Match (N)',
    cvv_result: 'Not Provided (P)', three_ds_result: 'Not Enrolled', pos_country: 'RU', cross_border: true,
  },
  card_fraud_signals: [
    { code: 'card_testing', label: 'Card-testing / BIN-attack pattern', severity: 'high',
      detail: 'Low-value auth ($0.31) with elevated 1h velocity - automated card validation against a stolen BIN range.' },
    { code: 'cnp_high_risk_mcc', label: 'CNP at high-risk merchant category', severity: 'high',
      detail: 'Card-not-present at a common cash-out MCC with no 3DS step-up to anchor the cardholder.' },
    { code: 'avs_cvv_mismatch', label: 'AVS / CVV verification failed', severity: 'medium',
      detail: 'AVS=No Match, CVV=Not Provided - billing details do not match the issuer record.' },
    { code: 'ring_link', label: 'Counterparty in flagged network', severity: 'high',
      detail: 'Recipient/device overlaps with accounts already tied to confirmed fraud.' },
  ],
  dispute: {
    active: true, history_count: 2, reason_code: '10.4', reason: 'Fraud - Card-Absent Environment (CNP)',
    first_party_fraud_risk: 0.14,
    evidence: {
      cardholder_device_match: false, ip_geo_match: false, avs_match: false, cvv_match: false,
      three_ds_authenticated: false, delivery_to_known_address: false, prior_merchant_relationship: false,
    },
    assessment: 'Evidence does NOT place the cardholder at the transaction (unknown device, geo mismatch, failed/absent verification). Consistent with genuine THIRD-PARTY fraud.',
    representment_recommendation: 'Accept liability - issue provisional credit; pursue issuer recovery.',
  },
  device_network: { device_id: 'd_x91', is_known_device: false, graph_risk_score: 0.62, linked_accounts: 4, ring_flag: true },
  timeline: [
    { ts: new Date(Date.now() - 1440 * 60e3).toISOString(), type: 'login', detail: 'Login from new device / unrecognised IP', level: 'warn' },
    { ts: new Date(Date.now() - 1435 * 60e3).toISOString(), type: 'profile_change', detail: 'Notification email/phone changed', level: 'warn' },
    { ts: new Date(Date.now() - 1430 * 60e3).toISOString(), type: 'device_add', detail: 'New device enrolled to the account', level: 'warn' },
    { ts: new Date(Date.now() - 60 * 60e3).toISOString(), type: 'velocity', detail: 'Multiple authorisation attempts in short window', level: 'warn' },
    { ts: new Date().toISOString(), type: 'transaction', detail: 'Flagged transaction - $0.31 at subscription', level: 'flag' },
  ],
  recommended_disposition: { action: 'confirm_fraud', confidence: 0.85,
    rationale: 'High model score (0.85) corroborated by 3 high-severity card-fraud signals. Confirm fraud, block the instrument, issue provisional credit.' },
  disposition_options: [
    { id: 'confirm_fraud', label: 'Confirm fraud', tone: 'danger' },
    { id: 'clear_false_positive', label: 'Clear (false positive)', tone: 'ok' },
    { id: 'deny_dispute_first_party', label: 'Deny dispute (1st-party)', tone: 'warn' },
    { id: 'escalate_stepup', label: 'Step-up / request info', tone: 'warn' },
    { id: 'block_instrument', label: 'Block card / account', tone: 'danger' },
    { id: 'place_hold', label: 'Place hold', tone: 'warn' },
  ],
  sar_eligible: false,
  sar_note: 'Not yet eligible - SAR follows a confirm-fraud disposition + threshold.',
  _enrichment_note: 'Card-entry, AVS/CVV/3DS, dispute evidence and CDD fields are derived deterministically and kept coherent with ground truth; in production they arrive from the connector hub.',
};

const SEV = { high: '#ef4444', medium: '#f59e0b', low: '#64748b' };
const TONE = { danger: '#ef4444', warn: '#f59e0b', ok: '#22c55e' };
const RATING = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };

// ── Small building blocks ─────────────────────────────────────────────────────
function Card({ icon: Icon, title, accent, children, right }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        {Icon && <Icon size={13} style={{ color: accent || 'var(--accent)' }} />}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>{title}</div>
        {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 11.5, color: color || 'var(--text)', fontWeight: 600, textAlign: 'right',
        fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

function Pill({ text, color }) {
  return (
    <span style={{ fontSize: 9.5, fontWeight: 700, color, background: `${color}1f`,
      border: `1px solid ${color}55`, padding: '2px 7px', borderRadius: 5, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

function EvidenceRow({ label, val }) {
  const pos = val === true, neg = val === false, na = val === null || val === undefined;
  const c = pos ? '#22c55e' : neg ? '#ef4444' : '#64748b';
  const Icon = pos ? CheckCircle2 : neg ? XCircle : MinusCircle;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0' }}>
      <Icon size={13} style={{ color: c, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 10.5, color: c, fontWeight: 600 }}>{na ? 'n/a' : pos ? 'match' : 'no match'}</span>
    </div>
  );
}

const EV_LABELS = {
  cardholder_device_match: 'Cardholder device match',
  ip_geo_match: 'IP / geolocation match',
  avs_match: 'AVS (billing address)',
  cvv_match: 'CVV',
  three_ds_authenticated: '3-D Secure authenticated',
  delivery_to_known_address: 'Delivery to known address',
  prior_merchant_relationship: 'Prior merchant relationship',
};

// Heuristic second opinion from the case file - used when no LLM key is set, so the
// panel still demonstrates "FraudSense reasons over the case" offline. Same shape
// as the LLM analysis so the renderer is identical.
function heuristicOpinion(c) {
  const score = Math.round((c.alert?.combined_score || 0) * 100);
  const severity = score >= 85 ? 'Critical' : score >= 65 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  const actMap = { confirm_fraud: 'Decline', block_instrument: 'Decline', deny_dispute_first_party: 'Decline',
    escalate_stepup: 'Escalate', place_hold: 'Monitor', clear_false_positive: 'Approve' };
  const action = actMap[c.recommended_disposition?.action] || 'Escalate';

  const logic = [];
  (c.card_fraud_signals || []).filter(s => s.severity === 'high' && s.code !== 'clean')
    .forEach(s => logic.push(`${s.label} - ${s.detail}`));
  const ins = c.instrument || {};
  if (/(No Match|Not Provided)/.test(`${ins.avs_result} ${ins.cvv_result}`))
    logic.push(`Verification failed: AVS=${ins.avs_result}, CVV=${ins.cvv_result}.`);
  if (c.dispute?.active)
    logic.push(`Dispute ${c.dispute.reason_code}: first-party risk ${Math.round((c.dispute.first_party_fraud_risk || 0) * 100)}% - ${c.dispute.assessment}`);
  if (c.device_network?.ring_flag)
    logic.push(`Counterparty/device linked to a flagged network (graph risk ${c.device_network.graph_risk_score}).`);
  if (!logic.length) logic.push('Signals align with the customer baseline; no corroborating fraud pattern.');

  return {
    risk_score: { score, severity },
    classification: { primary_type: (c.alert?.fraud_typology || 'unclear').replace(/_/g, ' '), confidence: severity === 'Low' ? 'Low' : 'High' },
    recommendation: {
      action,
      confidence: severity === 'Critical' ? 'High' : 'Medium',
      reasoning: `Independent read of the assembled case ${action === 'Approve' ? 'finds no corroborating fraud evidence' : 'corroborates the alert'}. ${logic.length} evidentiary item(s) cited below.`,
      decision_logic: logic.slice(0, 5),
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InvestigatorPanel() {
  const [c, setC] = useState(FALLBACK);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [queue, setQueue] = useState([]);
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [ai, setAi] = useState({ status: 'idle' }); // FraudSense second opinion

  const load = useCallback(async (txnId) => {
    if (!txnId) return;
    setLoading(true); setDecision(null); setNote(''); setAi({ status: 'idle' });
    try {
      const data = await fetchCase(txnId);
      setC(data); setLive(true);
    } catch {
      setC({ ...FALLBACK, transaction_id: txnId }); setLive(false);
    } finally { setLoading(false); }
  }, []);

  // Run FraudSense over the SAME assembled case the analyst sees. Falls back to a
  // heuristic read of the case when no LLM key is configured (demo mode).
  const runFraudSense = useCallback(async () => {
    setAi({ status: 'loading' });
    try {
      const result = await investigateStructuredCase(c);
      setAi({ status: 'done', source: 'llm', result });
    } catch (e) {
      setAi({ status: 'done', source: 'heuristic', result: heuristicOpinion(c), error: e?.message });
    }
  }, [c]);

  // On mount: try to pull a real queue + load the top case.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txn = params.get('txn');
    fetchAlertQueue(12)
      .then((alerts) => {
        const ids = alerts.map(a => ({ id: a.transaction_id, score: a.combined_score, typ: a.top_pattern }));
        setQueue(ids); setLive(true);
        load(txn || ids[0]?.id);
      })
      .catch(() => { setLive(false); if (txn) load(txn); });
  }, [load]);

  const recId = c.recommended_disposition?.action;
  const chosen = decision || null;
  const sarUnlocked = chosen === 'confirm_fraud';

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header / case bar ── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#f87171,#fb923c)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldAlert size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{c.case_id}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Investigator Workbench · {c.queue} · {c.status}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, marginLeft: 8 }}>
          <Pill text={c.priority} color={c.priority === 'P1' ? '#ef4444' : c.priority === 'P2' ? '#f59e0b' : '#64748b'} />
          <Pill text={c.alert?.verdict} color={SEV[c.alert?.verdict === 'CRITICAL' || c.alert?.verdict === 'HIGH' ? 'high' : c.alert?.verdict === 'MEDIUM' ? 'medium' : 'low']} />
          {c.alert?.fraud_typology && c.alert.fraud_typology !== 'none' && <Pill text={c.alert.fraud_typology} color="#818cf8" />}
        </div>

        {/* loader */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 8px' }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(query.trim())}
              placeholder="transaction_id…"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 11, width: 120, fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
          <button onClick={() => load(query.trim() || queue[0]?.id)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--accent-bright)', background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} /> Load
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--green)' : live === false ? 'var(--yellow)' : 'var(--text-muted)' }} />
            {live === null ? 'Connecting…' : live ? 'Live · /case' : 'Demo case'}
          </div>
        </div>
      </div>

      {/* queue chips */}
      {queue.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Queue</span>
          {queue.slice(0, 10).map(q => (
            <button key={q.id} onClick={() => load(q.id)}
              style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                color: c.transaction_id === q.id ? 'var(--accent-bright)' : 'var(--text-muted)',
                background: c.transaction_id === q.id ? 'var(--accent-dim)' : 'var(--bg-surface)',
                border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
              {q.id}
            </button>
          ))}
        </div>
      )}

      {/* ── Body grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

        {/* ===== LEFT (evidence) ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Alert summary */}
          <Card icon={ShieldAlert} title="Alert - why this case is here" accent="#f87171"
            right={<span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>combined {Number(c.alert?.combined_score).toFixed(3)}</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
              <Field label="Trigger" value={c.alert?.trigger_label || '-'} />
              <Field label="Model score" value={Number(c.alert?.model_score).toFixed(3)} mono />
              <Field label="Typology" value={c.alert?.fraud_typology || 'none'} />
              <Field label="Verdict" value={c.alert?.verdict} color={SEV[c.alert?.verdict === 'CRITICAL' || c.alert?.verdict === 'HIGH' ? 'high' : 'medium']} />
            </div>
            {c.alert?.top_features?.length > 0 && (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 9 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top model drivers</div>
                {c.alert.top_features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', width: 150, fontFamily: 'JetBrains Mono, monospace' }}>{f.feature}</span>
                    <div style={{ flex: 1, height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(Math.abs(Number(f.contribution)) * 200, 100)}%`, height: '100%', background: '#818cf8' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Transaction + instrument */}
          <Card icon={CreditCard} title="Transaction & payment instrument" accent="#38bdf8">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
              <Field label="Amount" value={`$${Number(c.transaction?.amount).toLocaleString()}`} mono />
              <Field label="Rail" value={c.transaction?.rail} />
              <Field label="Merchant cat." value={c.transaction?.merchant_category} />
              <Field label="MCC" value={`${c.transaction?.mcc_code} · ${c.transaction?.mcc_label}`} />
              {c.instrument?.type === 'card' ? (
                <>
                  <Field label="Network / funding" value={`${c.instrument.network} ${c.instrument.funding}`} />
                  <Field label="Card" value={`${c.instrument.bin}••${c.instrument.last4}`} mono />
                  <Field label="Presence" value={c.instrument.presence} color={c.instrument.presence === 'Card-Not-Present' ? SEV.medium : 'var(--text)'} />
                  <Field label="Entry mode" value={c.instrument.entry_mode} />
                  <Field label="AVS" value={c.instrument.avs_result} color={/No Match/.test(c.instrument.avs_result) ? SEV.high : SEV.low} />
                  <Field label="CVV" value={c.instrument.cvv_result} color={/(No Match|Not Provided)/.test(c.instrument.cvv_result) ? SEV.high : SEV.low} />
                  <Field label="3-D Secure" value={c.instrument.three_ds_result} color={/(Failed|Not Enrolled|Attempted)/.test(c.instrument.three_ds_result) ? SEV.medium : SEV.low} />
                  <Field label="Cross-border" value={c.instrument.cross_border ? `Yes · POS ${c.instrument.pos_country}` : 'No'} color={c.instrument.cross_border ? SEV.medium : 'var(--text)'} />
                </>
              ) : (
                <Field label="Instrument" value={`${c.instrument?.rail} (non-card)`} />
              )}
            </div>
          </Card>

          {/* Card-fraud signals */}
          <Card icon={AlertTriangle} title='Card-usage fraud signals - "does this ring a bell?"' accent="#fb923c">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.card_fraud_signals?.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, borderLeft: `2px solid ${SEV[s.severity]}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
                      <Pill text={s.severity} color={SEV[s.severity]} />
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Dispute evidence study */}
          <Card icon={FileSearch} title="Dispute / chargeback evidence study" accent="#a78bfa"
            right={c.dispute?.active ? <Pill text={`reason ${c.dispute.reason_code}`} color="#a78bfa" /> : null}>
            {!c.dispute?.active ? (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>No active dispute. {c.dispute?.history_count ?? 0} prior dispute(s) on file.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence matrix</div>
                  {Object.entries(EV_LABELS).map(([k, label]) => (
                    <EvidenceRow key={k} label={label} val={c.dispute.evidence?.[k]} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>First-party (friendly) fraud risk</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 7, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${(c.dispute.first_party_fraud_risk || 0) * 100}%`, height: '100%',
                          background: c.dispute.first_party_fraud_risk >= 0.6 ? SEV.high : c.dispute.first_party_fraud_risk <= 0.3 ? SEV.low : SEV.medium }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>{(c.dispute.first_party_fraud_risk * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text)', lineHeight: 1.55, background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: 7 }}>
                    {c.dispute.assessment}
                  </div>
                  <div style={{ fontSize: 10.5, color: SEV.medium, lineHeight: 1.5, fontWeight: 600 }}>
                    → {c.dispute.representment_recommendation}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card icon={Clock} title="Account activity timeline" accent="#22d3ee">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {c.timeline?.map((e, i) => {
                const lc = e.level === 'flag' ? '#ef4444' : e.level === 'warn' ? '#f59e0b' : '#22c55e';
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < c.timeline.length - 1 ? 10 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: lc, flexShrink: 0, marginTop: 3 }} />
                      {i < c.timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 2 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text)' }}>{e.detail}</div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(e.ts).toLocaleString()} · {e.type}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ===== RIGHT (rail: customer + decision) ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0 }}>

          {/* Customer 360 / CDD */}
          <Card icon={User} title="Customer 360 · due diligence" accent="#34d399"
            right={<Pill text={`${c.customer?.risk_rating} risk`} color={RATING[c.customer?.risk_rating] || '#64748b'} />}>
            <Field label="Subject" value={c.customer?.name_masked} mono />
            <Field label="KYC" value={c.customer?.kyc_status} color={c.customer?.cip_verified ? 'var(--text)' : SEV.medium} />
            <Field label="ID / nationality" value={`${c.customer?.id_type} · ${c.customer?.nationality}`} />
            <Field label="Location" value={c.customer?.location} />
            <Field label="Tenure" value={`${c.customer?.tenure_band}`} />
            <Field label="PEP / sanctions" value={`${c.customer?.pep ? 'PEP' : 'no'} / ${c.customer?.sanctions_match ? 'MATCH' : 'clear'}`} color={c.customer?.pep || c.customer?.sanctions_match ? SEV.high : 'var(--text)'} />
            <Field label="Products" value={(c.customer?.products || []).join(', ')} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <Field label="Prior cases" value={c.customer?.prior_cases} mono />
              <Field label="SARs" value={c.customer?.prior_sars} mono />
              <Field label="Disputes" value={c.customer?.prior_disputes} mono />
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk drivers</div>
              {c.customer?.risk_drivers?.map((d, i) => (
                <div key={i} style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: RATING[c.customer?.risk_rating] || '#64748b' }}>•</span>{d}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Behavioural baseline</div>
              <Field label="Avg / max txn" value={`$${c.customer?.baseline?.avg_txn} / $${c.customer?.baseline?.typical_max}`} mono />
              <Field label="Known devices / payees" value={`${c.customer?.baseline?.known_devices} / ${c.customer?.baseline?.known_recipients}`} mono />
            </div>
          </Card>

          {/* Device & network */}
          <Card icon={Network} title="Device & network" accent="#60a5fa">
            <Field label="Device" value={c.device_network?.device_id} mono />
            <Field label="Known device" value={c.device_network?.is_known_device ? 'yes' : 'no'} color={c.device_network?.is_known_device ? 'var(--text)' : SEV.medium} />
            <Field label="Graph risk" value={Number(c.device_network?.graph_risk_score).toFixed(3)} mono color={c.device_network?.ring_flag ? SEV.high : 'var(--text)'} />
            <Field label="Linked accounts" value={c.device_network?.linked_accounts} mono />
            <Field label="Ring flag" value={c.device_network?.ring_flag ? 'FLAGGED' : 'clear'} color={c.device_network?.ring_flag ? SEV.high : 'var(--text)'} />
          </Card>

          {/* AI second opinion - FraudSense over the full case file */}
          <Card icon={Sparkles} title="AI second opinion · FraudSense" accent="#c084fc"
            right={ai.status === 'done' ? <Pill text={ai.source === 'llm' ? 'Claude' : 'heuristic'} color={ai.source === 'llm' ? '#c084fc' : '#64748b'} /> : null}>
            {ai.status === 'idle' && (
              <>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 9 }}>
                  Runs FraudSense over <b style={{ color: 'var(--text)' }}>this exact case file</b> - customer, card, dispute evidence, graph, timeline - and gives an independent verdict that cites the evidence.
                </div>
                <button onClick={runFraudSense}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    color: '#c084fc', background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Sparkles size={12} /> Run FraudSense on this case
                </button>
              </>
            )}
            {ai.status === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <RefreshCw size={13} style={{ color: '#c084fc', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>FraudSense reading the case file…</span>
              </div>
            )}
            {ai.status === 'done' && ai.result && (() => {
              const r = ai.result;
              const act = r.recommendation?.action;
              const actColor = act === 'Decline' ? SEV.high : act === 'Escalate' ? SEV.medium : act === 'Monitor' ? '#38bdf8' : '#22c55e';
              const agree = (act === 'Decline' && recId === 'confirm_fraud') ||
                (act === 'Approve' && recId === 'clear_false_positive') ||
                (act === 'Escalate' && recId === 'escalate_stepup');
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: actColor }}>{act}</span>
                    <Pill text={`risk ${r.risk_score?.score}`} color={actColor} />
                    <Pill text={r.classification?.primary_type} color="#818cf8" />
                    <span style={{ marginLeft: 'auto' }}>
                      <Pill text={agree ? 'agrees w/ system ✓' : 'differs from system'} color={agree ? '#22c55e' : '#f59e0b'} />
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text)', lineHeight: 1.55 }}>{r.recommendation?.reasoning}</div>
                  {r.recommendation?.decision_logic?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Evidence cited</div>
                      {r.recommendation.decision_logic.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                          <Quote size={11} style={{ color: '#c084fc', flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ai.source === 'heuristic' && (
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', opacity: 0.8, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                      Heuristic preview (offline). Set <code>VITE_ANTHROPIC_API_KEY</code> for the live FraudSense LLM reasoning over this case.
                    </div>
                  )}
                  <button onClick={runFraudSense}
                    style={{ alignSelf: 'flex-start', fontSize: 10, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                    ↻ Re-run
                  </button>
                </div>
              );
            })()}
          </Card>

          {/* Decision */}
          <Card icon={Gavel} title="Disposition" accent="#f472b6">
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>Recommended</div>
            <div style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5, background: 'var(--accent-dim)', borderRadius: 7, padding: '8px 10px', marginBottom: 10 }}>
              <b style={{ color: 'var(--accent-bright)' }}>{(c.disposition_options?.find(o => o.id === recId)?.label) || recId}</b>
              {' '}· {Math.round((c.recommended_disposition?.confidence || 0) * 100)}% conf
              <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{c.recommended_disposition?.rationale}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {c.disposition_options?.map(o => (
                <button key={o.id} onClick={() => setDecision(o.id)}
                  style={{ fontSize: 10.5, fontWeight: 600, padding: '7px 8px', borderRadius: 7, cursor: 'pointer',
                    textAlign: 'left', color: chosen === o.id ? '#fff' : TONE[o.tone],
                    background: chosen === o.id ? TONE[o.tone] : `${TONE[o.tone]}14`,
                    border: `1px solid ${TONE[o.tone]}${chosen === o.id ? '' : '44'}`,
                    boxShadow: o.id === recId && chosen !== o.id ? `0 0 0 1px ${TONE[o.tone]}66` : 'none' }}>
                  {o.label}{o.id === recId ? ' ★' : ''}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Investigator notes (audited)…"
              style={{ width: '100%', marginTop: 10, minHeight: 48, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', color: 'var(--text)', fontSize: 11, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />

            {/* SAR gate - only after confirm fraud */}
            <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 8,
              background: sarUnlocked ? 'rgba(34,197,94,0.08)' : 'var(--bg-elevated)',
              border: `1px solid ${sarUnlocked ? 'rgba(34,197,94,0.3)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={13} style={{ color: sarUnlocked ? '#22c55e' : 'var(--text-muted)' }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: sarUnlocked ? '#22c55e' : 'var(--text-muted)' }}>File SAR</span>
                <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--text-muted)' }}>final step</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
                {sarUnlocked
                  ? 'Fraud confirmed → SAR can now be drafted in the SAR Writer. Reporting is the last action, after the decision is made.'
                  : 'Locked. SAR is downstream of a confirm-fraud disposition + reporting threshold - not where investigation starts.'}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* honesty footnote */}
      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', opacity: 0.7, textAlign: 'center', lineHeight: 1.5 }}>
        {c._enrichment_note || 'Synthetic benchmark. Scores + graph context from the live model pipeline; enrichment fields derived deterministically.'}
      </div>
    </div>
  );
}
