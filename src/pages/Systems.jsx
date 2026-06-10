import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Circle } from 'lucide-react';

const SYSTEMS = [
  {
    id: 'operator',
    name: 'Operator API',
    version: 'v2.0.0',
    port: 8000,
    baseUrl: 'http://localhost:8000',
    color: '#4ade80',
    colorDim: 'rgba(74,222,128,0.1)',
    description: 'Single backend service — ML scoring, Rule Factory, autonomous SyntheticID agent, Network Intelligence, XAI engine, and LLM proxy. All requests from the frontend go here.',
    auth: 'ANTHROPIC_API_KEY in operator/.env (Rule Factory + LLM proxy)',
    envFile: 'operator/.env',
    endpoints: [
      { method: 'GET',  path: '/health',                    desc: 'System health, model info, transaction count, loaded patterns' },
      { method: 'POST', path: '/score',                     desc: 'Score a single transaction — XGBoost + rule engine, returns risk score, decision, signals' },
      { method: 'GET',  path: '/monitor/stream',            desc: 'SSE stream of live transaction scoring' },
      { method: 'GET',  path: '/alerts',                    desc: 'Recent high-confidence fraud alerts' },
      { method: 'GET',  path: '/patterns',                  desc: 'Full fraud pattern library (static + deployed auto-generated rules)' },
      { method: 'GET',  path: '/agent/status',              desc: 'Autonomous agent state — running, blocked/flagged/allowed counts, uptime' },
      { method: 'GET',  path: '/agent/events',              desc: 'SSE fan-out — real-time block/flag/allow decisions (per-client queue)' },
      { method: 'POST', path: '/agent/start',               desc: 'Start the autonomous agent (idempotent)' },
      { method: 'POST', path: '/agent/stop',                desc: 'Gracefully stop the agent loop' },
      { method: 'GET',  path: '/agent/config',              desc: 'Current agent config — thresholds, toggles, speed' },
      { method: 'PUT',  path: '/agent/config',              desc: 'Update config live — threshold changes apply without restart' },
      { method: 'GET',  path: '/agent/cases',               desc: 'Case review queue — supports ?status=pending|approved|declined' },
      { method: 'POST', path: '/agent/cases/:id/resolve',   desc: 'Approve or decline a flagged case (analyst override)' },
      { method: 'GET',  path: '/rule-factory/gaps',         desc: 'ML-rule gap cases: ML score > 0.70, rule score < 30, confirmed fraud' },
      { method: 'POST', path: '/rule-factory/run',          desc: 'Trigger full Rule Factory cycle — gap analysis → LLM rule synthesis → backtest → deploy' },
      { method: 'GET',  path: '/rule-factory/rules',        desc: 'All generated rules with status, backtest metrics, precision history' },
      { method: 'POST', path: '/rule-factory/deploy/:id',   desc: 'Promote a shadow rule to deployed' },
      { method: 'POST', path: '/rule-factory/retire/:id',   desc: 'Retire a deployed rule' },
      { method: 'POST', path: '/xai/explain',               desc: 'SHAP explanation for a transaction — per-feature attribution' },
      { method: 'GET',  path: '/xai/governance',            desc: 'Model drift + EU AI Act Article 13 + SR 26-02 governance report' },
      { method: 'GET',  path: '/network/graph',             desc: 'Fraud ring graph — nodes, edges, cluster assignments' },
      { method: 'GET',  path: '/network/typologies',        desc: 'Transaction counts and fraud rates per typology' },
      { method: 'POST', path: '/llm/proxy',                 desc: 'Routes LLM requests server-side — Anthropic, OpenAI, Groq, Mistral. API key never touches browser.' },
      { method: 'GET',  path: '/drift/status',              desc: 'ADWIN-style PSI drift monitor — score distribution + feature drift state: warming_up | stable | warning | drift' },
      { method: 'POST', path: '/drift/reset',               desc: 'Reset drift buffers after model retrain — returns monitor to warming_up state' },
      { method: 'GET',  path: '/graph/stats',               desc: 'Graph feature store stats — entity count, last refresh time (Tier 3 offline embeddings)' },
      { method: 'GET',  path: '/gnn/stats',                 desc: 'GNN Tier 2 table coverage — user/device/recipient embeddings + 1-hop neighbourhood aggregates' },
      { method: 'POST', path: '/ingest',                    desc: 'Inject a live transaction into the full 4-tier pipeline — scores, fans out to SSE clients, drift monitor, and persists to ingest_log.jsonl' },
      { method: 'POST', path: '/ingest/batch',              desc: 'Batch inject up to 1 000 transactions — returns scored results + alert_rate summary' },
      { method: 'GET',  path: '/ingest/stats',              desc: 'Injection pipeline health — ring buffer occupancy, log transaction count, log size' },
    ],
  },
  {
    id: 'fraudsense',
    name: 'FraudSense',
    version: 'v1.2.0',
    port: 5175,
    baseUrl: 'http://localhost:5175',
    color: '#38bdf8',
    colorDim: 'rgba(56,189,248,0.1)',
    description: 'LLM-powered fraud investigation copilot. 4-stage pipeline: signal extraction, risk scoring, classification, enforcement recommendation.',
    auth: 'VITE_ANTHROPIC_API_KEY in fraudsense/.env',
    envFile: 'fraudsense/.env',
    endpoints: [
      { method: 'UI', path: '/', desc: 'Paste a fraud case description + optional file attachments to get a full investigation report' },
    ],
    note: 'Client-side only — no backend API. Calls LLM directly from the browser. For server-side integration, proxy through a backend holding the key.',
  },
  {
    id: 'rulebreaker',
    name: 'RuleBreaker',
    version: 'v1.1.0',
    port: 5173,
    baseUrl: 'http://localhost:5173',
    color: '#a5b4fc',
    colorDim: 'rgba(165,180,252,0.1)',
    description: 'Adversarial rule stress-tester + live vector-to-rule synthesis. Two modes: stress-test a rule, or generate rules from raw flagged transaction data.',
    auth: 'VITE_ANTHROPIC_API_KEY in rulebreaker/.env',
    envFile: 'rulebreaker/.env',
    endpoints: [
      { method: 'UI', path: '/stress-test', desc: 'Input a rule → get evasion patterns, resilience score, hardening recommendations' },
      { method: 'UI', path: '/learn',       desc: 'Paste flagged transaction vectors → get pattern analysis + 2-3 synthesised detection rules' },
    ],
    note: 'Client-side only — no backend API.',
  },
  {
    id: 'syntheticid',
    name: 'SyntheticID Agent',
    version: 'v2.0.0',
    port: 8000,
    baseUrl: 'http://localhost:8000',
    color: '#c084fc',
    colorDim: 'rgba(192,132,252,0.1)',
    description: 'Autonomous AI fraud detection agent — integrated into the Operator backend. Runs 24/7, classifies 7 AI-driven threat types, makes block/flag/allow decisions backed by real XGBoost inference. Self-learning via Rule Factory.',
    auth: 'Served by Operator — no separate auth',
    envFile: 'operator/.env',
    endpoints: [
      { method: 'UI',  path: '/syntheticid',          desc: 'Agent control center — Live Feed (SSE), Case Review queue, Agent Settings' },
      { method: 'GET', path: '/agent/status',          desc: 'Agent state, counters, uptime' },
      { method: 'GET', path: '/agent/events',          desc: 'SSE fan-out — real-time block/flag/allow decisions' },
      { method: 'GET', path: '/agent/cases',           desc: 'Human review queue (EU AI Act Article 14 compliance)' },
      { method: 'PUT', path: '/agent/config',          desc: 'Live threshold + toggle updates — no restart needed' },
    ],
    note: 'Fully integrated into Fraud OS and the Operator backend. No separate port or deploy needed.',
  },
];

const METHOD_STYLES = {
  GET:  { color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  POST: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  UI:   { color: '#a5b4fc', bg: 'rgba(165,180,252,0.1)' },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ade80' : 'var(--text-muted)', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center' }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

function EndpointRow({ ep, baseUrl }) {
  const style = METHOD_STYLES[ep.method] ?? METHOD_STYLES.GET;
  const full = ep.method !== 'UI' ? `${baseUrl}${ep.path}` : null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', padding: '2px 6px', borderRadius: 4, background: style.bg, color: style.color, flexShrink: 0, marginTop: 2, minWidth: 34, textAlign: 'center' }}>
        {ep.method}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <code style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{ep.path}</code>
          {full && <CopyButton text={full} />}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{ep.desc}</div>
      </div>
    </div>
  );
}

function SystemCard({ sys, online }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: 'var(--bg-surface)', border: `1px solid ${open ? sys.color : sys.colorDim.replace('0.1', '0.2')}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: open ? sys.colorDim : 'transparent', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: online === null ? 'var(--yellow)' : online ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{sys.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{sys.version}</span>
          </div>
          <code style={{ fontSize: 10, color: sys.color, fontFamily: 'JetBrains Mono, monospace', background: sys.colorDim, padding: '2px 7px', borderRadius: 4 }}>
            :{sys.port}
          </code>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sys.endpoints.length} endpoint{sys.endpoints.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: '12px 0' }}>{sys.description}</p>

          {/* Auth + env */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Auth</div>
              <div style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>{sys.auth}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Config</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <code style={{ fontSize: 11, color: sys.color, fontFamily: 'JetBrains Mono, monospace' }}>{sys.envFile}</code>
                <CopyButton text={sys.envFile} />
              </div>
            </div>
          </div>

          {/* Base URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 7 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Base URL</span>
            <code style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', flex: 1 }}>{sys.baseUrl}</code>
            <CopyButton text={sys.baseUrl} />
            <a href={sys.baseUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'flex' }}>
              <ExternalLink size={11} />
            </a>
          </div>

          {/* Endpoints */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Endpoints</div>
          <div>
            {sys.endpoints.map(ep => <EndpointRow key={ep.path + ep.method} ep={ep} baseUrl={sys.baseUrl} />)}
          </div>

          {sys.note && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(165,180,252,0.06)', border: '1px solid rgba(165,180,252,0.15)', borderRadius: 7, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              ℹ️ {sys.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Systems() {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    SYSTEMS.forEach(sys => {
      fetch(`http://localhost:${sys.port}`, { signal: AbortSignal.timeout(2500) })
        .then(() => setStatuses(prev => ({ ...prev, [sys.id]: true })))
        .catch(() => setStatuses(prev => ({ ...prev, [sys.id]: false })));
    });
  }, []);

  const online = Object.values(statuses).filter(Boolean).length;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {online} / {SYSTEMS.length} services online · click any service to expand endpoints
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          RedWing API Reference
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SYSTEMS.map(sys => (
          <SystemCard key={sys.id} sys={sys} online={statuses[sys.id] ?? null} />
        ))}
      </div>
    </div>
  );
}
