import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ShieldCheck, FlaskConical, Brain,
  TrendingUp, ArrowRight, Zap, Clock, Sparkles,
} from 'lucide-react';
import { fetchMLMetrics } from '../api.js';

const SYSTEM_DEFS = [
  {
    id: 'fraudsense',
    name: 'FraudSense',
    desc: 'LLM fraud investigation copilot',
    icon: ShieldCheck,
    color: '#38bdf8',
    colorDim: 'rgba(56,189,248,0.1)',
    port: 5175,
    link: 'http://localhost:5175',
    stat: null,
    statFallback: 'Investigation copilot',
  },
  {
    id: 'syntheticid',
    name: 'SyntheticID Lab',
    desc: 'Adversarial stress-tester · feeds Rule Factory',
    icon: Brain,
    color: '#c084fc',
    colorDim: 'rgba(192,132,252,0.1)',
    port: 5177,
    link: 'http://localhost:5177',
    stat: null,
    statFallback: 'Adversarial training feed',
  },
  {
    id: 'mllab',
    name: 'ML Detection Lab',
    desc: 'XGBoost + IsoForest · 23 features',
    icon: FlaskConical,
    color: '#f59e0b',
    colorDim: 'rgba(245,158,11,0.1)',
    port: 8001,
    link: '/ml',
    internal: true,
    stat: null,
    statFallback: 'AUC —',
  },
  {
    id: 'rulefactory',
    name: 'Rule Factory',
    desc: 'Self-improving rule engine · AI-powered',
    icon: Sparkles,
    color: '#4ade80',
    colorDim: 'rgba(74,222,128,0.1)',
    port: 8000,
    link: '/rules',
    internal: true,
    stat: null,
    statFallback: 'Gap detection live',
  },
];

const FEED = [
  { time: '2m ago', msg: 'FraudSense flagged 3 high-risk ATO cases — escalation recommended', color: 'var(--red)' },
  { time: '11m ago', msg: 'Rule Factory: 2,322 rule gaps detected — ML catching what rules miss', color: 'var(--yellow)' },
  { time: '34m ago', msg: 'SyntheticID Lab: card_testing_bot pattern triggered 5 new gap signals', color: 'var(--yellow)' },
  { time: '1h ago', msg: 'Rule Factory pipeline ran — 3 candidates generated, quality gate pending', color: 'var(--green)' },
  { time: '2h ago', msg: 'SyntheticID Lab: Deepfake social engineering attack simulated successfully', color: 'var(--green)' },
  { time: '3h ago', msg: 'ML Detection Lab: XGBoost retrained on 23 features — AUC 0.979', color: 'var(--green)' },
];

function MetricCard({ label, value, delta, good, icon: Icon }) {
  return (
    <div className="fade-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <Icon size={13} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: good ? 'var(--green)' : 'var(--yellow)', fontWeight: 500 }}>{delta}</div>
    </div>
  );
}

function SystemCard({ sys, online }) {
  const Icon = sys.icon;
  const navigate = useNavigate();

  function open() {
    if (sys.internal) navigate(sys.link);
    else window.open(sys.link, '_blank');
  }

  const statusColor = online === null ? 'var(--yellow)' : online ? 'var(--green)' : 'var(--red)';
  const statusLabel = online === null ? 'Checking…' : online ? 'Online' : 'Offline';
  const borderBase = sys.colorDim.replace('0.1', '0.25');

  return (
    <div
      style={{ background: 'var(--bg-surface)', border: `1px solid ${borderBase}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer', transition: 'all 0.2s ease' }}
      onClick={open}
      onMouseEnter={e => { e.currentTarget.style.borderColor = sys.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = borderBase; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: sys.colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: sys.color }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, animation: online ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 10, color: statusColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{statusLabel}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{sys.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{sys.desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: 11, color: sys.color, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{sys.stat || sys.statFallback}</span>
        <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState(SYSTEM_DEFS.map(s => ({ ...s, online: null })));
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Live health check each system
    SYSTEM_DEFS.forEach((sys, i) => {
      fetch(`http://localhost:${sys.port}`, { signal: AbortSignal.timeout(2500) })
        .then(() => setSystems(prev => prev.map((s, j) => j === i ? { ...s, online: true } : s)))
        .catch(() => setSystems(prev => prev.map((s, j) => j === i ? { ...s, online: false } : s)));
    });

    // Live AUC from ML server
    fetchMLMetrics()
      .then(m => {
        const auc = m.auc_redwing || m.auc_ensemble || 0;
        setSystems(prev => prev.map(s =>
          s.id === 'mllab' ? { ...s, stat: `AUC ${auc.toFixed(4)}` } : s
        ));
        setMetrics(m);
      })
      .catch(() => {});

    // Rule gaps count from operator
    fetch('http://localhost:8000/rule-factory/gaps')
      .then(r => r.json())
      .then(d => setSystems(prev => prev.map(s =>
        s.id === 'rulefactory' ? { ...s, stat: `${d.count ?? 0} gaps · rules live` } : s
      )))
      .catch(() => {});
  }, []);

  const metricCards = [
    { label: 'Rule Gaps Detected',  value: systems.find(s=>s.id==='rulefactory')?.stat?.split(' ')[0] ?? '—', delta: 'ML catches, rules miss', good: false, icon: Sparkles },
    { label: 'Fraud Transactions',  value: metrics ? metrics.n_transactions?.toLocaleString() ?? '—' : '—', delta: `${metrics ? (metrics.fraud_rate*100).toFixed(2) : '—'}% fraud rate`, good: true, icon: ShieldCheck },
    { label: 'Model AUC',           value: metrics ? (metrics.auc_redwing || metrics.auc_ensemble || 0).toFixed(4) : '—', delta: metrics?.feature_count === 23 ? '23 features · v2' : '13 features · v1', good: true, icon: TrendingUp },
    { label: 'Active Systems',      value: `${systems.filter(s=>s.online).length} / ${systems.length}`, delta: systems.every(s=>s.online) ? 'All online' : 'Some offline', good: systems.every(s=>s.online), icon: FlaskConical },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Live metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {metricCards.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Systems + feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Core Systems
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {systems.map(s => <SystemCard key={s.id} sys={s} online={s.online} />)}
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={11} /> Activity Feed
          </div>
          <div style={{ padding: '4px 0' }}>
            {FEED.map((f, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: i < FEED.length - 1 ? '1px solid var(--border-subtle)' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{f.msg}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{f.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'RedWing Intelligence', path: '/org', icon: Zap, color: 'var(--accent)' },
            { label: 'ML Model Health', path: '/ml', icon: TrendingUp, color: 'var(--yellow)' },
            { label: 'Rule Factory', path: '/rules', icon: Sparkles, color: 'var(--green)' },
          ].map(a => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.color = a.color; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              <a.icon size={12} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} } .fade-in{animation:fadeIn 0.3s ease} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
