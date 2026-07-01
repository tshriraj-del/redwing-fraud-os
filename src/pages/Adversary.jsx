import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot,
} from 'recharts';
import { Swords, Play, ShieldX, ShieldCheck, ShieldAlert } from 'lucide-react';
import { simulateAdversary } from '../api.js';

const CHEAP = 'var(--yellow)';   // free to the adversary
const COSTLY = 'var(--blue)';  // requires real resources
const ROSE = 'var(--red)';

const SEEDS = [
  { id: 'txn_001819', typ: 'APP scam' },
  { id: 'txn_004142', typ: 'Deepfake SE' },
  { id: 'txn_011450', typ: 'Pig butchering' },
  { id: 'txn_014943', typ: 'Card testing' },
  { id: 'txn_021406', typ: 'AI ATO' },
];

// ── Demo fallback (Vercel / operator-down) - a verified FRAGILE APP-scam sweep ──
const FALLBACK = {
  transaction_id: 'txn_001819', typology: 'APP_scam', rail: 'Zelle',
  baseline_score: 99.5, action_threshold: 45.0, cheap_only_score: 27.8, share_lost_to_cheap: 0.721,
  verdict: 'FRAGILE',
  headline: 'Free moves alone drop detection 100 -> 28 (72% of the score), below the action threshold. The model was catching a sloppy adversary, not the fraud.',
  crossed_at: { step: 4, move: "Use the victim's usual rail", cost: 'cheap' },
  decay_curve: [
    { step: 0, move: 'seed (caught)', cost: '-', score: 99.5, actioned: true },
    { step: 1, move: 'Avoid round / threshold amounts', cost: 'cheap', score: 99.5, actioned: true },
    { step: 2, move: "Shape amount to the victim's baseline", cost: 'cheap', score: 96.4, actioned: true },
    { step: 3, move: 'Transact during normal hours', cost: 'cheap', score: 97.5, actioned: true },
    { step: 4, move: "Use the victim's usual rail", cost: 'cheap', score: 27.8, actioned: false },
    { step: 5, move: 'Use an aged account', cost: 'costly', score: 0.0, actioned: false },
    { step: 6, move: 'Route through an established payee', cost: 'costly', score: 0.0, actioned: false },
    { step: 7, move: 'Use a recognised device', cost: 'costly', score: 0.0, actioned: false },
    { step: 8, move: 'Throttle velocity (slow and low)', cost: 'costly', score: 0.0, actioned: false },
  ],
  ablation: [
    { id: 'established_recipient', label: 'Route through an established payee', cost: 'costly', drop: 99.5, score: 0.0 },
    { id: 'aged_account', label: 'Use an aged account', cost: 'costly', drop: 94.6, score: 5.0 },
    { id: 'use_preferred_rail', label: "Use the victim's usual rail", cost: 'cheap', drop: 3.2, score: 96.3 },
    { id: 'match_amount_baseline', label: "Shape amount to the victim's baseline", cost: 'cheap', drop: 3.1, score: 96.4 },
    { id: 'normal_hour', label: 'Transact during normal hours', cost: 'cheap', drop: 0.2, score: 99.4 },
    { id: 'avoid_round_amounts', label: 'Avoid round / threshold amounts', cost: 'cheap', drop: 0.0, score: 99.5 },
    { id: 'recognised_device', label: 'Use a recognised device', cost: 'costly', drop: 0.0, score: 99.5 },
    { id: 'throttle_velocity', label: 'Throttle velocity (slow and low)', cost: 'costly', drop: -0.4, score: 99.9 },
  ],
};

const VERDICT_STYLE = {
  FRAGILE:   { color: 'var(--red)', icon: ShieldX,     note: 'cheap moves alone defeat detection' },
  RESILIENT: { color: 'var(--green)', icon: ShieldCheck, note: 'only costly, provenance-backed moves evade' },
  PARTIAL:   { color: 'var(--yellow)', icon: ShieldAlert, note: 'leans on cheap signals but survives near the line' },
};

function CostDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null) return null;
  const c = payload.cost === 'cheap' ? CHEAP : payload.cost === 'costly' ? COSTLY : 'var(--text-muted)';
  return <Dot cx={cx} cy={cy} r={4} fill={c} stroke="var(--bg-surface)" strokeWidth={1.5} />;
}

function CurveTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', fontSize: 11, maxWidth: 220 }}>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{d.move}</div>
      <div style={{ color: 'var(--text-muted)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
        score {d.score} · {d.cost !== '-' ? d.cost : 'baseline'} · {d.actioned ? 'still flagged' : 'evaded'}
      </div>
    </div>
  );
}

export default function Adversary() {
  const [d, setD] = useState(FALLBACK);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState('txn_001819');

  const run = useCallback(async (id) => {
    setLoading(true); setSeed(id);
    try { const r = await simulateAdversary(id); setD(r); setLive(true); }
    catch { setLive(false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { run('txn_001819'); }, [run]);

  const vs = VERDICT_STYLE[d.verdict] || VERDICT_STYLE.PARTIAL;
  const VIcon = vs.icon;
  const maxDrop = Math.max(...d.ablation.map(a => Math.abs(a.drop)), 1);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Swords size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Adversary Simulator</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>How much detection survives a competent attacker, and what it actually costs them</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--green)' : live === false ? 'var(--yellow)' : 'var(--text-muted)' }} />
          {live === null ? 'Connecting…' : live ? 'Live · /adversary' : 'Demo · verified sweep'}
        </div>
      </div>

      {/* seed picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seed fraud</span>
        {SEEDS.map(s => (
          <button key={s.id} onClick={() => run(s.id)} disabled={loading}
            style={{ fontSize: 11, fontWeight: 600, color: seed === s.id ? 'var(--accent)' : 'var(--text-muted)', background: seed === s.id ? 'var(--accent-dim)' : 'var(--bg-surface)', border: seed === s.id ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {seed === s.id && loading ? <Play size={11} className="spin" /> : null}{s.typ}
          </button>
        ))}
      </div>

      {/* verdict banner */}
      <div style={{ background: 'var(--bg-surface)', border: `1px solid ${vs.color}`, borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <VIcon size={26} style={{ color: vs.color }} />
          <div style={{ fontSize: 13, fontWeight: 800, color: vs.color, marginTop: 4, letterSpacing: '0.02em' }}>{d.verdict}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>{d.headline}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>baseline <b style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{d.baseline_score}</b></span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>after free moves <b style={{ color: d.cheap_only_score < d.action_threshold ? 'var(--red)' : 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{d.cheap_only_score}</b></span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>lost to free moves <b style={{ color: CHEAP, fontFamily: 'JetBrains Mono, monospace' }}>{(d.share_lost_to_cheap * 100).toFixed(0)}%</b></span>
            {d.crossed_at && <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>evaded at <b style={{ color: d.crossed_at.cost === 'cheap' ? CHEAP : COSTLY }}>{d.crossed_at.move} ({d.crossed_at.cost})</b></span>}
          </div>
        </div>
      </div>

      {/* decay curve + ablation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16 }}>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Detection decay (cheapest moves first)</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>
            <span style={{ color: CHEAP }}>● free moves</span> applied first, then <span style={{ color: COSTLY }}>● costly moves</span>. Dashed line is the action threshold; below it the fraud passes.
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={d.decay_curve} margin={{ top: 8, right: 10, bottom: 4, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="step" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CurveTip />} />
              <ReferenceLine y={d.action_threshold} stroke="var(--text-muted)" strokeDasharray="5 4" label={{ value: 'threshold', position: 'insideTopRight', fill: 'var(--text-muted)', fontSize: 9 }} />
              <Line type="monotone" dataKey="score" stroke={ROSE} strokeWidth={2} dot={<CostDot />} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Per-move impact (applied alone)</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>Score drop from a single evasion. Cost tells you what the attacker pays.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.ablation.map(a => {
              const c = a.cost === 'cheap' ? CHEAP : COSTLY;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</span>
                  <div style={{ width: 70, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: `${Math.max(0, (a.drop / maxDrop) * 100)}%`, height: '100%', background: c }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', width: 38, textAlign: 'right' }}>-{a.drop.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* thesis */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <b style={{ color: 'var(--text)' }}>Why this matters.</b> Detection that rests on signals the attacker controls for free - the amount shape, the rail, the hour - <span style={{ color: CHEAP }}>depreciates</span>: it only works against a sloppy adversary. Detection grounded in signals that cost real resources to fake - a clean established mule, an aged account - <span style={{ color: COSTLY }}>appreciates</span>. Flip between seeds: graph-driven typologies (pig butchering, ATO) are resilient because the recipient and tenure signals are costly to evade. Victim-authorized fraud (APP scams, deepfakes) is fragile, because the only tells left are the cheap ones - which is exactly the hard problem on irrevocable rails.
      </div>
    </div>
  );
}
