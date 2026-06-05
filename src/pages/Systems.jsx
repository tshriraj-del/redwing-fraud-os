import { ExternalLink, ShieldCheck, Brain, FlaskConical, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SYSTEMS = [
  {
    name: 'FraudSense',
    version: 'v1.2.0',
    desc: 'LLM-powered fraud investigation copilot. Submit a fraud case and receive a structured investigation with risk score, signal analysis, classification, loss estimate, root cause, and recommended action.',
    icon: ShieldCheck,
    color: '#38bdf8',
    colorDim: 'rgba(56,189,248,0.1)',
    port: 5175,
    link: 'http://localhost:5175',
    features: ['4-stage investigation pipeline', 'Risk scoring 0–100', 'Evidence classification', 'File + image attachment support', 'Exportable reports'],
    stack: 'React + Vite · LLM API · Tailwind',
    status: 'live',
    external: true,
  },
  {
    name: 'Rule Factory',
    version: 'v2.0.0',
    desc: 'Self-improving rule engine. Detects fraud vectors that ML catches but rules miss, generates candidate rules, backtests them, and auto-deploys rules that pass the quality gate.',
    icon: Sparkles,
    color: '#4ade80',
    colorDim: 'rgba(74,222,128,0.1)',
    port: 8000,
    link: '/rules',
    features: ['Gap detection (ML vs rules)', 'AI rule generation', 'Automated backtesting', 'Shadow → auto-deploy pipeline', 'Precision monitoring + retire'],
    stack: 'React + FastAPI · LLM API · XGBoost',
    status: 'live',
    external: false,
  },
  {
    name: 'SyntheticID Lab',
    version: 'v1.1.0',
    desc: 'Adversarial identity stress-tester. Simulate AI fraud agent attacks on your platform, identify detection gaps, and feed bypass patterns directly into Rule Factory as labeled training signal.',
    icon: Brain,
    color: '#c084fc',
    colorDim: 'rgba(192,132,252,0.1)',
    port: 5177,
    link: 'http://localhost:5177',
    features: ['8-step attack lifecycle simulation', 'Detection gap mapping', 'Exposure scoring (5 dimensions)', 'One-click feed to Rule Factory', 'Adversarial training signal generation'],
    stack: 'React + Vite · LLM API · Tailwind',
    status: 'live',
  },
  {
    name: 'ML Detection Lab',
    version: 'v0.9.0',
    desc: 'ML + LLM fraud scoring system. Monitor model health (AUC, Precision, Recall, F1), track performance drift, analyze feature importance, and score transactions with LLM re-ranking.',
    icon: FlaskConical,
    color: '#f59e0b',
    colorDim: 'rgba(245,158,11,0.1)',
    port: 5179,
    link: '/ml',
    internal: true,
    features: ['AUC/Precision/Recall/F1 tracking', '30-day drift monitoring', 'SHAP feature importance', 'LLM transaction scorer', 'Real-time risk scoring'],
    stack: 'React + Vite · Recharts · LLM API',
    status: 'live',
  },
];

function SystemCard({ sys }) {
  const Icon = sys.icon;
  const navigate = useNavigate();

  function open() {
    if (sys.external === false) navigate(sys.link);
    else if (sys.internal) navigate(sys.link);
    else window.open(sys.link, '_blank');
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${sys.colorDim.replace('0.1', '0.2')}`,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = sys.color}
      onMouseLeave={e => e.currentTarget.style.borderColor = sys.colorDim.replace('0.1', '0.2')}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid var(--border)',
          background: sys.colorDim,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: `${sys.color}20`,
              border: `1px solid ${sys.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} style={{ color: sys.color }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {sys.status}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{sys.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{sys.version}</span>
        </div>
        <div style={{ fontSize: 11, color: sys.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
          :{sys.port}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65 }}>{sys.desc}</p>

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
            Features
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sys.features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: sys.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginTop: 'auto' }}>
          {sys.stack}
        </div>
      </div>

      {/* Launch button */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={open}
          style={{
            width: '100%',
            padding: '9px 16px',
            background: `${sys.color}18`,
            border: `1px solid ${sys.color}40`,
            borderRadius: 8,
            color: sys.color,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${sys.color}30`; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${sys.color}18`; }}
        >
          <ExternalLink size={12} />
          {sys.internal ? 'Open in Fraud OS' : `Launch on :${sys.port}`}
        </button>
      </div>
    </div>
  );
}

export default function Systems() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>4 core systems · RedWing suite</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {SYSTEMS.map(s => <SystemCard key={s.name} sys={s} />)}
      </div>
    </div>
  );
}
