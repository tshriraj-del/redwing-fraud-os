const TONES = {
  brand:   'var(--accent)',
  danger:  'var(--red)',
  success: 'var(--green)',
  warning: 'var(--yellow)',
  orange:  'var(--orange)',
  purple:  'var(--purple)',
  info:    'var(--blue)',
  neutral: 'var(--text-muted)',
};

export default function Badge({ tone = 'neutral', color, dot = true, children }) {
  const c = color || TONES[tone] || TONES.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, color: 'var(--text)',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      padding: '1px 6px', borderRadius: 4, letterSpacing: '0.02em',
      whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>
      {dot && (
        <span style={{
          width: 4, height: 4, borderRadius: '50%',
          background: c, flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
