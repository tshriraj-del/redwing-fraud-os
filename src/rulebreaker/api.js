import { callLLM } from '../llm-provider.js';

const SYSTEM_PROMPT = `You are a senior fraud detection security expert with deep experience in adversarial rule analysis and red-teaming fraud systems. Your job is to analyze fraud detection rules from an attacker's perspective with precision and realism.

CRITICAL INSTRUCTION: Respond ONLY with a raw, valid JSON object. No markdown code fences, no preamble, no explanation, no trailing text. Just the JSON.`;

const VECTOR_SYSTEM_PROMPT = `You are a senior fraud analyst and rule engineer. You will receive raw transaction vectors flagged as suspicious by a live detection system. Your job is to find what these transactions share, identify the specific signals that define this pattern, and synthesize detection rules derived from that data alone - not from general fraud knowledge.

CRITICAL INSTRUCTION: Respond ONLY with a raw, valid JSON object. No markdown code fences, no preamble, no explanation, no trailing text. Just the JSON.`;

function buildPrompt(rule, category) {
  return `Analyze this fraud detection rule from an adversarial perspective:

Rule Category: ${category}
Rule: ${rule}

Produce a rigorous adversarial analysis. Your response must be a single JSON object matching this exact schema - no deviations:

{
  "evasion_patterns": [
    {
      "name": "short descriptive name for the attack pattern",
      "description": "2-3 sentences on how an attacker executes this bypass specifically against this rule",
      "difficulty": "Easy",
      "detectability": "Low"
    }
  ],
  "resilience_score": {
    "overall": 0,
    "coverage": 0,
    "precision": 0,
    "evasion_resistance": 0,
    "signal_stability": 0,
    "verdict": "Exactly 2 sentences. First sentence on the rule's primary strength. Second on its most critical vulnerability."
  },
  "hardening_recommendations": [
    {
      "recommendation": "specific change to make to the rule or surrounding system",
      "rationale": "why this closes the identified gap",
      "tradeoff": "the risk, operational cost, or false-positive concern to watch"
    }
  ]
}

Requirements:
- difficulty values must be exactly one of: "Easy", "Medium", "Hard"
- detectability values must be exactly one of: "Low", "Medium", "High" (High = easily caught by other signals, which is better for defenders)
- Generate exactly 6 to 8 evasion_patterns
- Generate exactly 4 hardening_recommendations
- All numeric scores are integers 0-100 reflecting genuine analysis - do not cluster them near 50
- Be specific and realistic to the rule category (${category})`;
}

function buildVectorPrompt(vectors) {
  return `Here are flagged transaction vectors from a live fraud detection system:

${vectors}

Analyze these vectors and generate detection rules based strictly on what you observe in this data.

Return this exact JSON structure:

{
  "pattern_analysis": {
    "summary": "2-3 sentences describing what these transactions share and why they are anomalous",
    "key_signals": [
      {
        "feature": "name of the feature or signal observed",
        "observation": "the specific value, range, or behavior you see in this data",
        "significance": "High"
      }
    ],
    "attack_hypothesis": "1 sentence on what type of fraud or abuse this pattern most likely represents"
  },
  "generated_rules": [
    {
      "rule": "plain English detection rule derived directly from this pattern",
      "category": "Payment Fraud",
      "rationale": "1 sentence on why this rule catches the observed pattern"
    }
  ]
}

Requirements:
- Generate exactly 2 to 3 rules in generated_rules
- Rules must be specific to the signals present in this data - not generic fraud rules
- significance values must be exactly: "High", "Medium", or "Low"
- category values must be one of: "Account Abuse", "Payment Fraud", "Seller Fraud", "Returns Abuse", "ATO", "Other"
- Each rule must be directly derivable from the data you are given`;
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new Error('Could not parse the API response as JSON. Please try again.');
  }
}

export async function analyzeRule(rule, category) {
  const text = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(rule, category) }],
    maxTokens: 2000,
  });
  return parseJSON(text);
}

export async function generateRulesFromVectors(vectors) {
  const text = await callLLM({
    systemPrompt: VECTOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildVectorPrompt(vectors) }],
    maxTokens: 2000,
  });
  return parseJSON(text);
}
