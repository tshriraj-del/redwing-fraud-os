// llm-provider.js — provider-agnostic LLM abstraction for RedWing.
//
// ALL LLM calls route through the Operator backend proxy (port 8000).
// API keys live in operator/.env only — never in the browser.
//
// operator/.env:
//   LLM_PROVIDER=anthropic          # anthropic | openai | groq | mistral
//   LLM_API_KEY=sk-ant-...          # your API key
//   LLM_MODEL=claude-sonnet-4-6     # optional model override
//
// Frontend .env (no API key needed):
//   VITE_LLM_PROVIDER=anthropic

const PROVIDER  = import.meta.env.VITE_LLM_PROVIDER ?? 'anthropic';
const PROXY_URL = 'http://localhost:8000/llm/proxy';

// ── Backend proxy (all providers including Anthropic) ─────────────────────

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
        // Handle both OpenAI-compatible (choices) and Anthropic (content_block_delta) SSE formats
        const token =
          ev.choices?.[0]?.delta?.content ??
          (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' ? ev.delta.text : null) ??
          '';
        if (token) onToken(token);
        if (ev.type === 'message_stop') { onDone?.(); return; }
      } catch { /* skip malformed */ }
    }
  }
  onDone?.();
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function callLLM({ systemPrompt, messages, model, maxTokens = 2000 }) {
  return proxyCall({ systemPrompt, messages, model, maxTokens });
}

export async function streamLLM({ systemPrompt, messages, model, maxTokens = 8192, onToken, onDone, signal }) {
  return proxyStream({ systemPrompt, messages, model, maxTokens, onToken, onDone, signal });
}

export const LLM_PROVIDER = PROVIDER;
