import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radar, AlertTriangle, CheckCircle2, Play, Square,
  ChevronDown, ChevronRight, Zap, ExternalLink, RefreshCw,
} from 'lucide-react';
import { callOnce } from '../api.js';

const BACKEND = 'http://localhost:8000';
const AUTO_ESCALATE_THRESHOLD = 0.85; // combined_score to auto-investigate
const MAX_AUTO_INVESTIGATIONS = 8;    // cap per stream session

// ── Investigation system prompt ──────────────────────────────────────────────

const INVESTIGATION_SYSTEM = `You are FraudSense — an AI fraud investigator embedded in a real-time detection system.
You receive structured ML signals auto-escalated by the SyntheticID Operator.
Your job: rapid triage. Be direct, calibrated, and specific.

Output ONLY a single valid JSON object — no markdown, no preamble:
{
  "verdict": "Escalate" | "Decline" | "Monitor" | "Approve",
  "severity": "Critical" | "High" | "Medium" | "Low",
  "summary": "2-sentence investigation narrative grounded in the signals",
  "top_finding": "the single most critical fact from the signals",
  "recommended_action": "specific, concrete step to take RIGHT NOW",
  "fraud_type_confirmed": "confirmed fraud type name, or null",
  "confidence": "High" | "Medium" | "Low"
}

Rules:
- Do NOT invent signals not present in the input.
- If device_familiarity is HIGH and only amount is anomalous, consider APP scam or deepfake (victim-authorized) rather than ATO.
- "Decline" means block the transaction. "Escalate" means hold + human review. "Monitor" means flag for watch.
- Be precise about the recommended_action — name the team, channel, or system.`;

function buildCaseText(alert) {
  const signals = (alert.matched_signals || [])
    .map(s => `  • ${s.label} (strength: ${(s.strength * 100).toFixed(0)}%)`)
    .join('\n');

  return `AUTO-ESCALATED by SyntheticID Operator — score ${(alert.combined_score * 100).toFixed(0)}/100

TRANSACTION
  ID:     ${alert.transaction_id}
  Amount: $${alert.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  Rail:   ${alert.rail ?? 'unknown'}

DETECTION
  ML Score:        ${(alert.ml_score * 100).toFixed(0)}/100
  Combined Score:  ${(alert.combined_score * 100).toFixed(0)}/100
  Pattern Match:   ${alert.top_pattern ?? 'none'} — ${((alert.confidence ?? 0) * 100).toFixed(0)}% confidence

SIGNALS CONFIRMED
${signals || '  (none above threshold)'}

Triage this transaction.`;
}

// ── Demo mode data & generator ───────────────────────────────────────────────

const DEMO_TX_SCENARIOS = [
  { pattern: 'Card Testing Bot',        color: '#4ade80', rail: 'Zelle',  minAmt: 0.50, maxAmt: 1.99, mlBase: 0.86, signals: [{ label: 'micro_amount_sequence', strength: 0.91 }, { label: 'velocity_burst_24h', strength: 0.88 }] },
  { pattern: 'AI-Powered ATO',          color: '#f59e0b', rail: 'wire',   minAmt: 1200, maxAmt: 4500, mlBase: 0.79, signals: [{ label: 'headless_browser_flag',  strength: 0.84 }, { label: 'new_recipient',         strength: 0.77 }] },
  { pattern: 'Pig Butchering Scam',     color: '#fb923c', rail: 'crypto', minAmt: 3500, maxAmt: 18000,mlBase: 0.72, signals: [{ label: 'crypto_exchange_mule',   strength: 0.79 }, { label: 'social_engineering_flag', strength: 0.68 }] },
  { pattern: 'APP Scam',                color: '#38bdf8', rail: 'wire',   minAmt: 800,  maxAmt: 6000, mlBase: 0.68, signals: [{ label: 'authorized_push_pattern', strength: 0.73 }, { label: 'new_payee',             strength: 0.61 }] },
  { pattern: 'Synthetic Identity Farm', color: '#c084fc', rail: 'ACH',    minAmt: 200,  maxAmt: 1200, mlBase: 0.61, signals: [{ label: 'thin_file_mismatch',      strength: 0.69 }, { label: 'address_velocity',      strength: 0.55 }] },
  { pattern: null, color: '#64748b', rail: 'card', minAmt: 20, maxAmt: 380, mlBase: 0.08, signals: [] },
  { pattern: null, color: '#64748b', rail: 'ACH',  minAmt: 50, maxAmt: 900, mlBase: 0.11, signals: [] },
];
const DEMO_WEIGHTS_OP = [1.5, 1.5, 1, 1, 1, 4, 4];
let _demoCtrOp = 4000;

function genDemoTx() {
  const total = DEMO_WEIGHTS_OP.reduce((a, b) => a + b, 0);
  let r = Math.random() * total, idx = 0;
  for (let i = 0; i < DEMO_WEIGHTS_OP.length; i++) { r -= DEMO_WEIGHTS_OP[i]; if (r <= 0) { idx = i; break; } }
  const s = DEMO_TX_SCENARIOS[idx];
  const amt = +(s.minAmt + Math.random() * (s.maxAmt - s.minAmt)).toFixed(2);
  const ml = Math.max(0.01, Math.min(0.99, s.mlBase + (Math.random() - 0.5) * 0.12));
  const combined = +(ml * 0.7 + (s.signals.length > 0 ? 0.15 : 0)).toFixed(3);
  return {
    transaction_id: `TX${++_demoCtrOp}`,
    amount: amt, rail: s.rail,
    ml_score: +ml.toFixed(3), combined_score: combined,
    is_alert: combined >= 0.55,
    top_pattern: s.pattern, pattern_color: s.color, confidence: s.signals.length ? +(0.68 + Math.random() * 0.25).toFixed(2) : 0,
    matched_signals: s.signals,
  };
}

const DEMO_INVESTIGATIONS = {
  'TX4001': {
    status: 'done',
    alertData: { transaction_id: 'TX4001', amount: 0.97, rail: 'Zelle', ml_score: 0.88, combined_score: 0.89, is_alert: true, top_pattern: 'Card Testing Bot', pattern_color: '#4ade80', confidence: 0.92, matched_signals: [{ label: 'micro_amount_sequence', strength: 0.91 }, { label: 'velocity_burst_24h', strength: 0.88 }] },
    result: { verdict: 'Decline', severity: 'Critical', summary: 'Card testing bot confirmed — 28 micro-transactions under $1.00 on Zelle in a 3-hour window. Velocity and timing regularity are machine-driven.', top_finding: 'velocity_burst_24h = 28 transactions with timing regularity < 40ms variance', recommended_action: 'Block all outbound Zelle transactions from this account. Escalate to fraud ops for device ban and rule synthesis.', fraud_type_confirmed: 'Card Testing Bot', confidence: 'High' },
  },
  'TX4002': {
    status: 'done',
    alertData: { transaction_id: 'TX4002', amount: 3850.00, rail: 'wire', ml_score: 0.81, combined_score: 0.87, is_alert: true, top_pattern: 'AI-Powered ATO', pattern_color: '#f59e0b', confidence: 0.84, matched_signals: [{ label: 'headless_browser_flag', strength: 0.84 }, { label: 'new_recipient', strength: 0.77 }] },
    result: { verdict: 'Escalate', severity: 'High', summary: 'ATO bot pattern — headless browser session initiated wire to first-time overseas recipient. Behavioral biometrics absent. Consistent with automated credential replay.', top_finding: 'headless_browser_flag + new_recipient + wire to overseas account — ATO playbook match', recommended_action: 'Place account on step-up auth hold. Call customer to verify intent. Block wire pending confirmation.', fraud_type_confirmed: 'AI-Powered ATO', confidence: 'High' },
  },
};

// ── Inline pattern library (no backend required) ─────────────────────────────

const PATTERNS = [
  {
    id: 'pig_butchering', name: 'Pig Butchering', icon: '🐷',
    risk: 'Critical', color: '#ef4444', prevalence: '30%',
    description: 'Long grooming builds victim trust; large one-way exit via crypto or FedNow.',
    evasion: 'Gradual amount escalation; warms recipient slowly before strike.',
    signals: [
      { label: 'New/unknown recipient', weight: 0.30 },
      { label: 'Unusually large vs. user history', weight: 0.25 },
      { label: 'Irrevocable rail (FedNow/crypto)', weight: 0.20 },
      { label: 'Crypto payment', weight: 0.15 },
      { label: 'Amount statistical outlier', weight: 0.10 },
    ],
  },
  {
    id: 'app_scam', name: 'APP Scam', icon: '📲',
    risk: 'High', color: '#f97316', prevalence: '20%',
    description: 'Victim socially engineered into authorizing large push payment.',
    evasion: 'Victim authorizes — evades authorization checks.',
    signals: [
      { label: 'High amount vs. normal behavior', weight: 0.30 },
      { label: 'Instant/irrevocable rail', weight: 0.25 },
      { label: 'Unfamiliar recipient', weight: 0.25 },
      { label: 'P2P payment channel', weight: 0.10 },
      { label: 'Off-hours or unusual time', weight: 0.10 },
    ],
  },
  {
    id: 'account_takeover_ai', name: 'AI-Powered ATO', icon: '🤖',
    risk: 'Critical', color: '#c084fc', prevalence: '20%',
    description: 'AI-assisted takeover: new device + immediate high-value transfer.',
    evasion: 'Mimics victim behavior with LLM; waits hours before striking.',
    signals: [
      { label: 'Unrecognized/new device', weight: 0.35 },
      { label: 'Extreme amount outlier', weight: 0.25 },
      { label: 'High-risk irrevocable rail', weight: 0.20 },
      { label: 'Unknown destination', weight: 0.15 },
      { label: 'Unusual transaction hour', weight: 0.05 },
    ],
  },
  {
    id: 'deepfake_social_engineering', name: 'Deepfake Social Eng.', icon: '🎭',
    risk: 'Critical', color: '#38bdf8', prevalence: '15%',
    description: 'AI voice/video impersonates authority to authorize extreme transfer.',
    evasion: 'Known device + business hours bypasses time/device signals.',
    signals: [
      { label: 'Extremely large relative to history', weight: 0.35 },
      { label: 'Far outside normal distribution', weight: 0.25 },
      { label: 'High-risk rail selected', weight: 0.25 },
      { label: 'Destination not in known payees', weight: 0.15 },
    ],
  },
  {
    id: 'synthetic_id_ai', name: 'AI Synthetic Identity', icon: '🪪',
    risk: 'High', color: '#f59e0b', prevalence: '10%',
    description: 'AI-generated identity; gradual build then bust-out at max velocity.',
    evasion: 'Slow build mimics legit user; bust-out in a single session.',
    signals: [
      { label: 'Abnormally high velocity', weight: 0.30 },
      { label: 'All payees are new', weight: 0.25 },
      { label: 'Unknown device fingerprint', weight: 0.25 },
      { label: 'Near-limit bust-out amount', weight: 0.20 },
    ],
  },
  {
    id: 'card_testing_bot', name: 'Card Testing Bot', icon: '🃏',
    risk: 'Medium', color: '#22c55e', prevalence: '5%',
    description: 'Bot validates stolen cards with micro-transactions before full exploitation.',
    evasion: 'Distributed across merchants to evade per-merchant velocity blocks.',
    signals: [
      { label: 'Micro-transaction amount', weight: 0.35 },
      { label: 'Extremely high velocity', weight: 0.35 },
      { label: 'Bot-like / unknown device', weight: 0.20 },
      { label: 'Off-hours automated activity', weight: 0.10 },
    ],
  },
];

const RISK_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s) {
  if (s >= 0.85) return 'var(--red)';
  if (s >= 0.65) return '#f97316';
  if (s >= 0.40) return 'var(--yellow)';
  return 'var(--green)';
}

const VERDICT_COLORS = {
  Escalate: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#ef4444' },
  Decline:  { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', text: '#f97316' },
  Monitor:  { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
  Approve:  { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  text: '#22c55e' },
};

function ScoreBar({ value, color }) {
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
      <div style={{
        width: `${Math.min(value * 100, 100)}%`, height: '100%',
        background: color || scoreColor(value), borderRadius: 2, transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function RiskBadge({ risk, small }) {
  const colors = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#22c55e' };
  const c = colors[risk] || '#64748b';
  return (
    <span style={{
      fontSize: small ? 9 : 10, fontWeight: 700, color: c,
      background: `${c}18`, border: `1px solid ${c}40`,
      padding: small ? '1px 5px' : '2px 7px', borderRadius: 4,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{risk}</span>
  );
}

// ── Pattern Card ─────────────────────────────────────────────────────────────

function PatternCard({ pattern }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: 'var(--bg-surface)', border: `1px solid ${pattern.color}28`,
        borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = pattern.color + '60'}
      onMouseLeave={e => e.currentTarget.style.borderColor = pattern.color + '28'}
    >
      <div style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 16 }}>{pattern.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{pattern.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RiskBadge risk={pattern.risk} small />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{pattern.prevalence}</span>
            {open ? <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{pattern.description}</p>
      </div>
      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pattern.signals.map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{s.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: pattern.color, fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(s.weight * 100)}%</span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                  <div style={{ width: `${s.weight * 100 / 0.35 * 100}%`, height: '100%', background: pattern.color + '80', borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <span style={{ color: '#f97316', fontWeight: 600 }}>Evasion: </span>{pattern.evasion}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feed Row ─────────────────────────────────────────────────────────────────

function FeedRow({ event }) {
  const sc = event.combined_score || event.ml_score || 0;
  const color = scoreColor(sc);
  return (
    <div className="fade-in" style={{
      padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)',
      background: event.is_alert ? 'rgba(239,68,68,0.04)' : 'transparent',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {event.is_alert
        ? <AlertTriangle size={11} style={{ color: 'var(--red)', flexShrink: 0 }} />
        : <CheckCircle2 size={11} style={{ color: 'var(--green)', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{event.transaction_id}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            ${event.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}><ScoreBar value={sc} color={color} /></div>
          <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 26, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{(sc * 100).toFixed(0)}</span>
        </div>
        {event.top_pattern && (
          <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: event.pattern_color || '#64748b', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{event.top_pattern}</span>
            <span style={{ fontSize: 9, color: event.pattern_color || '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
              {event.confidence ? `${(event.confidence * 100).toFixed(0)}%` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Alert Row with Investigation ──────────────────────────────────────────────

function AlertRow({ event, investigation, onInvestigate }) {
  const sc = event.combined_score || 0;
  const vc = VERDICT_COLORS[investigation?.result?.verdict] || VERDICT_COLORS.Escalate;
  const autoTriggered = event.combined_score >= AUTO_ESCALATE_THRESHOLD;

  return (
    <div className="fade-in" style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: autoTriggered ? 'rgba(239,68,68,0.04)' : 'transparent',
    }}>
      {/* Alert header */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {autoTriggered && <span style={{ fontSize: 9, color: 'var(--red)' }}>⚠</span>}
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
              {event.transaction_id}
            </span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(sc), fontFamily: 'JetBrains Mono, monospace' }}>
            {(sc * 100).toFixed(0)}
          </span>
        </div>

        {event.top_pattern && (
          <div style={{ fontSize: 10, color: event.pattern_color || '#64748b', marginBottom: 4, fontWeight: 600 }}>
            {event.top_pattern}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            ${event.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          {event.rail && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {event.rail}</span>}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>ML {(event.ml_score * 100).toFixed(0)}</span>
        </div>

        {/* Matched signals */}
        {event.matched_signals?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
            {event.matched_signals.slice(0, 3).map((s, i) => (
              <span key={i} style={{
                fontSize: 9, padding: '1px 6px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 3, color: 'var(--text-muted)',
              }}>{s.label}</span>
            ))}
          </div>
        )}

        {/* Investigation trigger */}
        {!investigation && (
          <button
            onClick={() => onInvestigate(event)}
            style={{
              width: '100%', padding: '5px 10px', borderRadius: 6,
              background: autoTriggered ? 'rgba(239,68,68,0.1)' : 'var(--accent-dim)',
              border: `1px solid ${autoTriggered ? 'rgba(239,68,68,0.3)' : 'rgba(129,140,248,0.3)'}`,
              color: autoTriggered ? 'var(--red)' : 'var(--accent)',
              fontSize: 10, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <Zap size={10} />
            {autoTriggered ? 'Auto-investigating…' : 'Investigate with FraudSense'}
          </button>
        )}
      </div>

      {/* Investigation result */}
      {investigation?.status === 'loading' && (
        <div style={{
          margin: '0 12px 10px', padding: '10px 12px',
          background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.2)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <RefreshCw size={11} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>FraudSense investigating…</span>
        </div>
      )}

      {investigation?.status === 'done' && investigation.result && (() => {
        const r = investigation.result;
        return (
          <div style={{
            margin: '0 12px 10px', padding: '10px 12px',
            background: vc.bg, border: `1px solid ${vc.border}`, borderRadius: 8,
          }}>
            {/* Verdict + severity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: vc.text,
                background: vc.bg, border: `1px solid ${vc.border}`,
                padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {r.verdict}
              </span>
              <RiskBadge risk={r.severity} small />
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)' }}>{r.confidence} confidence</span>
            </div>

            {/* Summary */}
            <p style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{r.summary}</p>

            {/* Top finding */}
            <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 5, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Key Finding</div>
              <div style={{ fontSize: 11, color: vc.text, fontWeight: 500 }}>{r.top_finding}</div>
            </div>

            {/* Recommended action */}
            <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 5, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Action</div>
              <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{r.recommended_action}</div>
            </div>

            {/* Open in FraudSense */}
            <a
              href="http://localhost:5175"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 5,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 10, fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <ExternalLink size={10} /> Deep-dive in FraudSense
            </a>
          </div>
        );
      })()}

      {investigation?.status === 'error' && (
        <div style={{ margin: '0 12px 10px', padding: '8px 10px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, fontSize: 10, color: 'var(--red)' }}>
          Investigation failed: {investigation.error}
        </div>
      )}
    </div>
  );
}

// ── Main Operator Page ────────────────────────────────────────────────────────

export default function Operator() {
  const [backendOnline, setBackendOnline] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [feed, setFeed] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ processed: 0, alerts: 0 });
  const [investigations, setInvestigations] = useState({}); // txnId → { status, result, error }
  const [isDemoMode, setIsDemoMode] = useState(false);
  const esRef = useRef(null);
  const autoInvCountRef = useRef(0);
  const demoTimerRef = useRef(null);
  const demoStreamingRef = useRef(false);

  useEffect(() => {
    fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(2500) })
      .then(r => r.json())
      .then(d => setBackendOnline(d.status === 'ok' || d.status === 'degraded'))
      .catch(() => {
        setBackendOnline(false);
        setIsDemoMode(true);
      });
  }, []);

  // ── Demo mode streaming ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isDemoMode) return;
    // Seed initial events
    const initial = Array.from({ length: 12 }, genDemoTx);
    const initialAlerts = initial.filter(e => e.is_alert);
    setFeed(initial);
    setAlerts(initialAlerts.slice(0, 5));
    setStats({ processed: 12, alerts: initialAlerts.length });
    setInvestigations(DEMO_INVESTIGATIONS);
    setStreaming(true);
    demoStreamingRef.current = true;

    let processed = 12, alertCount = initialAlerts.length;
    function tick() {
      if (!demoStreamingRef.current) return;
      const event = genDemoTx();
      processed++;
      if (event.is_alert) alertCount++;
      setFeed(prev => [event, ...prev].slice(0, 60));
      if (event.is_alert) setAlerts(prev => [event, ...prev].slice(0, 25));
      setStats({ processed, alerts: alertCount });
      demoTimerRef.current = setTimeout(tick, 800 + Math.random() * 1200);
    }
    demoTimerRef.current = setTimeout(tick, 900);

    return () => {
      demoStreamingRef.current = false;
      clearTimeout(demoTimerRef.current);
    };
  }, [isDemoMode]);

  // ── Investigation trigger ──────────────────────────────────────────────────

  const triggerInvestigation = useCallback(async (alert) => {
    const id = alert.transaction_id;
    // Store alert data so we can render it even after it scrolls off the recent list
    setInvestigations(prev => ({ ...prev, [id]: { status: 'loading', alertData: alert } }));

    try {
      const raw = await callOnce({
        systemPrompt: INVESTIGATION_SYSTEM,
        userMessage: buildCaseText(alert),
      });

      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(cleaned);
      setInvestigations(prev => ({ ...prev, [id]: { status: 'done', result, alertData: alert } }));
    } catch (e) {
      setInvestigations(prev => ({ ...prev, [id]: { status: 'error', error: e.message, alertData: alert } }));
    }
  }, []);

  // ── SSE stream ────────────────────────────────────────────────────────────

  const startStream = useCallback(() => {
    if (streaming || !backendOnline) return;
    setFeed([]);
    setAlerts([]);
    setStats({ processed: 0, alerts: 0 });
    setInvestigations({});
    autoInvCountRef.current = 0;
    setStreaming(true);

    const es = new EventSource(`${BACKEND}/monitor/stream?speed=0.2&limit=300`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done || data.error) { es.close(); setStreaming(false); return; }

      setFeed(prev => [data, ...prev].slice(0, 60));

      if (data.is_alert) {
        setAlerts(prev => {
          const updated = [data, ...prev].slice(0, 25);
          return updated;
        });

        // Auto-investigate if above threshold and cap not reached
        if (
          data.combined_score >= AUTO_ESCALATE_THRESHOLD &&
          autoInvCountRef.current < MAX_AUTO_INVESTIGATIONS
        ) {
          autoInvCountRef.current += 1;
          triggerInvestigation(data);
        }
      }

      if (data.stats) setStats(data.stats);
    };

    es.onerror = () => { es.close(); setStreaming(false); };
  }, [streaming, backendOnline, triggerInvestigation]);

  const stopStream = useCallback(() => {
    esRef.current?.close();
    demoStreamingRef.current = false;
    clearTimeout(demoTimerRef.current);
    setStreaming(false);
  }, []);

  useEffect(() => () => esRef.current?.close(), []);

  const alertRate = stats.processed > 0
    ? ((stats.alerts / stats.processed) * 100).toFixed(1)
    : '0.0';

  const investigatedCount = Object.values(investigations).filter(i => i.status === 'done').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Stats bar */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {backendOnline === null
            ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)' }} />
            : backendOnline
              ? <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
              : <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)' }} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: backendOnline ? 'var(--green)' : backendOnline === false ? 'var(--red)' : 'var(--text-muted)' }}>
            {backendOnline === null ? 'Connecting…' : backendOnline ? 'Backend online' : 'Backend offline'}
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        <StatPill label="Processed" value={stats.processed.toLocaleString()} />
        <StatPill label="Alerts" value={stats.alerts.toLocaleString()} color="var(--red)" />
        <StatPill label="Alert rate" value={`${alertRate}%`} color={parseFloat(alertRate) > 8 ? 'var(--red)' : 'var(--green)'} />
        <StatPill label="Investigated" value={investigatedCount} color="var(--accent)" />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {!streaming ? (
            <button onClick={isDemoMode ? () => { demoStreamingRef.current = true; setStreaming(true); const tick = () => { if (!demoStreamingRef.current) return; const e = genDemoTx(); setFeed(prev => [e, ...prev].slice(0, 60)); if (e.is_alert) setAlerts(prev => [e, ...prev].slice(0, 25)); setStats(prev => ({ processed: prev.processed + 1, alerts: e.is_alert ? prev.alerts + 1 : prev.alerts })); demoTimerRef.current = setTimeout(tick, 800 + Math.random() * 1200); }; demoTimerRef.current = setTimeout(tick, 900); } : startStream} disabled={!backendOnline && !isDemoMode} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              background: (backendOnline || isDemoMode) ? 'var(--green)' : 'var(--bg-elevated)',
              border: 'none',
              color: (backendOnline || isDemoMode) ? '#fff' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600,
              cursor: (backendOnline || isDemoMode) ? 'pointer' : 'default',
            }}>
              <Play size={12} /> Start Monitoring
            </button>
          ) : (
            <button onClick={stopStream} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              <Square size={12} /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Body: 3 columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 300px', overflow: 'hidden' }}>

        {/* Pattern Library */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
            Pattern Library — {PATTERNS.length} fingerprints
          </div>
          {[...PATTERNS].sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]).map(p => (
            <PatternCard key={p.id} pattern={p} />
          ))}
        </div>

        {/* Live Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Radar size={12} style={{ color: streaming ? 'var(--green)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>Live Transaction Monitor</span>
            {streaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                <div className="pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontSize: 10, color: 'var(--green)' }}>streaming</span>
              </div>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{feed.length} events</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {feed.length === 0 ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                <Radar size={28} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: 12, textAlign: 'center' }}>
                  {backendOnline === false
                    ? <>Backend not running.<br /><code style={{ color: 'var(--accent)', fontSize: 11 }}>cd operator && python main.py</code></>
                    : 'Press Start Monitoring to begin.'}
                </div>
              </div>
            ) : (
              feed.map((e, i) => <FeedRow key={`${e.transaction_id}-${i}`} event={e} />)
            )}
          </div>
        </div>

        {/* Alert Queue with Investigations */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <AlertTriangle size={12} style={{ color: alerts.length > 0 ? 'var(--red)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>Alert Queue</span>
            {alerts.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--red)',
                background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
                padding: '1px 6px', borderRadius: 10,
              }}>{stats.alerts}</span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--accent)', fontWeight: 600 }}>
              {investigatedCount > 0 && `${investigatedCount} investigated`}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(() => {
              // Pinned: all investigations (sorted done→loading, then by score)
              const invList = Object.values(investigations)
                .sort((a, b) => {
                  if (a.status === 'done' && b.status !== 'done') return -1;
                  if (b.status === 'done' && a.status !== 'done') return 1;
                  return (b.alertData?.combined_score || 0) - (a.alertData?.combined_score || 0);
                });

              // Pending: recent alerts not yet in investigation map
              const investigatedIds = new Set(Object.keys(investigations));
              const pendingAlerts = alerts.filter(a => !investigatedIds.has(a.transaction_id));

              if (invList.length === 0 && pendingAlerts.length === 0) {
                return (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                    {streaming ? 'Watching for alerts…' : 'No alerts yet'}
                  </div>
                );
              }

              return (
                <>
                  {/* Investigated cases — always pinned at top */}
                  {invList.map(inv => (
                    <AlertRow
                      key={`inv-${inv.alertData?.transaction_id}`}
                      event={inv.alertData || {}}
                      investigation={inv}
                      onInvestigate={triggerInvestigation}
                    />
                  ))}

                  {/* Divider */}
                  {invList.length > 0 && pendingAlerts.length > 0 && (
                    <div style={{
                      padding: '5px 12px', fontSize: 9, fontWeight: 700,
                      color: 'var(--text-muted)', background: 'var(--bg-elevated)',
                      borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Pending · {pendingAlerts.length}
                    </div>
                  )}

                  {/* Pending alerts */}
                  {pendingAlerts.map((e, i) => (
                    <AlertRow
                      key={`pending-${e.transaction_id}-${i}`}
                      event={e}
                      investigation={undefined}
                      onInvestigate={triggerInvestigation}
                    />
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}
