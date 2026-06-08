import { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const OPERATOR = 'http://localhost:8000';

// ── Demo graph generator (shown when backend is offline) ──────────────────────
// Seeded PRNG so the graph is deterministic across reloads

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function buildDemoGraph() {
  const rng = mulberry32(0xDEADBEEF);
  const typologies = ['pig_butchering', 'ai_powered_ato', 'deepfake_social_engineering', 'card_testing_bot', 'synthetic_identity', 'app_scam'];

  const nodes = [];
  const links = [];
  const seen = new Set();

  function addLink(s, t, amount, count) {
    const key = `${s}|${t}`;
    if (s === t || seen.has(key)) return;
    seen.add(key);
    links.push({ source: s, target: t, amount, count });
  }

  // ── Devices (42 total: 32 shared, 10 private) ─────────────────────────────
  const deviceIds = [];
  for (let i = 0; i < 42; i++) {
    const shared = i < 32;
    const fc = shared ? Math.floor(rng() * 18) + 4 : Math.floor(rng() * 2);
    const id = `d${String(i).padStart(3, '0')}`;
    deviceIds.push(id);
    nodes.push({ id, type: 'device', label: `dev_${['ios','android','chrome','firefox','headless'][i % 5]}_${id.slice(1)}`, fraud_count: fc, shared_device: shared, shared_users: shared ? Math.floor(rng() * 12) + 3 : 1, tx_count: Math.floor(rng() * 60) + (shared ? 20 : 3) });
  }

  // ── Mule recipients (48 total: 38 mule, 10 clean) ─────────────────────────
  const recipientIds = [];
  for (let i = 0; i < 48; i++) {
    const mule = i < 38;
    const fc = mule ? Math.floor(rng() * 22) + 5 : 0;
    const id = `r${String(i).padStart(3, '0')}`;
    recipientIds.push(id);
    nodes.push({ id, type: 'recipient', label: `recv_${['overseas','crypto','shell','wire','exchange'][i % 5]}_${id.slice(1)}`, fraud_count: fc, mule_flag: mule, tx_count: Math.floor(rng() * 40) + (mule ? 15 : 2) });
  }

  // ── User accounts (270 total: 160 fraud, 110 clean) ───────────────────────
  const userIds = [];
  for (let i = 0; i < 270; i++) {
    const isFraud = i < 160;
    const typo = isFraud ? typologies[Math.floor(rng() * typologies.length)] : 'none';
    const fc = isFraud ? Math.floor(rng() * 14) + 1 : 0;
    const id = `u${String(i).padStart(4, '0')}`;
    userIds.push(id);
    nodes.push({ id, type: 'user', label: `acc_${id}`, fraud_count: fc, tx_count: Math.floor(rng() * 30) + (isFraud ? 8 : 2), typology: typo, fraud_score: isFraud ? +(0.55 + rng() * 0.44).toFixed(3) : +(rng() * 0.25).toFixed(3) });
  }

  // ── Edges: each fraud user → 1-3 devices ──────────────────────────────────
  for (let i = 0; i < 160; i++) {
    const uid = userIds[i];
    const numDev = Math.floor(rng() * 3) + 1;
    for (let k = 0; k < numDev; k++) {
      const did = deviceIds[Math.floor(rng() * 32)]; // shared devices only
      addLink(uid, did, Math.floor(rng() * 8000) + 200, Math.floor(rng() * 10) + 1);
    }
  }
  // Clean users → private devices
  for (let i = 160; i < 270; i++) {
    const uid = userIds[i];
    const did = deviceIds[32 + Math.floor(rng() * 10)];
    addLink(uid, did, Math.floor(rng() * 500) + 20, Math.floor(rng() * 3) + 1);
  }

  // ── Edges: fraud users → mule recipients ─────────────────────────────────
  for (let i = 0; i < 160; i++) {
    const uid = userIds[i];
    const numRecip = Math.floor(rng() * 4) + 1;
    for (let k = 0; k < numRecip; k++) {
      const rid = recipientIds[Math.floor(rng() * 38)];
      addLink(uid, rid, Math.floor(rng() * 20000) + 500, Math.floor(rng() * 8) + 1);
    }
  }

  // ── Edges: user→user transfers within fraud rings ─────────────────────────
  for (let i = 0; i < 120; i++) {
    const a = userIds[Math.floor(rng() * 160)];
    const b = userIds[Math.floor(rng() * 160)];
    addLink(a, b, Math.floor(rng() * 3000) + 100, Math.floor(rng() * 4) + 1);
  }

  // ── Edges: shared devices → mule recipients (ring hub pattern) ────────────
  for (let i = 0; i < 32; i++) {
    const numR = Math.floor(rng() * 3) + 1;
    for (let k = 0; k < numR; k++) {
      const rid = recipientIds[Math.floor(rng() * 38)];
      addLink(deviceIds[i], rid, Math.floor(rng() * 15000) + 1000, Math.floor(rng() * 12) + 2);
    }
  }

  const fraudNodes = nodes.filter(n => n.fraud_count > 0).length;
  const muleCount = nodes.filter(n => n.mule_flag).length;
  const sharedCount = nodes.filter(n => n.shared_device).length;

  return {
    nodes, links,
    stats: { total_nodes: nodes.length, total_edges: links.length, fraud_edges: links.filter(l => {
      const src = nodes.find(n => n.id === l.source);
      return src && src.fraud_count > 0;
    }).length, mule_accounts: muleCount, shared_devices: sharedCount, typology_count: typologies.length },
    typologies,
  };
}

const { nodes: _DN, links: _DL, stats: DEMO_STATS, typologies: DEMO_TYPOLOGIES } = buildDemoGraph();

const NODE_COLORS = {
  user:      { base: '#38bdf8', fraud: '#f87171', muted: '#1e4060' },
  device:    { base: '#4ade80', fraud: '#fb923c', shared: '#f59e0b', muted: '#1a3a2a' },
  recipient: { base: '#c084fc', fraud: '#f85149', mule: '#ef4444',  muted: '#3b1f5e' },
};

const TYPOLOGY_COLORS = {
  synthetic_identity:        '#c084fc',
  ai_powered_ato:            '#f59e0b',
  deepfake_social_engineering:'#f87171',
  pig_butchering:            '#fb923c',
  app_scam:                  '#38bdf8',
  card_testing_bot:          '#4ade80',
  none:                      '#64748b',
};

function nodeColor(node) {
  if (node.type === 'device') {
    if (node.shared_device) return NODE_COLORS.device.shared;
    return node.fraud_count > 0 ? NODE_COLORS.device.fraud : NODE_COLORS.device.base;
  }
  if (node.type === 'recipient') {
    if (node.mule_flag) return NODE_COLORS.recipient.mule;
    return node.fraud_count > 0 ? NODE_COLORS.recipient.fraud : NODE_COLORS.recipient.base;
  }
  // user
  return node.fraud_count > 0 ? NODE_COLORS.user.fraud : NODE_COLORS.user.base;
}

function nodeSize(node) {
  if (node.type === 'device' && node.shared_device) return 8 + node.shared_users * 1.5;
  if (node.type === 'recipient' && node.mule_flag)   return 10 + node.fraud_count * 0.4;
  const base = node.type === 'user' ? 5 : node.type === 'device' ? 4 : 6;
  return base + Math.min(node.tx_count * 0.3, 6);
}

function StatChip({ label, value, color = 'var(--text-muted)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</span>
    </div>
  );
}

export default function Network() {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dims, setDims] = useState({ w: 800, h: 600 });

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState(null);
  const [typologies, setTypologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTypology, setSelectedTypology] = useState('');
  const [fraudOnly, setFraudOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [showDevices, setShowDevices] = useState(true);

  // Selection
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        fraud_only:  fraudOnly,
        min_score:   minScore,
        limit_nodes: 300,
        ...(selectedTypology ? { typology: selectedTypology } : {}),
      });
      const [gRes, tRes] = await Promise.all([
        fetch(`${OPERATOR}/network/graph?${params}`),
        fetch(`${OPERATOR}/network/typologies`),
      ]);
      const gData = await gRes.json();
      const tData = await tRes.json();

      // Filter out device nodes if toggle off
      let nodes = gData.nodes || [];
      let links = gData.links || [];
      if (!showDevices) {
        const deviceIds = new Set(nodes.filter(n => n.type === 'device').map(n => n.id));
        nodes = nodes.filter(n => n.type !== 'device');
        links = links.filter(l => !deviceIds.has(l.source?.id ?? l.source) && !deviceIds.has(l.target?.id ?? l.target));
      }

      setGraphData({ nodes, links });
      setStats(gData.stats);
      setTypologies(tData || []);
    } catch (e) {
      // Backend offline — use generated demo graph
      let nodes = _DN;
      let links = _DL;
      if (!showDevices) {
        const deviceIds = new Set(nodes.filter(n => n.type === 'device').map(n => n.id));
        nodes = nodes.filter(n => n.type !== 'device');
        links = links.filter(l => !deviceIds.has(l.source) && !deviceIds.has(l.target));
      }
      setGraphData({ nodes, links });
      setStats(DEMO_STATS);
      setTypologies(DEMO_TYPOLOGIES);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [fraudOnly, minScore, selectedTypology, showDevices]);

  useEffect(() => { load(); }, [load]);

  // Draw custom nodes
  const paintNode = useCallback((node, ctx, globalScale) => {
    const r    = nodeSize(node);
    const col  = nodeColor(node);
    const x    = node.x ?? 0;
    const y    = node.y ?? 0;

    ctx.beginPath();
    if (node.type === 'device') {
      ctx.rect(x - r, y - r, r * 2, r * 2);
    } else if (node.type === 'recipient') {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r * 0.6);
      ctx.lineTo(x - r, y + r * 0.6);
      ctx.closePath();
    } else {
      ctx.arc(x, y, r, 0, 2 * Math.PI);
    }

    // Glow for flagged nodes
    if (node.shared_device || node.mule_flag || node.fraud_count > 0) {
      ctx.shadowColor = col;
      ctx.shadowBlur  = 10;
    }
    ctx.fillStyle = col + (node === hoveredNode ? 'ff' : 'cc');
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ring for selected
    if (node === selectedNode) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5 / globalScale;
      ctx.stroke();
    }

    // Label at close zoom
    if (globalScale > 2.5 || node === hoveredNode || node === selectedNode) {
      const label = node.label.length > 12 ? node.label.slice(0, 10) + '…' : node.label;
      ctx.font         = `${11 / globalScale}px JetBrains Mono, monospace`;
      ctx.fillStyle    = '#fff';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + r + 8 / globalScale);
    }
  }, [hoveredNode, selectedNode]);

  const linkColor = useCallback((link) => {
    if (link.is_fraud) return 'rgba(248,113,113,0.5)';
    return 'rgba(100,116,139,0.15)';
  }, []);

  const linkWidth = useCallback((link) => link.is_fraud ? 1.5 : 0.5, []);

  const activeNode = hoveredNode || selectedNode;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* Top bar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: 20, marginRight: 8 }}>
            <StatChip label="Nodes"    value={stats.total_nodes}     />
            <StatChip label="Edges"    value={stats.total_edges}     />
            <StatChip label="Fraud"    value={stats.fraud_edges}     color="var(--red)" />
            <StatChip label="Shared Devices" value={stats.shared_devices} color="var(--yellow)" />
            <StatChip label="Mule Accounts"  value={stats.mule_accounts}  color="#f85149" />
          </div>
        )}

        <div style={{ height: 28, width: 1, background: 'var(--border)', flexShrink: 0 }} />

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

          {/* Typology */}
          <select
            value={selectedTypology}
            onChange={e => setSelectedTypology(e.target.value)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: selectedTypology ? TYPOLOGY_COLORS[selectedTypology] || 'var(--text)' : 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">All typologies</option>
            {typologies.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Fraud only toggle */}
          <button
            onClick={() => setFraudOnly(f => !f)}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: `1px solid ${fraudOnly ? 'rgba(248,113,113,0.5)' : 'var(--border)'}`, background: fraudOnly ? 'rgba(248,113,113,0.1)' : 'var(--bg-surface)', color: fraudOnly ? '#f87171' : 'var(--text-muted)', cursor: 'pointer', fontWeight: fraudOnly ? 600 : 400 }}
          >
            Fraud only
          </button>

          {/* Min score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Min score</span>
            <input
              type="range" min={0} max={0.9} step={0.1}
              value={minScore}
              onChange={e => setMinScore(parseFloat(e.target.value))}
              style={{ width: 72, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', minWidth: 28 }}>{minScore.toFixed(1)}</span>
          </div>

          {/* Show devices */}
          <button
            onClick={() => setShowDevices(d => !d)}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: `1px solid ${showDevices ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`, background: showDevices ? 'rgba(74,222,128,0.08)' : 'var(--bg-surface)', color: showDevices ? '#4ade80' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Devices
          </button>

          <button onClick={load} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Graph + sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Graph canvas */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'rgba(0,0,0,0.4)', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Building network graph…</span>
            </div>
          )}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 10, padding: '20px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#f85149', marginBottom: 8 }}>{error}</div>
                <button onClick={load} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 14px', cursor: 'pointer' }}>Retry</button>
              </div>
            </div>
          )}

          {!loading && !error && graphData.nodes.length > 0 && (
            <ForceGraph2D
              ref={fgRef}
              width={dims.w}
              height={dims.h}
              graphData={graphData}
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => 'replace'}
              linkColor={linkColor}
              linkWidth={linkWidth}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={link => link.is_fraud ? 2 : 0}
              linkDirectionalParticleColor={link => link.is_fraud ? '#f87171' : 'transparent'}
              linkDirectionalParticleSpeed={0.005}
              onNodeHover={node => setHoveredNode(node || null)}
              onNodeClick={node => setSelectedNode(s => s === node ? null : node)}
              backgroundColor="#0a0c14"
              cooldownTicks={120}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          )}
          {!loading && !error && graphData.nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 28 }}>○</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No nodes match current filters</span>
            </div>
          )}
        </div>

        {/* Legend + node inspector */}
        <div style={{ width: 220, borderLeft: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

          {/* Node inspector */}
          {activeNode ? (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Node Inspector</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: activeNode.type === 'user' ? '50%' : activeNode.type === 'device' ? 2 : 0, background: nodeColor(activeNode), flexShrink: 0, transform: activeNode.type === 'recipient' ? 'rotate(45deg)' : 'none' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', wordBreak: 'break-all' }}>{activeNode.label}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  ['Type',         activeNode.type],
                  ['Transactions', activeNode.tx_count],
                  ['Fraud txns',   activeNode.fraud_count, activeNode.fraud_count > 0 ? '#f87171' : undefined],
                  ['Max ML score', activeNode.max_score?.toFixed(4)],
                  activeNode.typology && activeNode.typology !== 'none' ? ['Typology', activeNode.typology.replace(/_/g, ' ')] : null,
                  activeNode.shared_device ? ['Shared by', `${activeNode.shared_users} users`, '#f59e0b'] : null,
                  activeNode.mule_flag ? ['Flag', 'Potential mule', '#ef4444'] : null,
                ].filter(Boolean).map(([label, value, color]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>{label}</div>
                    <div style={{ fontSize: 12, color: color || 'var(--text)', fontFamily: label === 'Type' || label === 'Typology' ? 'inherit' : 'JetBrains Mono, monospace', fontWeight: color ? 600 : 400 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Node Inspector</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>Click any node to inspect it. Hover to preview.</div>

              <div style={{ marginTop: 14, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tips</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Orange squares', 'Shared device — same hardware across 3+ users'],
                  ['Red triangles', 'Mule recipient — 5+ fraud transactions received'],
                  ['Red particles', 'Fraud transaction flow'],
                ].map(([label, tip]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tip}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { shape: 'circle',   color: '#38bdf8', label: 'User (clean)' },
                { shape: 'circle',   color: '#f87171', label: 'User (fraud)' },
                { shape: 'square',   color: '#4ade80', label: 'Device' },
                { shape: 'square',   color: '#f59e0b', label: 'Shared device' },
                { shape: 'diamond',  color: '#c084fc', label: 'Recipient' },
                { shape: 'diamond',  color: '#ef4444', label: 'Mule account' },
              ].map(({ shape, color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 9, height: 9, flexShrink: 0,
                    background: color,
                    borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? 2 : 0,
                    transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
