// Shared configuration for the FraudSense UI.

export const MIN_INPUT_LENGTH = 30;

// Financial-crime typologies — RedWing is a banking/payments platform, so the
// taxonomy is payment/identity/laundering fraud, not marketplace trust & safety.
export const CASE_TYPES = [
  'Payment Fraud',
  'Account Takeover',
  'Authorized Push Payment Scam',
  'Identity Fraud',
  'Money Mule / Laundering',
  'First-Party / Dispute Fraud',
  'Other',
];

export const CONTEXT_FLAGS = [
  'New account (< 90 days)',
  'High-value transfer',
  'Cross-border / international',
  'New payee / recipient',
  'Prior fraud flags on account',
];

export const EXAMPLE_CASES = [
  {
    label: 'Card testing micro-auths',
    caseType: 'Payment Fraud',
    text: 'Card ending 4417 ran 34 authorizations of $0.50–$2.00 across 34 unique merchants in 8 minutes, all card-not-present, from a single IP. Cardholder is unaware and there is no prior activity on this card from this device.',
  },
  {
    label: 'Mule fan-out after inbound credit',
    caseType: 'Money Mule / Laundering',
    text: 'Account opened 41 days ago received a $9,400 inbound transfer, then within 20 minutes sent six outbound Zelle transfers of $1,500–$1,600 each to newly-added recipients across three different banks. The device was previously seen on two other flagged accounts.',
  },
  {
    label: 'ATO + wire to new payee',
    caseType: 'Account Takeover',
    text: "User's account was accessed from a new device in a foreign geo at 3am; email and password were changed immediately, the MFA device was swapped, then a $7,500 wire was initiated to a first-time payee.",
  },
];

// Enum-driven display helpers ------------------------------------------------

// All visual maps below reference the terminal CSS variables and are consumed
// via inline style props (color / borderColor / background).

// Signal strength → number of filled bars + severity color.
export const STRENGTH_META = {
  Strong: { bars: 3, color: 'var(--accent-red)' },
  Moderate: { bars: 2, color: 'var(--accent-amber)' },
  Weak: { bars: 1, color: 'var(--text-secondary)' },
};

// Category → accent color (Identity=blue, Device=purple, Behavioral=cyan,
// Payment=amber, Network=green, Velocity=red).
export const CATEGORY_COLOR = {
  Identity: { color: 'var(--accent-blue)', dim: 'var(--accent-blue-dim)' },
  Device: { color: 'var(--accent-purple)', dim: 'var(--accent-purple-dim)' },
  Behavioral: { color: 'var(--accent-cyan)', dim: 'var(--accent-cyan-dim)' },
  Payment: { color: 'var(--accent-amber)', dim: 'var(--accent-amber-dim)' },
  Network: { color: 'var(--accent-green)', dim: 'var(--accent-green-dim)' },
  Velocity: { color: 'var(--accent-red)', dim: 'var(--accent-red-dim)' },
};

// Confidence → meter fill percentage + color.
export const CONFIDENCE_METER = {
  Low: { pct: 33, color: 'var(--accent-amber)' },
  Medium: { pct: 66, color: 'var(--accent-amber)' },
  High: { pct: 100, color: 'var(--accent-green)' },
};

// Panel entrance / border-draw animation classes keyed by 1-based display order.
// Literal strings so Tailwind's content scanner retains them.
export const PANEL_ANIM = {
  1: 'animate-panel-1',
  2: 'animate-panel-2',
  3: 'animate-panel-3',
  4: 'animate-panel-4',
  5: 'animate-panel-5',
  6: 'animate-panel-6',
  7: 'animate-panel-7',
};
export const BORDER_ANIM = {
  1: 'animate-border-1',
  2: 'animate-border-2',
  3: 'animate-border-3',
  4: 'animate-border-4',
  5: 'animate-border-5',
  6: 'animate-border-6',
  7: 'animate-border-7',
};

// Risk severity → color + fill percentage for the score gauge.
export const SEVERITY_STYLE = {
  Critical: { color: 'var(--accent-red)', dim: 'var(--accent-red-dim)' },
  High: { color: 'var(--accent-amber)', dim: 'var(--accent-amber-dim)' },
  Medium: { color: 'var(--accent-blue)', dim: 'var(--accent-blue-dim)' },
  Low: { color: 'var(--accent-green)', dim: 'var(--accent-green-dim)' },
};

// Derive a severity band from a 0-100 score (fallback if the model omits it).
export function severityFromScore(score) {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

// Signal basis → Observed (stated fact) vs Inferred (analyst reasoning).
export const BASIS_STYLE = {
  Observed: { color: 'var(--accent-green)', dim: 'var(--accent-green-dim)' },
  Inferred: { color: 'var(--accent-purple)', dim: 'var(--accent-purple-dim)' },
};

// Recommended action → verdict label, accent color, and dim tint for the
// card-background gradient.
export const ACTION_STYLE = {
  Approve: { label: 'APPROVE', color: 'var(--accent-green)', dim: 'var(--accent-green-dim)' },
  Decline: { label: 'DECLINE', color: 'var(--accent-red)', dim: 'var(--accent-red-dim)' },
  Escalate: { label: 'ESCALATE', color: 'var(--accent-amber)', dim: 'var(--accent-amber-dim)' },
  Monitor: { label: 'MONITOR', color: 'var(--accent-blue)', dim: 'var(--accent-blue-dim)' },
};
