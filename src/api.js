// Anthropic API — streaming messages for the AI Organization OS.

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

function getKey() {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env');
  return key;
}

// Stream a response, calling onToken for each text delta and onDone when complete.
export async function streamMessage({ systemPrompt, messages, onToken, onDone, signal }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    let msg = `API error (${response.status})`;
    try { const e = await response.json(); if (e.error?.message) msg = e.error.message; } catch {}
    throw new Error(msg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep potentially incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') { onDone?.(); return; }
      try {
        const event = JSON.parse(data);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          onToken(event.delta.text);
        }
      } catch {}
    }
  }

  onDone?.();
}

// REDWING ML Server — real model inference (port 8001)
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

// Non-streaming call for single responses (ML scorer).
export async function callOnce({ systemPrompt, userMessage }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    let msg = `API error (${response.status})`;
    try { const e = await response.json(); if (e.error?.message) msg = e.error.message; } catch {}
    throw new Error(msg);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() ?? '';
}
