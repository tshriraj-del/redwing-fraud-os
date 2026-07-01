import { lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, FlaskConical } from 'lucide-react';

// Models: one place to inspect the detection model. The Real-Label tab is the model
// graded on real fraud labels (ULB) — the credibility anchor; the Synthetic Lab tab
// explores the synthetic-pipeline model and lets you score a transaction. Same page
// type, two datasets — merged so there aren't two near-identical "model" destinations.
const RealModel = lazy(() => import('./RealModel.jsx'));
const MLLab     = lazy(() => import('./MLLab.jsx'));

const TABS = [
  { key: 'real', to: '/real-model', label: 'Real-Label Model', icon: Database,
    sub: 'Validated on real fraud labels (ULB) — the credibility anchor' },
  { key: 'lab',  to: '/ml',         label: 'Synthetic Lab',    icon: FlaskConical,
    sub: 'Explore the synthetic-pipeline model and score a transaction' },
];

export default function Models() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith('/ml') ? 'lab' : 'real';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(({ key, to, label, icon: Icon, sub }) => {
          const on = active === key;
          return (
            <button key={key} onClick={() => navigate(to)} title={sub}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                background: 'transparent', border: 'none',
                padding: '8px 14px 12px', marginBottom: -1,
                borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                color: on ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: on ? 600 : 500, transition: 'all 0.15s ease',
              }}>
              <Icon size={15} style={{ color: on ? 'var(--accent)' : 'var(--text-muted)' }} />
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        }>
          {active === 'lab' ? <MLLab /> : <RealModel />}
        </Suspense>
      </div>
    </div>
  );
}
