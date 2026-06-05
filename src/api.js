// RedWing Intelligence — LLM + ML server API layer.
// LLM calls are provider-agnostic via llm-provider.js.

import { callLLM, streamLLM } from './llm-provider.js';

export { streamLLM as streamMessage };
export { callLLM };

// Non-streaming single call (used by ML scorer).
export async function callOnce({ systemPrompt, userMessage, maxTokens = 1024 }) {
  return callLLM({
    systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
  });
}

// RedWing ML Server — real model inference (port 8001)
const ML_SERVER = 'http://localhost:8001';

export async function fetchMLMetrics() {
  const res = await fetch(`${ML_SERVER}/metrics`);
  if (!res.ok) throw new Error('ML server unreachable');
  return res.json();
}

export async function fetchMLFeatures() {
  const res = await fetch(`${ML_SERVER}/features`);
  if (!res.ok) throw new Error('ML server unreachable');
  return res.json();
}

export async function fetchMLDrift(days = 30) {
  const res = await fetch(`${ML_SERVER}/drift?days=${days}`);
  if (!res.ok) throw new Error('ML server unreachable');
  return res.json();
}

export async function scoreTransactionML(tx) {
  const res = await fetch(`${ML_SERVER}/score/quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
  if (!res.ok) throw new Error('ML server unreachable');
  return res.json();
}
