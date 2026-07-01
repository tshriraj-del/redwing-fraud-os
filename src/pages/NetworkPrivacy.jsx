import { lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Network as NetworkIcon, ShieldCheck } from 'lucide-react';

// Unified "Network & Privacy" destination: the cross-bank network and the differential
// privacy that makes it possible are one story, told in one place with two tabs.
// Tabs navigate to the real routes (/consortium, /privacy) so sidebar highlighting and
// deep links keep working; each tab is the existing, full page.
const ConsortiumNetwork = lazy(() => import('./ConsortiumNetwork.jsx'));
const PrivacyLab        = lazy(() => import('./PrivacyLab.jsx'));

const TABS = [
  { key: 'network', to: '/consortium', label: 'Cross-Bank Network', icon: NetworkIcon,
    sub: 'Catch mule rings that span banks' },
  { key: 'privacy', to: '/privacy',    label: 'Privacy Guarantee',  icon: ShieldCheck,
    sub: 'Differential privacy on the shared signal' },
];

export default function NetworkPrivacy() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.includes('privacy') ? 'privacy' : 'network';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Tab bar */}
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

      {/* Active tab body — the existing full page */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        }>
          {active === 'privacy' ? <PrivacyLab /> : <ConsortiumNetwork />}
        </Suspense>
      </div>
    </div>
  );
}
