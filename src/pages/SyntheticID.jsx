import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Shield, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, Zap, Brain } from 'lucide-react';

const BACKEND = 'http://localhost:8000';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';


const THREAT_META = {
  card_testing_bot:        { label: 'Card Testing Bot',      color: '#22c55e' },
  synthetic_identity_farm: { label: 'Synthetic ID Farm',     color: '#f59e0b' },
  ato_bot:                 { label: 'ATO Bot',               color: '#c084fc' },
  deepfake_bypass:         { label: 'Deepfake Bypass',       color: '#38bdf8' },
  adversarial_ml:          { label: 'Adversarial ML Attack', color: '#ef4444' },
  credential_stuffing:     { label: 'Credential Stuffing',   color: '#f97316' },
  clean:                   { label: 'Clean',                 color: '#22c55e' },
};

const THREAT_ORDER = ['card_testing_bot', 'ato_bot', 'credential_stuffing', 'synthetic_identity_farm', 'deepfake_bypass', 'adversarial_ml'];

const TOGGLE_DEFS = [
  { key: 'high_alert_mode',       label: 'High Alert Mode',       desc: 'Lower all thresholds by 0.10 across all threat types',        emoji: '🔴' },
  { key: 'zero_tolerance_bot',    label: 'Zero Tolerance Bot',    desc: 'Card testing bot block threshold drops to 0.30',              emoji: '🤖' },
  { key: 'self_learning',         label: 'Self-Learning',         desc: 'Auto-generate rules from novel attack clusters',              emoji: '🧠' },
  { key: 'human_review_required', label: 'Human Review Required', desc: 'All blocks go to Case Review queue before taking effect',     emoji: '📋' },
  { key: 'auto_deploy_rules',     label: 'Auto-Deploy Rules',     desc: 'Promote shadow rules automatically when precision ≥ 78%',     emoji: '🚀' },
];

function formatUptime(s) {
  if (!s && s !== 0) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtAmt(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Shared atoms ──────────────────────────────────────────────────────────────

function ThreatBadge({ threatType }) {
  const meta = THREAT_META[threatType] || { label: threatType, color: '#64748b' };
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: meta.color + '18', border: `1px solid ${meta.color}40`,
      color: meta.color, whiteSpace: 'nowrap', letterSpacing: '0.04em',
    }}>{meta.label}</span>
  );
}

function ActionChip({ action }) {
  const map = {
    block:  { bg: 'var(--red-dim)',    border: 'rgba(239,68,68,0.3)',  text: 'var(--red)',    label: 'BLOCKED' },
    flag:   { bg: 'var(--yellow-dim)', border: 'rgba(245,158,11,0.3)', text: 'var(--yellow)', label: 'FLAGGED' },
    allow:  { bg: 'var(--green-dim)',  border: 'rgba(34,197,94,0.3)',  text: 'var(--green)',  label: 'ALLOWED' },
    approve:{ bg: 'var(--green-dim)',  border: 'rgba(34,197,94,0.3)',  text: 'var(--green)',  label: 'APPROVED' },
    decline:{ bg: 'var(--red-dim)',    border: 'rgba(239,68,68,0.3)',  text: 'var(--red)',    label: 'DECLINED' },
  };
  const s = map[action] || map.allow;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
        <div style={{ width: `${Math.min(value * 100, 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function StatPill({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}

// ── Agent Status Bar ──────────────────────────────────────────────────────────

function AgentStatusBar({ status, onStart }) {
  const running = status?.running;
  return (
    <div style={{
      padding: '0 20px', height: 56, flexShrink: 0,
      borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className={running ? 'pulse-dot' : ''} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: running ? 'var(--green)' : 'var(--text-muted)',
          boxShadow: running ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
        }} />
        <Bot size={14} style={{ color: running ? 'var(--accent)' : 'var(--text-muted)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>SyntheticID Agent</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: running ? 'var(--green)' : 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {running ? 'ACTIVE' : 'IDLE'}
        </span>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

      <StatPill label="Blocked"  value={status?.blocked_count   ?? 0} color="var(--red)" />
      <StatPill label="Flagged"  value={status?.flagged_count   ?? 0} color="var(--yellow)" />
      <StatPill label="Allowed"  value={status?.allowed_count   ?? 0} color="var(--green)" />
      <StatPill label="Patterns" value={status?.patterns_learned ?? 0} color="var(--purple)" />
      <StatPill label="Uptime"   value={formatUptime(status?.uptime_seconds)} />

      {!running && (
        <button
          onClick={onStart}
          style={{
            marginLeft: 'auto', padding: '7px 18px', borderRadius: 7,
            background: 'var(--green)', border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >Start Agent</button>
      )}
    </div>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

function TabBar({ activeTab, setActiveTab, pendingCount }) {
  const tabs = [
    { id: 'live',     label: 'Live Feed' },
    { id: 'cases',    label: pendingCount > 0 ? `Case Review (${pendingCount})` : 'Case Review' },
    { id: 'settings', label: 'Agent Settings' },
  ];
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)' }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
          padding: '10px 20px', border: 'none', cursor: 'pointer',
          borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
          background: 'transparent',
          fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 400,
          color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
          letterSpacing: '0.02em', transition: 'all 0.15s',
          ...(tab.id === 'cases' && pendingCount > 0 ? { color: activeTab === tab.id ? 'var(--accent)' : 'var(--yellow)' } : {}),
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Tab 1: Live Feed ──────────────────────────────────────────────────────────

function EventRow({ event }) {
  if (event.type === 'human_override') {
    return (
      <div className="fade-in" style={{
        padding: '7px 14px', borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(129,140,248,0.04)', fontSize: 10, color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: 'var(--accent)' }}>↩</span>
        Analyst override on{' '}
        <code style={{ color: 'var(--text)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>{event.transaction_id}</code>
        {' '}→ {event.override_action}
        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}>{fmtTime(event.timestamp)}</span>
      </div>
    );
  }
  if (event.type === 'case_resolved') return null;
  if (event.type === 'pattern_learned') {
    return (
      <div className="fade-in" style={{
        padding: '7px 14px', borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(192,132,252,0.04)', fontSize: 10, color: 'var(--purple)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Brain size={11} /> Agent synthesized new detection rule from novel patterns
        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}>{fmtTime(event.timestamp)}</span>
      </div>
    );
  }

  const action = event.action || 'allow';
  const rowBg  = action === 'block' ? 'rgba(239,68,68,0.04)' : action === 'flag' ? 'rgba(245,158,11,0.03)' : 'transparent';

  return (
    <div className="fade-in" style={{
      padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)',
      background: rowBg, display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, minWidth: 90 }}>
        <ActionChip action={action} />
        <ThreatBadge threatType={event.threat_type} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
            {event.transaction_id}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {event.action_confidence ? `${(event.action_confidence * 100).toFixed(0)}%` : ''}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
          {fmtAmt(event.amount)}{event.rail ? ` · ${event.rail}` : ''}
        </div>
        {event.ai_signals?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 3 }}>
            {event.ai_signals.slice(0, 2).map(sig => (
              <span key={sig} style={{
                padding: '1px 5px', borderRadius: 3, fontSize: 9,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}>{sig.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5 }}>{event.reason}</div>
      </div>

      <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
        {fmtTime(event.timestamp)}
      </span>
    </div>
  );
}

function ThreatBreakdown({ counts }) {
  const maxCount = Math.max(...THREAT_ORDER.map(t => counts[t] || 0), 1);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Threats Detected
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {THREAT_ORDER.map(type => {
          const meta  = THREAT_META[type];
          const count = counts[type] || 0;
          return (
            <div key={type}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text)' }}>{meta.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{
                  width: `${(count / maxCount) * 100}%`, height: '100%',
                  background: meta.color, borderRadius: 2, transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LearnedPatterns({ rules }) {
  if (rules.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.6 }}>
        No patterns synthesized yet.<br />The agent will auto-generate rules as it detects novel attacks.
      </div>
    );
  }
  const STATUS_COLOR = { deployed: 'var(--green)', shadow: 'var(--yellow)', retired: 'var(--text-muted)' };
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rules.map(rule => (
        <div key={rule.id} style={{
          padding: '10px 12px', borderRadius: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{rule.name}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
              color: STATUS_COLOR[rule.status] || 'var(--text-muted)',
              background: (STATUS_COLOR[rule.status] || '#64748b') + '18',
              textTransform: 'uppercase',
            }}>{rule.status}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>{rule.reason}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Precision: <span style={{
                color: (rule.backtest?.precision || 0) >= 0.78 ? 'var(--green)' : 'var(--yellow)',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              }}>{rule.backtest?.precision ? `${(rule.backtest.precision * 100).toFixed(0)}%` : '—'}</span>
            </span>
            {rule.typology && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Typology: <span style={{ color: 'var(--accent)' }}>{rule.typology}</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IntelPanel({ threatCounts, learnedRules }) {
  const [intelTab, setIntelTab] = useState('threats');
  return (
    <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {['threats', 'patterns'].map(t => (
          <button key={t} onClick={() => setIntelTab(t)} style={{
            flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
            borderBottom: intelTab === t ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'transparent',
            fontSize: 10, fontWeight: intelTab === t ? 700 : 400,
            color: intelTab === t ? 'var(--accent)' : 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {t === 'threats' ? 'Threat Breakdown' : 'Learned Patterns'}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {intelTab === 'threats' ? <ThreatBreakdown counts={threatCounts} /> : <LearnedPatterns rules={learnedRules} />}
      </div>
    </div>
  );
}

function LiveFeedTab({ events, threatCounts, learnedRules }) {
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Feed — 60% */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
        <div style={{
          padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <Shield size={11} /> Live Decisions
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {events.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Waiting for agent events…
            </div>
          ) : (
            events.map((e, i) => <EventRow key={`${e.transaction_id || 'evt'}-${i}`} event={e} />)
          )}
        </div>
      </div>

      {/* Intel — 40% */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <IntelPanel threatCounts={threatCounts} learnedRules={learnedRules} />
      </div>
    </div>
  );
}

// ── Tab 2: Case Review ────────────────────────────────────────────────────────

function CaseCard({ caseItem, onResolve }) {
  const [note, setNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const isPending = caseItem.status === 'pending';

  async function handleResolve(action) {
    setResolving(true);
    await onResolve(caseItem.case_id, action, note);
    setResolving(false);
  }

  const scoreColor = caseItem.combined_score >= 0.80 ? 'var(--red)' : caseItem.combined_score >= 0.60 ? 'var(--yellow)' : 'var(--green)';

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', opacity: isPending ? 1 : 0.65,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ThreatBadge threatType={caseItem.threat_type} />
        <ActionChip action={isPending ? caseItem.agent_action : caseItem.analyst_action || caseItem.agent_action} />
        {!isPending && <span style={{ fontSize: 10, color: caseItem.status === 'approved' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
          {caseItem.status.toUpperCase()} by {caseItem.analyst_id}
        </span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {fmtTime(caseItem.created_at)}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Transaction info */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              {caseItem.transaction_id}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtAmt(caseItem.amount)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{caseItem.rail || 'unknown rail'}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ScoreBar label="ML Score"       value={caseItem.ml_score}       color="var(--accent)" />
            <ScoreBar label="Combined Score" value={caseItem.combined_score} color={scoreColor} />
            <ScoreBar label="AI Confidence"  value={caseItem.ai_confidence}  color="var(--purple)" />
          </div>
        </div>

        {/* AI signals */}
        {caseItem.ai_signals?.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {caseItem.ai_signals.map(s => (
              <span key={s} style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 3,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)',
              }}>{s.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}

        {/* Reason */}
        <div style={{
          padding: '8px 10px', borderRadius: 6, background: 'var(--bg-elevated)',
          fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
          borderLeft: '3px solid var(--border)',
        }}>
          {caseItem.reason}
        </div>

        {/* Analyst note (resolved) */}
        {!isPending && caseItem.analyst_note && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Note: {caseItem.analyst_note}
          </div>
        )}

        {/* Actions (pending only) */}
        {isPending && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note…"
              rows={1}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 6, resize: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 11, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleResolve('approve')}
              disabled={resolving}
              style={{
                padding: '7px 14px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.4)',
                background: 'var(--green-dim)', color: 'var(--green)',
                fontSize: 11, fontWeight: 700, cursor: resolving ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, opacity: resolving ? 0.6 : 1,
              }}
            >
              <CheckCircle size={12} /> Approve
            </button>
            <button
              onClick={() => handleResolve('decline')}
              disabled={resolving}
              style={{
                padding: '7px 14px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)',
                background: 'var(--red-dim)', color: 'var(--red)',
                fontSize: 11, fontWeight: 700, cursor: resolving ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, opacity: resolving ? 0.6 : 1,
              }}
            >
              <XCircle size={12} /> Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CaseReviewTab({ cases, onResolve }) {
  const pending   = cases.filter(c => c.status === 'pending');
  const resolved  = cases.filter(c => c.status !== 'pending');

  if (cases.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-muted)' }}>
        <AlertTriangle size={28} style={{ opacity: 0.4 }} />
        <div style={{ fontSize: 13, fontWeight: 500 }}>No cases pending review</div>
        <div style={{ fontSize: 11 }}>The agent is handling everything autonomously.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {pending.length > 0 && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Pending Review ({pending.length})
        </div>
      )}
      {pending.map(c => <CaseCard key={c.case_id} caseItem={c} onResolve={onResolve} />)}

      {resolved.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8, marginBottom: 4 }}>
            Resolved ({resolved.length})
          </div>
          {resolved.map(c => <CaseCard key={c.case_id} caseItem={c} onResolve={onResolve} />)}
        </>
      )}
    </div>
  );
}

// ── Tab 3: Agent Settings ─────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      width: 40, height: 22, borderRadius: 11, cursor: 'pointer', flexShrink: 0,
      background: enabled ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
      position: 'relative', transition: 'background 0.2s ease',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: enabled ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function ThresholdSlider({ label, value, onChange, color = 'var(--accent)' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color }}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min="0.01" max="0.99" step="0.01"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
      />
    </div>
  );
}

function ThreatAccordion({ threatKey, perThreat, onChange }) {
  const [open, setOpen] = useState(false);
  const meta = THREAT_META[threatKey] || { label: threatKey, color: '#64748b' };
  const cfg  = perThreat[threatKey] || { block: 0.65, flag: 0.45, enabled: true };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', background: 'var(--bg-surface)',
        }}
      >
        {open ? <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
        <Toggle
          enabled={cfg.enabled}
          onToggle={e => { e.stopPropagation(); onChange(threatKey, { ...cfg, enabled: !cfg.enabled }); }}
        />
      </div>
      {open && (
        <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ThresholdSlider label="Block threshold" value={cfg.block} color="var(--red)"    onChange={v => onChange(threatKey, { ...cfg, block: v })} />
          <ThresholdSlider label="Flag threshold"  value={cfg.flag}  color="var(--yellow)" onChange={v => onChange(threatKey, { ...cfg, flag:  v })} />
        </div>
      )}
    </div>
  );
}

function AgentSettingsTab({ config, setConfig, onSave, saving }) {
  if (!config) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading config…</div>;

  const speedLabels = { 0.10: '10/sec', 0.125: '8/sec', 0.25: '4/sec', 0.5: '2/sec', 1.0: '1/sec', 2.0: '0.5/sec' };
  const nearestLabel = Object.entries(speedLabels).reduce((best, [k, v]) => Math.abs(Number(k) - config.speed) < Math.abs(Number(best[0]) - config.speed) ? [k, v] : best, ['0.25', '4/sec']);

  function setGlobal(key, val) {
    setConfig(c => ({ ...c, [key]: val }));
  }
  function setToggle(key, val) {
    setConfig(c => ({ ...c, toggles: { ...c.toggles, [key]: val } }));
  }
  function setThreat(key, val) {
    setConfig(c => ({ ...c, per_threat: { ...c.per_threat, [key]: val } }));
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Global thresholds */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Global Thresholds
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <ThresholdSlider label="Block Threshold" value={config.block_threshold} color="var(--red)"    onChange={v => setGlobal('block_threshold', v)} />
          <ThresholdSlider label="Flag Threshold"  value={config.flag_threshold}  color="var(--yellow)" onChange={v => setGlobal('flag_threshold', v)} />
        </div>
      </div>

      {/* Agent speed */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Agent Speed
        </div>
        <div style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text)' }}>Decisions per second</span>
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--accent)' }}>{nearestLabel[1]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Slow</span>
            <input
              type="range" min="0.10" max="2.0" step="0.05"
              value={config.speed}
              onChange={e => setGlobal('speed', parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Fast</span>
          </div>
        </div>
      </div>

      {/* Per-threat controls */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Per-Threat Controls
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {THREAT_ORDER.map(key => (
            <ThreatAccordion key={key} threatKey={key} perThreat={config.per_threat || {}} onChange={setThreat} />
          ))}
        </div>
      </div>

      {/* Special toggles */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Special Settings
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {TOGGLE_DEFS.map((td, i) => (
            <div key={td.key} style={{
              padding: '14px 16px',
              borderBottom: i < TOGGLE_DEFS.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-surface)',
            }}>
              <span style={{ fontSize: 16 }}>{td.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{td.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{td.desc}</div>
              </div>
              <Toggle
                enabled={config.toggles?.[td.key] ?? false}
                onToggle={() => setToggle(td.key, !(config.toggles?.[td.key] ?? false))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            padding: '10px 28px', borderRadius: 8,
            background: saving ? 'var(--bg-elevated)' : 'var(--accent)',
            border: 'none', color: saving ? 'var(--text-muted)' : '#fff',
            fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {saving ? <><Zap size={13} /> Saved ✓</> : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

const DEMO_SCENARIOS = [
  { threat: 'card_testing_bot',        action: 'block', minAmt: 0.50,  maxAmt: 1.99,  rails: ['p2p','zelle'],       signals: ['micro_amount_sequence','timing_regularity'], conf: [0.88,0.96], reason: 'Card testing bot confirmed — micro-amount sequence + sub-second timing regularity' },
  { threat: 'card_testing_bot',        action: 'block', minAmt: 0.01,  maxAmt: 1.50,  rails: ['zelle'],             signals: ['timing_regularity','headless_device'],       conf: [0.84,0.93], reason: 'Automated card probing — headless browser signature detected on sub-$2 transaction' },
  { threat: 'ato_bot',                 action: 'block', minAmt: 2500,  maxAmt: 9500,  rails: ['wire','ACH'],        signals: ['headless_device','ip_reputation'],            conf: [0.79,0.88], reason: 'ATO bot confirmed — headless device + high-risk IP on large outbound wire' },
  { threat: 'ato_bot',                 action: 'flag',  minAmt: 600,   maxAmt: 3500,  rails: ['ACH','p2p'],         signals: ['timing_regularity'],                         conf: [0.61,0.72], reason: 'ATO bot probable — timing regularity on first-time recipient' },
  { threat: 'credential_stuffing',     action: 'flag',  minAmt: 50,    maxAmt: 800,   rails: ['p2p','zelle'],       signals: ['ip_reputation','timing_regularity'],         conf: [0.65,0.74], reason: 'Credential stuffing detected — known breach IP cluster + velocity spike' },
  { threat: 'synthetic_identity_farm', action: 'flag',  minAmt: 800,   maxAmt: 6000,  rails: ['ACH','wire'],        signals: ['identity_clone'],                            conf: [0.64,0.73], reason: 'Synthetic identity signal — SSN linked to 3 other flagged accounts' },
  { threat: 'deepfake_bypass',         action: 'block', minAmt: 7500,  maxAmt: 28000, rails: ['wire','crypto'],     signals: ['ip_reputation'],                             conf: [0.81,0.89], reason: 'Deepfake bypass attempt — high-value wire immediately after synthetic voice auth' },
  { threat: 'adversarial_ml',          action: 'flag',  minAmt: 150,   maxAmt: 2500,  rails: ['crypto','zelle'],    signals: ['timing_regularity'],                         conf: [0.72,0.79], reason: 'Adversarial ML input — features crafted to sit just below block threshold' },
  { threat: 'clean',                   action: 'allow', minAmt: 15,    maxAmt: 800,   rails: ['zelle','p2p'],       signals: [],                                            conf: [0.04,0.18], reason: 'No threat signals — within behavioural baseline' },
  { threat: 'clean',                   action: 'allow', minAmt: 200,   maxAmt: 8000,  rails: ['ACH','wire'],        signals: [],                                            conf: [0.06,0.22], reason: 'Legitimate transfer — familiar recipient and normal velocity' },
  { threat: 'clean',                   action: 'allow', minAmt: 5,     maxAmt: 200,   rails: ['p2p','zelle'],       signals: [],                                            conf: [0.03,0.12], reason: 'Low-risk P2P — known contact, within 30-day spending profile' },
];

const DEMO_WEIGHTS = [2, 2, 1.5, 1, 1, 1, 1, 1, 3, 2.5, 2];

let _demoCtr = 1000;
function generateDemoEvent(fixedIdx = null) {
  let idx = fixedIdx ?? (() => {
    const total = DEMO_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < DEMO_WEIGHTS.length; i++) { r -= DEMO_WEIGHTS[i]; if (r <= 0) return i; }
    return DEMO_WEIGHTS.length - 1;
  })();
  idx = idx % DEMO_SCENARIOS.length;
  const s = DEMO_SCENARIOS[idx];
  const amount = s.minAmt + Math.random() * (s.maxAmt - s.minAmt);
  const rail = s.rails[Math.floor(Math.random() * s.rails.length)];
  const conf = s.conf[0] + Math.random() * (s.conf[1] - s.conf[0]);
  return {
    transaction_id: `txn_${(++_demoCtr).toString(16).padStart(6, '0')}`,
    timestamp: new Date().toISOString(),
    action: s.action, threat_type: s.threat, amount, rail,
    ai_signals: s.signals, action_confidence: conf,
    ml_score: s.action === 'allow' ? 0.05 + Math.random() * 0.25 : 0.55 + Math.random() * 0.35,
    combined_score: s.action === 'allow' ? 0.08 + Math.random() * 0.20 : 0.58 + Math.random() * 0.32,
    reason: s.reason,
  };
}

const DEMO_LEARNED_RULES = [
  { id: 'dr1', name: 'CARD_TEST_MICRO_VELOCITY', typology: 'card_testing_bot', status: 'deployed',
    reason: 'Catches bots executing 3+ sub-$2 transactions within 60s across P2P rails.',
    backtest: { precision: 0.84, recall: 0.031 } },
  { id: 'dr2', name: 'ATO_HEADLESS_WIRE_SPIKE', typology: 'ato_bot', status: 'shadow',
    reason: 'Flags ATO bots initiating wires >$2,500 from headless sessions with no prior wire history.',
    backtest: { precision: 0.71, recall: 0.018 } },
];

const DEMO_CONFIG = {
  block_threshold: 0.65, flag_threshold: 0.45,
  per_threat: {
    card_testing_bot:        { block: 0.60, flag: 0.40, enabled: true },
    credential_stuffing:     { block: 0.65, flag: 0.45, enabled: true },
    ato_bot:                 { block: 0.70, flag: 0.50, enabled: true },
    synthetic_identity_farm: { block: 0.70, flag: 0.50, enabled: true },
    deepfake_bypass:         { block: 0.80, flag: 0.60, enabled: true },
    adversarial_ml:          { block: 0.75, flag: 0.55, enabled: true },
  },
  toggles: { self_learning: true, auto_deploy_rules: false, high_alert_mode: false, zero_tolerance_bot: false, human_review_required: false },
  speed: 0.25,
};

const DEMO_CASES = [
  {
    case_id: 'demo_c1', transaction_id: 'txn_0003e8',
    created_at: new Date(Date.now() - 180000).toISOString(),
    status: 'pending', agent_action: 'flag', threat_type: 'ato_bot', threat_label: 'ATO Bot',
    combined_score: 0.74, ml_score: 0.71, ai_confidence: 0.68,
    reason: 'ATO bot probable — timing regularity on new recipient, no prior wire history at this amount.',
    ai_signals: ['timing_regularity', 'headless_device'], amount: 2850, rail: 'ACH',
    escalate_human: false, analyst_action: null, analyst_id: null, analyst_note: '', resolved_at: null,
  },
  {
    case_id: 'demo_c2', transaction_id: 'txn_0004a2',
    created_at: new Date(Date.now() - 420000).toISOString(),
    status: 'pending', agent_action: 'block', threat_type: 'deepfake_bypass', threat_label: 'Deepfake Bypass',
    combined_score: 0.87, ml_score: 0.83, ai_confidence: 0.79,
    reason: 'Deepfake bypass — large wire initiated immediately after voice auth on new device. Escalated for human review.',
    ai_signals: ['ip_reputation'], amount: 14500, rail: 'wire',
    escalate_human: true, analyst_action: null, analyst_id: null, analyst_note: '', resolved_at: null,
  },
];

// ── Root component ────────────────────────────────────────────────────────────

export default function SyntheticID() {
  const [activeTab,    setActiveTab]    = useState('live');
  const [status,       setStatus]       = useState(null);
  const [isDemoMode,   setIsDemoMode]   = useState(false);
  const [demoStatus,   setDemoStatus]   = useState({
    running: true, blocked_count: 47, flagged_count: 23,
    allowed_count: 312, patterns_learned: 2, uptime_seconds: 14427,
  });
  const [events,       setEvents]       = useState([]);
  const [threatCounts, setThreatCounts] = useState({});
  const [learnedRules, setLearnedRules] = useState([]);
  const [cases,        setCases]        = useState([]);
  const [config,       setConfig]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const esRef          = useRef(null);
  const backendOkRef   = useRef(false);

  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const displayStatus = isDemoMode ? demoStatus : status;

  // Fetch learned rules (live only)
  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/rule-factory/rules`);
      if (!res.ok) return;
      const data = await res.json();
      const rules = (data.rules || [])
        .filter(r => r.status === 'deployed' || r.status === 'shadow')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setLearnedRules(rules);
    } catch {}
  }, []);

  // Status poll — first failure → demo mode
  useEffect(() => {
    if (!IS_LOCAL) { setIsDemoMode(true); return; }
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND}/agent/status`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) { backendOkRef.current = true; setStatus(await res.json()); return; }
      } catch {}
      if (!backendOkRef.current) setIsDemoMode(true);
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  // Demo mode — seed + stream fake events
  useEffect(() => {
    if (!isDemoMode) return;
    // Seed initial state
    const seed = Array.from({ length: 20 }, (_, i) => generateDemoEvent(i));
    setEvents(seed);
    const seedCounts = {};
    seed.forEach(e => { if (e.threat_type !== 'clean') seedCounts[e.threat_type] = (seedCounts[e.threat_type] || 0) + 1; });
    setThreatCounts(seedCounts);
    setLearnedRules(DEMO_LEARNED_RULES);
    setCases(DEMO_CASES);
    if (!config) setConfig(DEMO_CONFIG);

    // Streaming events
    let timeoutId;
    const tick = () => {
      const ev = generateDemoEvent();
      setEvents(prev => [ev, ...prev].slice(0, 150));
      if (ev.threat_type !== 'clean') setThreatCounts(prev => ({ ...prev, [ev.threat_type]: (prev[ev.threat_type] || 0) + 1 }));
      setDemoStatus(prev => ({
        ...prev,
        blocked_count:  prev.blocked_count  + (ev.action === 'block' ? 1 : 0),
        flagged_count:  prev.flagged_count   + (ev.action === 'flag'  ? 1 : 0),
        allowed_count:  prev.allowed_count   + (ev.action === 'allow' ? 1 : 0),
        uptime_seconds: prev.uptime_seconds  + 1,
      }));
      timeoutId = setTimeout(tick, 700 + Math.random() * 900);
    };
    timeoutId = setTimeout(tick, 400);
    return () => clearTimeout(timeoutId);
  }, [isDemoMode]); // eslint-disable-line

  // Live mode — load config + SSE
  useEffect(() => {
    if (isDemoMode) return;
    fetch(`${BACKEND}/agent/config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConfig(d); })
      .catch(() => {});
    fetchRules();
  }, [isDemoMode, fetchRules]);

  useEffect(() => {
    if (isDemoMode) return;
    const es = new EventSource(`${BACKEND}/agent/events`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ping') return;
        if (data.type === 'pattern_learned') { fetchRules(); }
        if (data.type === 'case_resolved') {
          setCases(prev => prev.map(c => c.case_id === data.case_id
            ? { ...c, status: data.analyst_action === 'approve' ? 'approved' : 'declined', analyst_action: data.analyst_action, resolved_at: data.timestamp }
            : c));
          return;
        }
        setEvents(prev => [data, ...prev].slice(0, 150));
        if (data.threat_type && data.threat_type !== 'clean')
          setThreatCounts(prev => ({ ...prev, [data.threat_type]: (prev[data.threat_type] || 0) + 1 }));
      } catch {}
    };
    return () => es.close();
  }, [isDemoMode, fetchRules]);

  // Poll cases (live mode only)
  useEffect(() => {
    if (isDemoMode || activeTab !== 'cases') return;
    const poll = async () => {
      try { const res = await fetch(`${BACKEND}/agent/cases`); if (res.ok) setCases(await res.json()); } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [isDemoMode, activeTab]);

  // Auto-start if live and idle
  useEffect(() => {
    if (!isDemoMode && status !== null && !status.running)
      fetch(`${BACKEND}/agent/start`, { method: 'POST' }).catch(() => {});
  }, [isDemoMode, status?.running]); // eslint-disable-line

  async function handleStart() {
    if (isDemoMode) return;
    try { await fetch(`${BACKEND}/agent/start`, { method: 'POST' }); } catch {}
  }

  async function handleResolve(caseId, action, note) {
    if (isDemoMode) {
      setCases(prev => prev.map(c => c.case_id === caseId
        ? { ...c, status: action === 'approve' ? 'approved' : 'declined', analyst_action: action, analyst_id: 'analyst_1', analyst_note: note, resolved_at: new Date().toISOString() }
        : c));
      return;
    }
    try {
      const res = await fetch(`${BACKEND}/agent/cases/${caseId}/resolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, analyst_id: 'analyst_1', note }),
      });
      if (res.ok) { const resolved = await res.json(); setCases(prev => prev.map(c => c.case_id === caseId ? resolved : c)); }
    } catch {}
  }

  async function handleSaveConfig() {
    if (!config) return;
    setSaving(true);
    if (!isDemoMode) {
      try {
        const res = await fetch(`${BACKEND}/agent/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
        if (res.ok) setConfig(await res.json());
      } catch {}
    }
    setTimeout(() => setSaving(false), 1800);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <AgentStatusBar status={displayStatus} onStart={handleStart} />
        </div>
        {isDemoMode && (
          <div style={{
            padding: '0 14px', height: 56, display: 'flex', alignItems: 'center', flexShrink: 0,
            borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
              padding: '2px 7px', borderRadius: 4,
              background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.3)',
              color: 'var(--accent)',
            }}>DEMO</span>
          </div>
        )}
      </div>
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={pendingCount} />

      {activeTab === 'live' && (
        <LiveFeedTab events={events} threatCounts={threatCounts} learnedRules={learnedRules} />
      )}
      {activeTab === 'cases' && (
        <CaseReviewTab cases={cases} onResolve={handleResolve} />
      )}
      {activeTab === 'settings' && (
        <AgentSettingsTab config={config} setConfig={setConfig} onSave={handleSaveConfig} saving={saving} />
      )}
    </div>
  );
}
