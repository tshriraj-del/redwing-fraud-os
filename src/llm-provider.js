// llm-provider.js — provider-agnostic LLM abstraction for RedWing.
//
// Frontend .env:
//   VITE_LLM_PROVIDER=anthropic        # anthropic | openai | groq | mistral
//   VITE_ANTHROPIC_API_KEY=sk-ant-...  # only needed when provider = anthropic
//
// For openai / groq / mistral, set these in operator/.env (key never touches browser):
//   LLM_PROVIDER=openai
//   LLM_API_KEY=sk-...
//   LLM_MODEL=gpt-4o

const PROVIDER  = import.meta.env.VITE_LLM_PROVIDER ?? 'anthropic';
const PROXY_URL = 'http://localhost:8000/llm/proxy';

// ── Anthropic — direct browser call ───────────────────────────────────────

function anthropicHeaders() {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env');
  return {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

async function anthropicCall({ systemPrompt, messages, model, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: model ?? 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message ?? `LLM error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? '';
}

async function anthropicStream({ systemPrompt, messages, model, maxTokens, onToken, onDone, signal }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: model ?? 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages,
    }),
    signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message ?? `LLM error ${res.status}`);
  }
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') { onDone?.(); return; }
      try {
        const ev = JSON.parse(raw);
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          onToken(ev.delta.text);
        }
      } catch { /* skip malformed */ }
    }
  }
  onDone?.();
}

// ── Proxy — openai / groq / mistral via operator backend ──────────────────

async function proxyCall({ systemPrompt, messages, model, maxTokens }) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: systemPrompt, messages, model, max_tokens: maxTokens, stream: false }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail ?? e.error ?? `Proxy error ${res.status}`);
  }
  const data = await res.json();
  return data.content ?? '';
}

async function proxyStream({ systemPrompt, messages, model, maxTokens, onToken, onDone, signal }) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: systemPrompt, messages, model, max_tokens: maxTokens, stream: true }),
    signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail ?? e.error ?? `Proxy error ${res.status}`);
  }
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') { onDone?.(); return; }
      try {
        const ev = JSON.parse(raw);
        const token = ev.choices?.[0]?.delta?.content ?? '';
        if (token) onToken(token);
      } catch { /* skip */ }
    }
  }
  onDone?.();
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function callLLM({ systemPrompt, messages, model, maxTokens = 2000 }) {
  if (PROVIDER === 'anthropic') return anthropicCall({ systemPrompt, messages, model, maxTokens });
  return proxyCall({ systemPrompt, messages, model, maxTokens });
}

export async function streamLLM({ systemPrompt, messages, model, maxTokens = 8192, onToken, onDone, signal }) {
  if (PROVIDER === 'anthropic') return anthropicStream({ systemPrompt, messages, model, maxTokens, onToken, onDone, signal });
  return proxyStream({ systemPrompt, messages, model, maxTokens, onToken, onDone, signal });
}

export const LLM_PROVIDER = PROVIDER;
