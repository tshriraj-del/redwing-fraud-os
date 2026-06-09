// RedWing — LLM + operator API layer.
// All ML scoring goes through the Operator (port 8000).

import { callLLM, streamLLM } from './llm-provider.js';

export { streamLLM as streamMessage };
export { callLLM };

const OPERATOR = 'http://localhost:8000';

// On Vercel (HTTPS) the browser blocks http://localhost requests as mixed content.
// IS_LOCAL detects this and immediately fails all backend calls so demo mode kicks in.
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Non-streaming single call
export async function callOnce({ systemPrompt, userMessage, maxTokens = 1024 }) {
  return callLLM({
    systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
  });
}

// ML metrics — sourced from Operator /health (port 8000)
export async function fetchMLMetrics() {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/health`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('Operator unreachable');
  const data = await res.json();
  return data.model_metrics ?? {};
}

export async function fetchMLFeatures() {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/health`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('Operator unreachable');
  const data = await res.json();
  return { features: data.features ?? [] };
}

export async function fetchMLDrift() {
  if (!IS_LOCAL) return { drift: null };
  const res = await fetch(`${OPERATOR}/xai/governance`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) return { drift: null };
  return res.json();
}

export async function scoreTransactionML(tx) {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}
