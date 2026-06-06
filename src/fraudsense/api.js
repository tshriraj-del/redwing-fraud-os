// FraudSense — provider-agnostic LLM API client for the 4-stage investigation.
// For Anthropic: supports native image/PDF vision blocks.
// For other providers: text-only (image/PDF content is dropped, text files still work).
import { callLLM, LLM_PROVIDER } from '../llm-provider.js';

// Spec requested 'claude-sonnet-4-20250514', but that snapshot returns
// not_found_error on this account. 'claude-sonnet-4-6' is the current Sonnet 4
// and is what the sibling rulebreaker app uses. Swap back if access is restored.
const MODEL = 'claude-sonnet-4-6';
// Raised from 2500: the expanded schema (risk score, loss estimate,
// fact/assessment split, decision logic, per-signal basis) can exceed 2500
// output tokens on signal-heavy cases, truncating the JSON mid-response.
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are FraudSense, a senior fraud investigation copilot embedded in an analyst's triage console. You reason like a seasoned fraud/risk investigator across payments, account takeover, marketplace abuse, and identity fraud. Your output is auditable evidence used to action real accounts and refer cases — so calibration and intellectual honesty matter more than confident-sounding prose.

You run a rigorous investigation: extract signals, score risk, classify, estimate loss, separate fact from inference, reconstruct root cause, and recommend a data-grounded action.

EVIDENCE DISCIPLINE (most important):
- Distinguish what is OBSERVED (explicitly stated in the case material) from what is INFERRED (your reasoning). Tag every signal accordingly.
- NEVER present an inference as an established fact. Hedge inferences ("likely", "suggests", "consistent with").
- Do NOT assert a specific fraud-ring, "organized ring", "synthetic identity", "account takeover", or "stolen identity" conclusion unless the case contains DIRECT evidence for it. Shared devices, multiple suspended accounts, or multi-country logins indicate repeat/possibly-coordinated activity — they do NOT by themselves prove an organized ring or synthetic identities. Put such unproven theories in "hypotheses", not "classification".
- "secondary_type" must be null unless there is direct supporting evidence for a distinct second fraud type.
- Quantify. Never say "several thousand dollars" — give explicit numbers and ranges with a stated basis. Distinguish reported INCIDENTS from confirmed unique VICTIMS.
- Calibrate escalation. Recommend law-enforcement / cross-border / INTERPOL coordination ONLY when losses are large or jurisdictionally required; otherwise keep to internal + receiving-bank + platform steps.

CRITICAL OUTPUT RULES:
- Respond with ONE raw, valid JSON object and nothing else. No markdown fences, no preamble, no commentary.
- Use ONLY the enum values specified. Match capitalization exactly.`;

function buildPrompt(caseText, caseType, contextFlags, attachments = []) {
  const ctx = contextFlags && contextFlags.length
    ? `\nAnalyst-supplied context flags: ${contextFlags.join(', ')}.`
    : '';

  // Fold text-based attachments into the prompt; note image/PDF attachments so
  // the model knows to analyze the accompanying content blocks.
  const textFiles = attachments.filter((a) => a.kind === 'text');
  const mediaFiles = attachments.filter((a) => a.kind !== 'text');

  const textBlock = textFiles.length
    ? '\n\nAttached files (contents below):\n' +
      textFiles
        .map((a) => `--- FILE: ${a.name} ---\n${a.text}\n--- END FILE ---`)
        .join('\n\n')
    : '';

  const mediaNote = mediaFiles.length
    ? `\n\nThe analyst also attached ${mediaFiles.length} file(s) as ${mediaFiles
        .map((a) => `${a.name} (${a.kind})`)
        .join(', ')} — analyze the attached image/document content blocks as part of this case.`
    : '';

  const caseBody = caseText && caseText.trim()
    ? caseText
    : '(No free-text description provided — base the investigation on the attached files.)';

  return `Investigate the following fraud case.

Case Type (analyst-selected): ${caseType}
Case Description:
"""
${caseBody}
"""${ctx}${textBlock}${mediaNote}

Return a single JSON object matching this EXACT schema — no extra keys, no missing keys:

{
  "risk_score": {
    "score": 0,
    "severity": "Low | Medium | High | Critical",
    "factors": [
      { "name": "contributing factor", "weight": 0 }
    ]
  },
  "signals": [
    {
      "name": "short signal name, e.g. 'New account age'",
      "reason": "1-2 sentences on why this is suspicious in THIS case",
      "strength": "Weak | Moderate | Strong",
      "category": "Identity | Device | Behavioral | Payment | Network | Velocity",
      "basis": "Observed | Inferred"
    }
  ],
  "classification": {
    "primary_type": "most likely fraud type",
    "secondary_type": "second fraud type or null",
    "confidence": "Low | Medium | High",
    "reasoning": "2-3 sentences explaining the classification"
  },
  "loss_estimate": {
    "confirmed": "confirmed loss with figure, e.g. '$1,150 (one buyer)'",
    "likely_low": "low end of likely total exposure, e.g. '$8,000'",
    "likely_high": "high end, e.g. '$12,000'",
    "basis": "how the range was derived"
  },
  "fact_assessment": {
    "observed_facts": ["facts explicitly stated in the case material"],
    "assessments": ["analyst inferences you hold with reasonable confidence"],
    "hypotheses": ["unverified theories that need more evidence to confirm"]
  },
  "root_cause_analysis": {
    "attack_narrative": "what likely happened, in plain English",
    "entry_point": "how the fraud likely started",
    "blast_radius": "what is at risk if this is not actioned",
    "watch_for": "similar patterns to watch for going forward"
  },
  "recommendation": {
    "action": "Approve | Decline | Escalate | Monitor",
    "confidence": "Low | Medium | High",
    "reasoning": "3-4 sentences justifying the action",
    "decision_logic": ["data-grounded reasoning step that cites a specific signal, score, or figure"],
    "next_steps": ["step 1", "step 2", "step 3"],
    "escalation_path": "what to do if the analyst disagrees with the action"
  }
}

Requirements:
- "strength" must be exactly one of: "Weak", "Moderate", "Strong".
- "category" must be exactly one of: "Identity", "Device", "Behavioral", "Payment", "Network", "Velocity".
- "basis" must be exactly one of: "Observed", "Inferred". Use "Observed" only when the case material directly states the fact behind the signal.
- "confidence" must be exactly one of: "Low", "Medium", "High".
- "action" must be exactly one of: "Approve", "Decline", "Escalate", "Monitor".
- "risk_score.score" is an integer 0-100. "severity" bands: 0-39 Low, 40-64 Medium, 65-84 High, 85-100 Critical — keep them consistent.
- "risk_score.factors": 4-6 top contributors, integer "weight" points that approximately sum to the score. Do not cluster weights.
- "loss_estimate": always give explicit figures/ranges; if truly unknowable, say so in "basis" rather than inventing precision.
- "decision_logic": 3-5 concise, auditable steps, each referencing concrete evidence (a signal, the score, or a figure) — not vague prose.
- Provide exactly 3 items in "next_steps".
- Use null (not the string "null") for "secondary_type" when there is no direct evidence for a second type.
- Extract every distinct signal the material supports; do not pad with generic filler.`;
}

export async function investigateCase(caseText, caseType, contextFlags, attachments = []) {
  const promptText = buildPrompt(caseText, caseType, contextFlags, attachments);

  // Anthropic: send native vision/document blocks for image and PDF attachments.
  // Other providers: text-only (image/PDF blocks not supported — text files still work).
  if (LLM_PROVIDER === 'anthropic') {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env');

    const mediaBlocks = attachments
      .filter((a) => a.kind === 'image' || a.kind === 'document')
      .map((a) =>
        a.kind === 'image'
          ? { type: 'image', source: { type: 'base64', media_type: a.mediaType, data: a.data } }
          : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.data } }
      );

    const content = [...mediaBlocks, { type: 'text', text: promptText }];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      let message = `API request failed (${response.status})`;
      try { const err = await response.json(); if (err.error?.message) message = err.error.message; } catch {}
      throw new Error(message);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error('Empty response from the API.');
    return parseAnalysis(text);
  }

  // Non-Anthropic providers — text only via proxy
  const text = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    maxTokens: MAX_TOKENS,
  });
  return parseAnalysis(text);
}

// Tolerant JSON parsing: strip stray fences, then fall back to extracting the
// outermost object if the model wrapped it in prose.
function parseAnalysis(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error('Could not parse the API response as JSON. Please retry.');
  }
}
