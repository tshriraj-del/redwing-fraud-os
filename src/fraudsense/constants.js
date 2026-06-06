// Shared configuration for the FraudSense UI.

export const MIN_INPUT_LENGTH = 30;

export const CASE_TYPES = [
  'Payment Fraud',
  'Account Takeover',
  'Seller Abuse',
  'Buyer Abuse',
  'Identity Fraud',
  'Returns Abuse',
  'Other',
];

export const CONTEXT_FLAGS = [
  'First-time buyer',
  'High-value order',
  'International transaction',
  'New seller account',
  'Previous flags on this account',
];

export const EXAMPLE_CASES = [
  {
    label: 'New account, prepaid card, geo mismatch',
    caseType: 'Payment Fraud',
    text: 'New account registered 2 hours ago, placed $847 order, shipping to a different state than billing, used a prepaid Visa, email domain is 10 minutes old.',
  },
  {
    label: 'Seller review ring',
    caseType: 'Seller Abuse',
    text: 'Seller account with 200+ listings suddenly receiving 5-star reviews from 12 accounts all created within the same week, all buyers have zero purchase history.',
  },
  {
    label: 'ATO + gift card cash-out',
    caseType: 'Account Takeover',
    text: "User's account was accessed from a new device in Vietnam at 3am, immediately changed email and password, then initiated 3 high-value gift card purchases.",
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
