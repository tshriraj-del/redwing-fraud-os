// Riposte — LLM + operator API layer.
// All ML scoring goes through the Operator (port 8000).

import { callLLM, streamLLM } from './llm-provider.js';

export { streamLLM as streamMessage };
export { callLLM };

const OPERATOR = 'http://localhost:8000';

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
  const res = await fetch(`${OPERATOR}/health`);
  if (!res.ok) throw new Error('Operator unreachable');
  const data = await res.json();
  return data.model_metrics ?? {};
}

export async function fetchMLFeatures() {
  const res = await fetch(`${OPERATOR}/health`);
  if (!res.ok) throw new Error('Operator unreachable');
  const data = await res.json();
  return { features: data.features ?? [] };
}

export async function fetchMLDrift() {
  // Drift metrics are returned by /xai/governance
  const res = await fetch(`${OPERATOR}/xai/governance`);
  if (!res.ok) return { drift: null };
  return res.json();
}

export async function scoreTransactionML(tx) {
  const res = await fetch(`${OPERATOR}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}
