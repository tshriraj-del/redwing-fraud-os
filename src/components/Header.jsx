import { useLocation } from 'react-router-dom';
import { Circle } from 'lucide-react';

const TITLES = {
  '/': 'Command Dashboard',
  '/org': 'RedWing Intelligence',
  '/ml': 'ML Detection Lab',
  '/operator': 'Monitor',
  '/rules':    'Rule Factory',
  '/network':  'Network Intel',
  '/sar':      'SAR Writer',
  '/systems': 'API Reference',
};

const SYSTEMS = [
  { label: 'FraudSense', ok: true },
  { label: 'RuleBreaker', ok: true },
  { label: 'SyntheticID', ok: true },
  { label: 'ML Detection', ok: true },
];

export default function Header() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'Fraud OS';

  return (
    <header
      style={{
        height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {SYSTEMS.map(({ label, ok }) => (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}
            title={`${label}: ${ok ? 'online' : 'offline'}`}
          >
            <div
              className={ok ? 'pulse-dot' : ''}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: ok ? 'var(--green)' : 'var(--red)',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
