// RedWing - LLM + operator API layer.
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

// ML metrics - sourced from Operator /health (port 8000)
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

// Privacy-preserving cross-institution consortium - sourced from Operator /consortium/demo
export async function fetchConsortium() {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/consortium/demo`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Differential-privacy utility curve - sourced from Operator /privacy/curve
export async function fetchPrivacyCurve() {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/privacy/curve`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Training-serving skew analysis - sourced from Operator /observability/skew
export async function fetchObservability() {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/observability/skew`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Investigator case file - sourced from Operator /case/{transaction_id}
export async function fetchCase(transactionId) {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/case/${encodeURIComponent(transactionId)}`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Real fraud transaction IDs to seed the investigator queue - from Operator /alerts
export async function fetchAlertQueue(limit = 12) {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/alerts?limit=${limit}`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Real-data model validation report (ULB card fraud) - from Operator /payment/meta
export async function fetchPaymentMeta() {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/payment/meta`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Live inference through the real-data model - from Operator /score/payment
export async function scorePayment(features) {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/score/payment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features }), signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Agent-evaluation environment - spec + episode runner (Operator /env/*)
export async function fetchEnvSpec() {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/env/spec`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

export async function runEnvAll(transactionId) {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/env/run-all`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: transactionId }), signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Closed feedback loop - record an analyst disposition (Operator /feedback)
export async function postFeedback({ transactionId, label, recipientId, source = 'investigator' }) {
  if (!IS_LOCAL) return { recorded: false, demo: true };
  const res = await fetch(`${OPERATOR}/feedback`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: transactionId, label, recipient_id: recipientId, source }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}

// Adversary simulator - cheap-vs-costly evasion sweep (Operator /adversary/simulate)
export async function simulateAdversary(transactionId) {
  if (!IS_LOCAL) throw new Error('Operator unreachable');
  const res = await fetch(`${OPERATOR}/adversary/simulate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: transactionId }), signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('Operator unreachable');
  return res.json();
}
