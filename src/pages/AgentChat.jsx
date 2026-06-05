import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Download, RotateCcw, ChevronDown } from 'lucide-react';
import { WORKERS, WORKER_LIST, detectWorker } from '../workers.js';
import { streamMessage } from '../api.js';

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
  { label: 'Review FraudSense product strategy', worker: 'product' },
  { label: 'Evaluate ML model drift risk', worker: 'ml' },
  { label: 'Security audit of SyntheticID agent', worker: 'security' },
  { label: 'Research competing fraud platforms', worker: 'research' },
  { label: 'Write PRD for rule explanation feature', worker: 'product' },
  { label: 'Analyze ATO attack patterns in RuleBreaker', worker: 'fraud' },
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
        systemPrompt: worker.systemPrompt,
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
    a.download = `ai-org-report-${Date.now()}.md`;
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
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>AI Organization</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, textAlign: 'center', maxWidth: 380 }}>
              Seven specialized workers ready. Ask anything about your products, ML models, fraud patterns, or security posture.
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
            placeholder="Ask your AI Organization… (Shift+Enter for new line)"
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
