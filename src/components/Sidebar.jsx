import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, FlaskConical,
  Network, ChevronLeft, ChevronRight, Zap, Radar, Sparkles, GitFork,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/org', icon: MessageSquare, label: 'RedWing Intel' },
  { to: '/ml', icon: FlaskConical, label: 'ML Detection Lab' },
  { to: '/operator', icon: Radar, label: 'Operator', badge: 'LIVE' },
  { to: '/rules', icon: Sparkles, label: 'Rule Factory', badge: 'AI' },
  { to: '/network', icon: GitFork, label: 'Network Intel', badge: 'NEW' },
  { to: '/systems', icon: Network, label: 'API Reference' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 56 : 220,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '16px 14px' : '16px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          minHeight: 56,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Zap size={14} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Fraud OS
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: 1 }}>
              AI COMMAND CENTER
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '9px 14px' : '9px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              color: isActive ? 'var(--accent-bright)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              justifyContent: collapsed ? 'center' : 'flex-start',
              position: 'relative',
            })}
          >
            <Icon size={15} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#22c55e',
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    padding: '1px 5px',
                    borderRadius: 4,
                    letterSpacing: '0.04em',
                  }}>
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          margin: '0 6px 10px',
          padding: '8px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
