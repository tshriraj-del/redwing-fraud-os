import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Download, RotateCcw } from 'lucide-react';
import { WORKERS, WORKER_LIST, detectWorker, setLiveContext } from '../workers.js';
import { streamMessage } from '../api.js';

const BACKEND = 'http://localhost:8000';

async function fetchLiveContext() {
  try {
    const [health, gaps] = await Promise.all([
      fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(2000) }).then(r => r.json()).catch(() => null),
      fetch(`${BACKEND}/rule-factory/gaps`, { signal: AbortSignal.timeout(2000) }).then(r => r.json()).catch(() => null),
    ]);
    const lines = ['Current Riposte system state (injected at session start):'];
    if (health) {
      lines.push(`- Model AUC: ${health.model_metrics?.auc_ensemble ?? '—'} | Fraud rate: ${health.model_metrics?.fraud_rate ? (health.model_metrics.fraud_rate * 100).toFixed(2) + '%' : '—'}`);
      lines.push(`- Transactions in dataset: ${health.model_metrics?.n_transactions?.toLocaleString() ?? '—'}`);
      lines.push(`- Active features: ${health.features?.length ?? '—'}`);
    }
    if (gaps) {
      lines.push(`- Rule gaps detected: ${gaps.count ?? 0} (ML catches, rules miss)`);
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

// Convert markdown-style text to HTML for display
function renderMarkdown(text) {
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (m) => m.trim() ? m : '')
    .replace(/^<\/p><p>$/gm, '')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<li')) return line;
      if (line.trim()) return `<p>${line}</p>`;
      return '';
    })
    .join('');
}

function WorkerBadge({ workerId, small }) {
  const w = WORKERS[workerId];
  if (!w) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: small ? '2px 7px' : '3px 9px',
        borderRadius: 20,
        background: w.colorDim,
        border: `1px solid ${w.color}30`,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        color: w.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{w.icon}</span> {w.short}
    </span>
  );
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div
          style={{
            maxWidth: '70%',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(129,140,248,0.25)',
            borderRadius: '12px 12px 2px 12px',
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--text)',
            lineHeight: 1.6,
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: WORKERS[msg.worker]?.colorDim ?? 'var(--accent-dim)',
          border: `1px solid ${WORKERS[msg.worker]?.color ?? 'var(--accent)'}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {WORKERS[msg.worker]?.icon ?? '🤖'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <WorkerBadge workerId={msg.worker} small />
          {msg.streaming && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Thinking…</span>
          )}
        </div>
        <div
          className={`prose-agent${msg.streaming ? ' cursor-blink' : ''}`}
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text)',
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
      </div>
    </div>
  );
}

const STARTERS = [
  { label: 'Why are there rule gaps and what should I do about them?', worker: 'rule_engineer' },
  { label: 'What attack patterns is SyntheticID Lab exposing that rules aren\'t catching?', worker: 'threat' },
  { label: 'Should I tighten the velocity_1h threshold given current false positive rate?', worker: 'risk_strategist' },
  { label: 'Explain the AUC and what could cause it to drift', worker: 'ml_monitor' },
  { label: 'Walk me through how to investigate a pig butchering case in FraudSense', worker: 'case_analyst' },
  { label: 'How do I interpret a fraud ring cluster in Network Intel?', worker: 'network_analyst' },
];

export default function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('auto');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch live system context on mount and inject into workers; seed demo conversation when offline
  useEffect(() => {
    fetchLiveContext().then(ctx => {
      if (ctx) setLiveContext(ctx);
    });
    fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2500) })
      .catch(() => {
        setMessages([
          { id: 1, role: 'user', content: 'Why are there 14 rule gaps and what patterns is SyntheticID Agent exposing?' },
          { id: 2, role: 'assistant', worker: 'rule_engineer', streaming: false, content: `## Rule Gap Analysis — 14 Open Gaps\n\nThe 14 gaps reflect ML catching fraud that the rule engine hasn't codified yet. Here's what's happening:\n\n**Highest-priority gaps:**\n\n- **Card testing bot on P2P rails** (gap score 0.84) — Micro-amounts ($0.50–$1.99) on Zelle/Venmo slip through velocity rules because most rules trigger at $2.00+. SyntheticID Agent has been capturing 28 micro-transactions per hour from the same device; rules see nothing.\n\n- **Headless ATO on wire** (gap score 0.71) — Bot-driven account takeovers initiating wire transfers pass device checks because the device fingerprint is consistent — it's a headless browser reusing stolen session tokens.\n\n- **Deepfake KYC bypass** (gap score 0.67) — No rule exists for the pattern: high-value wire + new recipient + ML score > 0.80 + no headless signal. These are deepfake social engineering cases (victim-authorized) that rules can't fingerprint.\n\n**What Rule Factory should do next:**\n\nRun the pipeline — it will synthesize rules from SyntheticID's novel buffer. The \`CARD_TEST_MICRO_VELOCITY_P2P\` candidate is already in shadow mode with 84% precision. Deploy it.\n\nThe closed feedback loop: **SyntheticID detects → Rule Factory codifies → Agent's operating surface tightens → Agent finds the next gap**. That's how the system self-improves.` },
          { id: 3, role: 'user', content: 'What should I do about the deepfake bypass gap specifically?' },
          { id: 4, role: 'assistant', worker: 'threat', streaming: false, content: `## Deepfake Bypass — Threat Deep-Dive\n\nThis is the hardest gap to close because deepfake cases are **victim-authorized** — the customer genuinely believes they're sending to a legitimate payee. Rules struggle because there's no bot signal.\n\n**Attack playbook:**\n1. Adversary creates a convincing deepfake video call posing as bank/investment advisor\n2. Victim authorizes a large wire to a mule account ("investment opportunity")\n3. Transaction looks legitimate: real customer, known device, correct biometrics\n4. ML catches it: amount + new recipient + no headless signal + score > 0.70\n\n**Rule Factory candidate (\`DEEPFAKE_HIGH_VALUE_NEW_RECIP\`):**\n\`\`\`python\ndef rule(tx):\n    return (\n        tx["amount"] > 5000 and\n        tx["new_recipient"] and\n        not tx["is_headless_browser"] and\n        tx["ml_score"] > 0.70\n    )\n\`\`\`\n\nThis is in shadow mode — 78% precision. **Don't auto-deploy yet.** The 22% false positive rate will hit legitimate large transfers to new payees (real estate, major purchases).\n\n**Recommended action:** Deploy with a **step-up friction** trigger (callback confirmation for transactions > $5K to new recipients) rather than a hard block. This catches deepfake cases without blocking legitimate transfers.` },
        ]);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    setInput('');
    setError(null);

    const workerId = selectedWorker === 'auto' ? detectWorker(content) : selectedWorker;
    const worker = WORKERS[workerId];
    const liveCtx = await fetchLiveContext();
    const systemPromptWithContext = liveCtx
      ? `${worker.systemPrompt}\n\n${liveCtx}`
      : worker.systemPrompt;

    const userMsg = { id: Date.now(), role: 'user', content };
    const asstMsg = { id: Date.now() + 1, role: 'assistant', worker: workerId, content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, asstMsg]);
    setStreaming(true);

    // Build conversation history for the API (user messages only, exclude streaming assistant)
    const history = [];
    for (const m of messages) {
      history.push({ role: m.role, content: m.content });
    }
    history.push({ role: 'user', content });

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamMessage({
        systemPrompt: systemPromptWithContext,
        messages: history,
        signal: ctrl.signal,
        onToken: (token) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === asstMsg.id ? { ...m, content: m.content + token } : m
            )
          );
        },
        onDone: () => {
          setMessages(prev =>
            prev.map(m => m.id === asstMsg.id ? { ...m, streaming: false } : m)
          );
          setStreaming(false);
        },
      });
    } catch (e) {
      if (e.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m => m.id === asstMsg.id ? { ...m, streaming: false, content: m.content || '_(stopped)_' } : m)
        );
      } else {
        setError(e.message);
        setMessages(prev => prev.filter(m => m.id !== asstMsg.id));
      }
      setStreaming(false);
    }
  }, [input, messages, selectedWorker, streaming]);

  function stop() {
    abortRef.current?.abort();
  }

  function clear() {
    stop();
    setMessages([]);
    setError(null);
    setStreaming(false);
  }

  function saveReport() {
    const text = messages
      .map(m => m.role === 'user' ? `USER: ${m.content}` : `[${WORKERS[m.worker]?.name}]\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riposte-intelligence-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Worker selector */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginRight: 4 }}>Worker:</span>
        {['auto', ...Object.keys(WORKERS)].map(id => {
          const w = id === 'auto' ? null : WORKERS[id];
          const active = selectedWorker === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedWorker(id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${active ? (w?.color ?? 'var(--accent)') : 'var(--border)'}`,
                background: active ? (w?.colorDim ?? 'var(--accent-dim)') : 'transparent',
                color: active ? (w?.color ?? 'var(--accent)') : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {w ? `${w.icon} ${w.short}` : '⚡ Auto-detect'}
            </button>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {messages.length > 0 && (
            <>
              <button onClick={saveReport} title="Save report" style={iconBtnStyle}>
                <Download size={13} />
              </button>
              <button onClick={clear} title="Clear conversation" style={iconBtnStyle}>
                <RotateCcw size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Riposte Intelligence</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, textAlign: 'center', maxWidth: 380 }}>
              Six specialist workers with live system context. Ask about rule gaps, attack patterns, model health, cases, thresholds, or fraud rings.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%', maxWidth: 540 }}>
              {STARTERS.map(s => (
                <button
                  key={s.label}
                  onClick={() => send(s.label)}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    lineHeight: 1.5,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
                >
                  <span style={{ fontSize: 10, marginRight: 4 }}>{WORKERS[s.worker].icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '8px 10px 8px 16px',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask Riposte Intelligence… (Shift+Enter for new line)"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 13,
              resize: 'none',
              lineHeight: 1.6,
              maxHeight: 120,
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          {streaming ? (
            <button onClick={stop} style={{ ...sendBtnStyle, background: 'var(--red-dim)', color: 'var(--red)' }}>
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              style={{
                ...sendBtnStyle,
                background: input.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                color: input.trim() ? '#fff' : 'var(--text-muted)',
                cursor: input.trim() ? 'pointer' : 'default',
              }}
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle = {
  padding: '6px 8px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

const sendBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'all 0.15s ease',
};
