// Suite-style panel header - mirrors the Card header used across the RedWing
// command center (Investigator, Observability): a small accent icon + a mixed-case
// bold title, with an optional right-hand slot for a badge/pill.
export default function PanelHead({ icon: Icon, title, accent = 'var(--accent)', right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      {Icon && <Icon size={13} style={{ color: accent, flexShrink: 0 }} />}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>{title}</div>
      {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
    </div>
  );
}
