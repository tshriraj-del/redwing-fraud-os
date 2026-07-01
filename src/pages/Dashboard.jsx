import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, Radar, Gauge, Network,
  TrendingUp, ArrowRight, Zap, Clock, Sparkles,
} from 'lucide-react';
import { fetchMLMetrics } from '../api.js';

// The home is a MAP of the five jobs, mirroring the sidebar — so a first-time user
// learns the workflow instead of guessing at a grab-bag of tools. Each card opens
// the primary page for that job; the deeper tools live inside it.
const TOOLS = [
  {
    id: 'detect',
    name: 'Detect',
    desc: 'Score transactions in real time — the live 3-tier ML + graph engine.',
    icon: Radar,
    color: 'var(--blue)',
    colorDim: 'rgba(56,189,248,0.1)',
    link: '/operator',
  },
  {
    id: 'investigate',
    name: 'Investigate',
    desc: 'Work a case to a decision — evidence, the FraudSense copilot, and SAR filing.',
    icon: ShieldAlert,
    color: 'var(--accent)',
    colorDim: 'rgba(129,140,248,0.1)',
    link: '/investigate',
  },
  {
    id: 'assurance',
    name: 'Assurance',
    desc: 'Trust & measure the model — drift, red-team, agent evals, explainability.',
    icon: Gauge,
    color: 'var(--green)',
    colorDim: 'rgba(34,197,94,0.1)',
    link: '/observability',
  },
  {
    id: 'adapt',
    name: 'Adapt',
    desc: 'Close the loop — turn confirmed fraud into new detection rules.',
    icon: Sparkles,
    color: 'var(--purple)',
    colorDim: 'rgba(192,132,252,0.1)',
    link: '/rules',
  },
  {
    id: 'network',
    name: 'Network & Privacy',
    desc: 'Cross-bank mule detection, privacy-preserving — the consortium moat.',
    icon: Network,
    color: 'var(--orange)',
    colorDim: 'rgba(249,115,22,0.1)',
    link: '/consortium',
  },
];

const FEED = [
  { time: '2m ago',  msg: 'FraudSense flagged 3 high-risk ATO cases - escalation recommended',            color: 'var(--red)' },
  { time: '11m ago', msg: 'RuleBreaker: velocity_abuse_v3 bypassed under low-balance condition',           color: 'var(--yellow)' },
  { time: '34m ago', msg: 'SyntheticID Agent: card_testing_bot triggered 5 new rule gap signals',           color: 'var(--yellow)' },
  { time: '1h ago',  msg: 'Rule Factory: 3 candidates generated from SyntheticID stress-test',             color: 'var(--green)' },
  { time: '2h ago',  msg: 'SAR Writer: OFAC SDN match auto-detected - draft generated for review',         color: 'var(--red)' },
  { time: '3h ago',  msg: 'ML Detection Lab: XGBoost retrained on 23 features - AUC 0.979',               color: 'var(--green)' },
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

function ToolCard({ tool }) {
  const navigate = useNavigate();
  const Icon = tool.icon;
  const borderBase = tool.colorDim.replace('0.1', '0.25');

  return (
    <div
      onClick={() => navigate(tool.link)}
      style={{
        background: 'var(--bg-surface)', border: `1px solid ${borderBase}`,
        borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column',
        gap: 12, cursor: 'pointer', transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = tool.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = borderBase; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: tool.colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: tool.color }} />
        </div>
        {tool.badge && (
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.3)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' }}>
            {tool.badge}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{tool.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tool.desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  );
}

const DEMO_METRICS = {
  auc_redwing: 0.9791, auc_ensemble: 0.9791,
  fraud_rate: 0.0184, n_transactions: 880719, feature_count: 23,
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [ruleGaps, setRuleGaps] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    fetchMLMetrics()
      .then(m => setMetrics(m))
      .catch(() => setMetrics(DEMO_METRICS))
      .finally(() => clearTimeout(timer));

    fetch('http://localhost:8000/rule-factory/gaps', { signal: AbortSignal.timeout(2000) })
      .then(r => r.json())
      .then(d => setRuleGaps(d.count ?? null))
      .catch(() => setRuleGaps(14));
  }, []);

  const metricCards = [
    { label: 'Model AUC',          value: metrics ? (metrics.auc_redwing || metrics.auc_ensemble || 0).toFixed(4) : '-', delta: metrics?.feature_count === 23 ? '23 features · v2' : '13 features · v1', good: true,  icon: TrendingUp },
    { label: 'Fraud Rate',         value: metrics ? `${(metrics.fraud_rate * 100).toFixed(2)}%` : '-',  delta: `of ${metrics ? metrics.n_transactions?.toLocaleString() : '-'} transactions`, good: true,  icon: ShieldCheck },
    { label: 'Rule Gaps',          value: ruleGaps !== null ? ruleGaps : '-',  delta: 'ML catching what rules miss', good: false, icon: Sparkles },
    { label: 'Workflow Areas',     value: TOOLS.length, delta: 'Detect → Investigate → Adapt', good: true,  icon: Zap },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Platform metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {metricCards.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Tool suite + feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Start here · the RedWing workflow
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {TOOLS.map(t => <ToolCard key={t.id} tool={t} />)}
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

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}.fade-in{animation:fadeIn 0.3s ease}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
