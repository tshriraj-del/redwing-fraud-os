import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, FlaskConical,
  ChevronLeft, ChevronRight, Zap, Radar, Sparkles, GitFork, Code2, Bot, ShieldCheck, Gauge, ShieldAlert, Database, Boxes, Swords, Network, Lightbulb, ScanSearch,
} from 'lucide-react';
import { useState } from 'react';

// Nav grouped by the JOB the analyst is doing, not by the tech behind it.
// Each item carries a one-line function descriptor (native tooltip) so every tab
// explains itself on hover — no more guessing what a page does.
const SECTIONS = [
  {
    section: null,   // home — no header
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', desc: 'Program overview and where you land.' },
    ],
  },
  {
    section: 'Detect',
    caption: 'Score transactions in real time',
    items: [
      { to: '/operator',   icon: Radar,    label: 'Operator',    desc: 'Live scoring engine — 3-tier ML + graph, transaction by transaction.' },
      { to: '/network',    icon: GitFork,  label: 'Fraud Graph', desc: 'Fraud network graph — mule rings and shared-device clusters (within-bank).' },
      { to: '/real-model', icon: Database, label: 'Models', also: ['/ml'], desc: 'The detection model — real-label validation and the synthetic lab, in one place.' },
      { to: '/syntheticid',icon: Bot,      label: 'SyntheticID Agent', badge: 'AI', desc: 'Autonomous agent that scores injected transactions end to end.' },
    ],
  },
  {
    section: 'Investigate',
    caption: 'Work a case to a decision',
    items: [
      { to: '/investigate', icon: ShieldAlert,   label: 'Investigator', desc: 'Case workbench — evidence, the FraudSense copilot, and SAR filing all live here.' },
      { to: '/fraudsense',  icon: ScanSearch,    label: 'FraudSense',   desc: 'Investigate any pasted case or file — the LLM copilot, standalone.' },
      { to: '/intel',       icon: MessageSquare, label: 'Assistant',    desc: 'Ask questions across the fraud program in natural language.' },
    ],
  },
  {
    section: 'Assurance',
    caption: 'Trust and measure the model',
    items: [
      { to: '/observability', icon: Gauge,     label: 'Observability',       desc: 'Drift, training-serving skew, and live catch quality.' },
      { to: '/adversary',     icon: Swords,    label: 'Adversary Simulator', desc: 'Red-team the model — how much detection survives a competent attacker.' },
      { to: '/agent-env',     icon: Boxes,     label: 'Agent Eval',          desc: 'Evaluation environment — process and outcome verifiers for agents.' },
      { to: '/xai',           icon: Lightbulb, label: 'Explainability',      desc: 'Per-decision feature attributions behind each score.' },
    ],
  },
  {
    section: 'Adapt',
    caption: 'Close the loop',
    items: [
      { to: '/rules', icon: Sparkles, label: 'Rule Studio', badge: 'AI', also: ['/rulebreaker'], desc: 'The full rule lifecycle — author rules from gaps, then stress-test and harden them.' },
    ],
  },
  {
    section: 'Network & Privacy',
    caption: 'The cross-institution moat',
    items: [
      { to: '/consortium', icon: Network,     label: 'Consortium Network', desc: 'Catch mule rings that span banks — without any bank sharing customer data.' },
      { to: '/privacy',    icon: ShieldCheck, label: 'Privacy Lab',        desc: 'Differential privacy on the cross-user network signal.' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  // Manual active check so a bundled item stays lit across its tab routes
  // (e.g. Rule Studio highlights on both /rules and /rulebreaker).
  const isItemActive = (to, also = []) =>
    to === '/' ? pathname === '/' : (pathname === to || also.some(p => pathname === p));

  const linkStyle = (fontSize, isActive) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: collapsed ? '9px 14px' : '6px 12px',
    borderRadius: 8, textDecoration: 'none',
    color: isActive ? 'var(--accent-bright)' : 'var(--text-muted)',
    background: isActive ? 'var(--accent-dim)' : 'transparent',
    fontSize, fontWeight: isActive ? 600 : 400,
    transition: 'all 0.15s ease', whiteSpace: 'nowrap',
    overflow: 'hidden', justifyContent: collapsed ? 'center' : 'flex-start',
  });

  return (
    <aside
      style={{
        width: collapsed ? 56 : 224,
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
      <div style={{
        padding: collapsed ? '16px 14px' : '16px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        overflow: 'hidden', whiteSpace: 'nowrap', minHeight: 56,
      }}>
        <div style={{
          width: 28, height: 28,
          background: 'var(--accent)',
          borderRadius: 7, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <Zap size={14} color="#fff" />
        </div>
        {!collapsed && (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            RedWing
          </div>
        )}
      </div>

      {/* Grouped nav */}
      <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        {SECTIONS.map(({ section, caption, items }, i) => (
          <div key={section || 'home'} style={{ marginTop: section && !collapsed ? 6 : (section ? 8 : 0) }}>
            {section && !collapsed && (
              <div title={caption} style={{
                padding: '1px 12px 2px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.09em', textTransform: 'uppercase',
                color: 'var(--text-muted)', opacity: 0.55,
              }}>
                {section}
              </div>
            )}
            {section && collapsed && i > 0 && (
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px', opacity: 0.5 }} />
            )}
            {items.map(({ to, icon: Icon, label, badge, desc, also }) => (
              <NavLink key={to} to={to} end={to === '/'} title={desc} style={linkStyle(13, isItemActive(to, also))}>
                <Icon size={15} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>{label}</span>
                    {badge && (
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{badge}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Developer link - separated at bottom */}
      <div style={{ padding: '6px 6px 4px', borderTop: '1px solid var(--border)' }}>
        <NavLink to="/systems" title="Connector hub & API reference — integrations and endpoints." style={linkStyle(12, isItemActive('/systems'))}>
          <Code2 size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>API Reference</span>}
        </NavLink>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          margin: '0 6px 10px', padding: '8px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
