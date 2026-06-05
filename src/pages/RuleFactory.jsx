import { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Play, CheckCircle2, XCircle, Eye, AlertTriangle,
  ChevronDown, ChevronRight, RefreshCw, Zap, Archive,
  TrendingUp, ShieldAlert, BarChart2,
} from 'lucide-react';

const BACKEND = 'http://localhost:8000';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(v) { return v != null ? `${(v * 100).toFixed(1)}%` : '—'; }
function num(v)  { return v != null ? v.toLocaleString() : '—'; }

function scoreColor(p) {
  if (p >= 0.78) return 'var(--green)';
  if (p >= 0.55) return 'var(--yellow)';
  return 'var(--red)';
}

const STATUS_META = {
  deployed: { label: 'Deployed', color: 'var(--green)',  bg: 'rgba(34,197,94,0.12)',  icon: CheckCircle2 },
  shadow:   { label: 'Shadow',   color: 'var(--yellow)', bg: 'rgba(245,158,11,0.12)', icon: Eye },
  retired:  { label: 'Retired',  color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.12)', icon: Archive },
  rejected: { label: 'Rejected', color: 'var(--red)',    bg: 'rgba(239,68,68,0.12)',  icon: XCircle },
};

const REC_META = {
  AUTO_DEPLOY:      { label: 'Auto-deploy',  color: 'var(--green)' },
  SHADOW:           { label: 'Shadow mode',  color: 'var(--yellow)' },
  REJECT:           { label: 'Reject',       color: 'var(--red)' },
  REJECT_DUPLICATE: { label: 'Duplicate',    color: 'var(--text-muted)' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {Icon && <Icon size={13} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text)', letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function BacktestBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
          {typeof value === 'number' ? pct(value) : value}
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{
          width: `${Math.min((value || 0) * 100, 100)}%`, height: '100%',
          borderRadius: 2, background: color || 'var(--accent)',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

function GapCard({ gap }) {
  return (
    <div style={{
      padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--yellow)', marginTop: 5, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
            {gap.transaction_id || '—'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            ${Number(gap.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {gap.fraud_typology && gap.fraud_typology !== 'none' && (
            <span style={{ fontSize: 9, color: 'var(--orange)', fontWeight: 600 }}>
              {gap.fraud_typology.replace(/_/g, ' ')}
            </span>
          )}
          {gap.payment_rail && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{gap.payment_rail}</span>
          )}
          <span style={{ fontSize: 9, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
            ML {Math.round((gap.ensemble_score || 0) * 100)}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Rule {gap.rule_score || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

function RuleCard({ rule, onDeploy, onRetire }) {
  const [expanded, setExpanded] = useState(false);
  const bt = rule.backtest || {};
  const statusMeta = STATUS_META[rule.status] || STATUS_META.shadow;
  const StatusIcon = statusMeta.icon;
  const recMeta = REC_META[bt.recommendation] || {};

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${rule.status === 'deployed' ? 'rgba(34,197,94,0.25)' : rule.status === 'retired' ? 'var(--border)' : 'rgba(245,158,11,0.2)'}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: statusMeta.color,
            background: statusMeta.bg, padding: '2px 7px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <StatusIcon size={9} /> {statusMeta.label}
          </span>

          {bt.recommendation && (
            <span style={{ fontSize: 9, color: recMeta.color, fontWeight: 600 }}>
              {recMeta.label}
            </span>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)' }}>
            {rule.typology?.replace(/_/g, ' ')}
          </span>

          {expanded ? <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
          {rule.name}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          {rule.reason}
        </p>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {[
            { label: 'Precision', value: bt.precision, c: scoreColor(bt.precision) },
            { label: 'Recall',    value: bt.recall,    c: bt.recall > 0.01 ? 'var(--green)' : 'var(--yellow)' },
            { label: 'F1',        value: bt.f1,        c: 'var(--accent)' },
            { label: 'Flagged',   value: bt.n_flagged, c: 'var(--text-dim)', isNum: true },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.c, fontFamily: 'JetBrains Mono, monospace' }}>
                {s.isNum ? num(s.value) : pct(s.value)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Backtest bars */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Backtest Results
              </div>
              <BacktestBar label="Precision" value={bt.precision} color={scoreColor(bt.precision)} />
              <BacktestBar label="Recall" value={bt.recall} color="var(--green)" />
              <BacktestBar label="F1 Score" value={bt.f1} color="var(--accent)" />
              <BacktestBar label="Overlap w/ existing rules" value={bt.overlap_with_existing} color="var(--yellow)" />
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                {[['TP', bt.TP, 'var(--green)'], ['FP', bt.FP, 'var(--red)'], ['FN', bt.FN, 'var(--yellow)']].map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: 'JetBrains Mono, monospace' }}>{num(v)}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rule code */}
            {rule.fn_code && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Generated Rule Code
                </div>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 10,
                  color: 'var(--accent-bright)', fontFamily: 'JetBrains Mono, monospace',
                  overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  margin: 0,
                }}>
                  {rule.fn_code}
                </pre>
              </div>
            )}

            {/* Actions */}
            {rule.status !== 'retired' && (
              <div style={{ display: 'flex', gap: 8 }}>
                {rule.status === 'shadow' && (
                  <button
                    onClick={() => onDeploy(rule.id)}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: 7,
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                      color: 'var(--green)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <CheckCircle2 size={12} /> Deploy Rule
                  </button>
                )}
                <button
                  onClick={() => onRetire(rule.id)}
                  style={{
                    flex: rule.status === 'deployed' ? 1 : 0, padding: '7px 12px', borderRadius: 7,
                    background: 'rgba(100,116,139,0.08)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <Archive size={12} /> Retire
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RuleFactory() {
  const [backendOnline, setBackendOnline] = useState(null);
  const [gapData,  setGapData]  = useState(null);
  const [rules,    setRules]    = useState(null);
  const [running,  setRunning]  = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  // Check backend + load data
  useEffect(() => {
    fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(2500) })
      .then(r => r.json())
      .then(() => { setBackendOnline(true); fetchAll(); })
      .catch(() => setBackendOnline(false));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gapRes, rulesRes] = await Promise.all([
        fetch(`${BACKEND}/rule-factory/gaps`).then(r => r.json()),
        fetch(`${BACKEND}/rule-factory/rules`).then(r => r.json()),
      ]);
      setGapData(gapRes);
      setRules(rulesRes);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runFactory = useCallback(async () => {
    setRunning(true);
    setRunResult(null);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/rule-factory/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Pipeline failed');
      setRunResult(data);
      await fetchAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [fetchAll]);

  const handleDeploy = useCallback(async (id) => {
    await fetch(`${BACKEND}/rule-factory/deploy/${id}`, { method: 'POST' });
    fetchAll();
  }, [fetchAll]);

  const handleRetire = useCallback(async (id) => {
    await fetch(`${BACKEND}/rule-factory/retire/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'manual' }) });
    fetchAll();
  }, [fetchAll]);

  const deployed = rules?.rules?.filter(r => r.status === 'deployed').length ?? 0;
  const shadow   = rules?.rules?.filter(r => r.status === 'shadow').length ?? 0;
  const gapCount = gapData?.count ?? 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Control bar */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {backendOnline === null
            ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)' }} />
            : backendOnline
              ? <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
              : <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)' }} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: backendOnline ? 'var(--green)' : 'var(--red)' }}>
            {backendOnline ? 'Backend online' : backendOnline === false ? 'Backend offline' : 'Connecting…'}
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        <MiniStat label="Rule Gaps" value={gapCount} color={gapCount > 0 ? 'var(--yellow)' : 'var(--text-muted)'} />
        <MiniStat label="Generated" value={rules?.total ?? '—'} />
        <MiniStat label="Deployed"  value={deployed} color={deployed > 0 ? 'var(--green)' : undefined} />
        <MiniStat label="Shadow"    value={shadow}   color={shadow > 0 ? 'var(--yellow)' : undefined} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              padding: '6px 12px', borderRadius: 7,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={runFactory}
            disabled={running || !backendOnline}
            style={{
              padding: '6px 16px', borderRadius: 7,
              background: running ? 'var(--bg-elevated)' : 'linear-gradient(135deg,#818cf8,#c084fc)',
              border: 'none',
              color: running ? 'var(--text-muted)' : '#fff',
              fontSize: 11, fontWeight: 700, cursor: running || !backendOnline ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {running
              ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing gaps…</>
              : <><Zap size={11} /> Run Rule Factory</>}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>

        {/* Left: Rule Gaps */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              Rule Gaps
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Confirmed fraud where ML fired but all 41 rules missed.
              These train the Rule Factory.
            </div>
            {gapData && (
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: gapCount > 0 ? 'var(--yellow)' : 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{gapCount}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>gaps found</div>
                </div>
                {gapData.feature_means && (
                  <>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {((gapData.feature_means.ensemble_score || 0) * 100).toFixed(0)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>avg ML score</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {((gapData.feature_means.recipient_familiarity || 0) * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>avg recip. familiarity</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!backendOnline && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                Backend offline. Start with:<br />
                <code style={{ color: 'var(--accent)', fontSize: 10 }}>cd operator && python main.py</code>
              </div>
            )}
            {gapData?.sample?.length > 0
              ? gapData.sample.map((g, i) => <GapCard key={i} gap={g} />)
              : backendOnline && gapData && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--green)' }}>
                  ✓ No rule gaps — full coverage
                </div>
              )}
          </div>
        </div>

        {/* Right: Generated Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              Generated Rules
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Claude-generated rules — each backtested before deploy. Shadow mode monitors without blocking.
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Run result banner */}
            {runResult && runResult.status === 'ok' && (
              <div className="fade-in" style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.25)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
                  ⚡ Rule Factory Complete
                </div>
                <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
                  Analyzed <strong>{runResult.gaps_analyzed}</strong> rule gaps →
                  Generated <strong>{runResult.candidates}</strong> candidate rules
                </div>
                {runResult.results?.map((r, i) => (
                  <div key={i} style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                    <span style={{ color: (REC_META[r.recommendation] || {}).color || 'var(--text-muted)', fontWeight: 600 }}>
                      {r.recommendation}
                    </span>
                    {' · '}{r.name}
                    {' · '}<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      P={pct(r.backtest?.precision)} R={pct(r.backtest?.recall)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            {/* Empty state */}
            {!running && rules?.total === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48, gap: 10, color: 'var(--text-muted)' }}>
                <Cpu size={32} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: 12, textAlign: 'center' }}>
                  No generated rules yet.<br />
                  Press <strong style={{ color: 'var(--accent)' }}>Run Rule Factory</strong> to analyze rule gaps<br />
                  and auto-generate candidates.
                </div>
              </div>
            )}

            {/* Rule cards */}
            {rules?.rules?.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onDeploy={handleDeploy}
                onRetire={handleRetire}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
    </div>
  );
}
