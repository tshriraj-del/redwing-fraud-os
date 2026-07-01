import { lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Bug } from 'lucide-react';

// Rule Studio: the whole rule lifecycle in one place. Rule Factory authors rules from
// coverage gaps, backtests, and governs the shadow→deploy path; RuleBreaker stress-tests
// a rule against evasions and hardens it. Two stages of one job (Adapt) — a rule you
// author here you stress-test here, without leaving.
const RuleFactory = lazy(() => import('./RuleFactory.jsx'));
const RuleBreaker = lazy(() => import('./RuleBreaker.jsx'));

const TABS = [
  { key: 'author', to: '/rules',       label: 'Author & Deploy',      icon: Sparkles,
    sub: 'Generate rules from gaps, backtest, shadow, deploy' },
  { key: 'stress', to: '/rulebreaker', label: 'Stress-test & Harden', icon: Bug,
    sub: 'Find how a rule is evaded, then harden it' },
];

export default function RuleStudio() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.includes('rulebreaker') ? 'stress' : 'author';

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
          {active === 'stress' ? <RuleBreaker /> : <RuleFactory />}
        </Suspense>
      </div>
    </div>
  );
}
