import { useState, useEffect, useCallback } from 'react';
import {
  Boxes, Play, Search, Eye, Gavel, CheckCircle2, XCircle, Trophy, ChevronRight,
} from 'lucide-react';
import { fetchEnvSpec, runEnvAll, fetchAlertQueue } from '../api.js';
import Badge from '../components/Badge.jsx';

const AC = 'var(--accent)'; // agent-environment accent

// ── Demo fallback (Vercel / operator-down) - a verified fraud-case episode ────
const FALLBACK_SPEC = {
  name: 'redwing-financial-crime-investigation-v1',
  task: 'Investigate an escalated transaction and commit the correct disposition.',
  observation: {
    always_visible: ['case_id', 'priority', 'queue', 'alert (scores/typology, NO ground-truth label)', 'transaction basics'],
    revealed_by_inspection: ['customer', 'instrument', 'card_fraud_signals', 'dispute', 'device_network', 'timeline'],
  },
  actions: {
    inspect: ['inspect_customer', 'inspect_instrument', 'inspect_card_signals', 'inspect_dispute', 'inspect_device_network', 'inspect_timeline'],
    terminal: ['confirm_fraud', 'clear_false_positive', 'deny_dispute_first_party', 'escalate_stepup', 'block_instrument', 'place_hold'],
  },
  reward: {
    outcome_weight: 0.6, process_weight: 0.4, step_cost: 0.02,
    outcome: 'correct disposition vs ground truth, cost-sensitive (clearing a fraud = -1.0; false-positive on a good customer = -0.6)',
    process: "fraction of the case's DECISIVE evidence inspected before deciding, minus penalties for guessing and flailing",
  },
  ground_truth: 'synthetic is_fraud label + gold disposition per case',
};

const FALLBACK_RUN = {
  transaction_id: 'txn_014943', case_id: 'CASE-014943', ground_truth_label: 'fraud', gold_disposition: 'confirm_fraud',
  runs: [
    { agent: 'investigator', trajectory: [
        { step: 1, action: 'inspect_card_signals', type: 'inspect', reward: -0.02, cumulative: -0.02, revealed: 'card_fraud_signals' },
        { step: 2, action: 'inspect_customer', type: 'inspect', reward: -0.02, cumulative: -0.04, revealed: 'customer' },
        { step: 3, action: 'inspect_device_network', type: 'inspect', reward: -0.02, cumulative: -0.06, revealed: 'device_network' },
        { step: 4, action: 'inspect_dispute', type: 'inspect', reward: -0.02, cumulative: -0.08, revealed: 'dispute' },
        { step: 5, action: 'confirm_fraud', type: 'decide', reward: 1.0, cumulative: 0.92 },
      ],
      scorecard: { terminal_action: 'confirm_fraud', correct: true, outcome_reward: 1.0, process_reward: 1.0, total_reward: 0.92, n_inspections: 4,
        process_detail: { decisive: ['inspect_card_signals', 'inspect_customer', 'inspect_device_network'], covered: ['inspect_card_signals', 'inspect_customer', 'inspect_device_network'], coverage: 1.0, guessed: false, redundant: 0 } } },
    { agent: 'trigger_happy', trajectory: [{ step: 1, action: 'block_instrument', type: 'decide', reward: 1.0, cumulative: 1.0 }],
      scorecard: { terminal_action: 'block_instrument', correct: false, outcome_reward: 1.0, process_reward: -0.5, total_reward: 0.4, n_inspections: 0,
        process_detail: { decisive: ['inspect_card_signals', 'inspect_customer', 'inspect_device_network'], covered: [], coverage: 0, guessed: true, redundant: 0 } } },
    { agent: 'cautious', trajectory: [{ step: 1, action: 'escalate_stepup', type: 'decide', reward: 0.4, cumulative: 0.4 }],
      scorecard: { terminal_action: 'escalate_stepup', correct: false, outcome_reward: 0.4, process_reward: -0.5, total_reward: 0.04, n_inspections: 0,
        process_detail: { decisive: ['inspect_card_signals', 'inspect_customer', 'inspect_device_network'], covered: [], coverage: 0, guessed: true, redundant: 0 } } },
  ],
};

const AGENT_DESC = {
  investigator: 'Gathers the decisive evidence, then decides',
  trigger_happy: 'Blocks first, investigates never',
  cautious: 'Escalates everything without looking',
};

function AgentRow({ run, rank, best }) {
  const s = run.scorecard;
  const win = rank === 0;
  return (
    <div style={{ background: win ? 'var(--accent-dim)' : 'var(--bg-elevated)', border: win ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 9, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {win && <Trophy size={13} style={{ color: AC }} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{run.agent}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{AGENT_DESC[run.agent]}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          {s.correct ? <CheckCircle2 size={13} style={{ color: 'var(--green)' }} /> : <XCircle size={13} style={{ color: 'var(--red)' }} />}
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: win ? AC : 'var(--text)' }}>{s.total_reward >= 0 ? '+' : ''}{s.total_reward.toFixed(2)}</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>decided <b style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{s.terminal_action}</b></span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>outcome <b style={{ color: s.outcome_reward >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>{s.outcome_reward >= 0 ? '+' : ''}{s.outcome_reward.toFixed(2)}</b></span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>process <b style={{ color: s.process_reward >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>{s.process_reward >= 0 ? '+' : ''}{s.process_reward.toFixed(2)}</b></span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{s.n_inspections} inspections</span>
        {s.process_detail?.guessed && <Badge color="var(--red)">decided blind</Badge>}
      </div>
    </div>
  );
}

export default function AgentEnv() {
  const [spec, setSpec] = useState(FALLBACK_SPEC);
  const [result, setResult] = useState(FALLBACK_RUN);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [txn, setTxn] = useState('txn_014943');

  useEffect(() => {
    fetchEnvSpec().then(s => { setSpec(s); setLive(true); }).catch(() => setLive(false));
    fetchAlertQueue(10).then(a => setQueue(a.map(x => x.transaction_id))).catch(() => {});
  }, []);

  const run = useCallback(async (id) => {
    setLoading(true);
    try { const r = await runEnvAll(id); setResult(r); setLive(true); }
    catch { setLive(false); }
    finally { setLoading(false); }
  }, []);

  const ranked = [...(result.runs || [])].sort((a, b) => b.scorecard.total_reward - a.scorecard.total_reward);
  const winner = ranked[0];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Boxes size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Agent-Evaluation Environment</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Investigation as a resettable environment - scored on the trajectory, not a one-shot answer</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--green)' : live === false ? 'var(--yellow)' : 'var(--text-muted)' }} />
          {live === null ? 'Connecting…' : live ? 'Live · /env' : 'Demo · verified episode'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── env spec ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <Boxes size={13} style={{ color: AC }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Environment contract</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginBottom: 10 }}>{spec.name}</div>

            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Action space · inspect</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {spec.actions.inspect.map(a => <Badge key={a} color="#60a5fa">{a.replace('inspect_', '')}</Badge>)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Action space · decide</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {spec.actions.terminal.map(a => <Badge key={a} color={AC}>{a}</Badge>)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Reward = two verifiers</div>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)', background: 'var(--bg-elevated)', borderRadius: 7, padding: '8px 10px', marginBottom: 10 }}>
              {spec.reward.outcome_weight}·outcome + {spec.reward.process_weight}·process − cost
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
              <b style={{ color: '#34d399' }}>Outcome</b> - {spec.reward.outcome}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <b style={{ color: '#60a5fa' }}>Process</b> - {spec.reward.process}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 10, opacity: 0.8, lineHeight: 1.5 }}>
              Agent-agnostic: any agent (LLM or scripted) can drive it via POST /env/step. Ground truth: {spec.ground_truth}.
            </div>
          </div>
        </div>

        {/* ── run + results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* run controls */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 9px' }}>
                <Search size={12} style={{ color: 'var(--text-muted)' }} />
                <input value={txn} onChange={e => setTxn(e.target.value)} onKeyDown={e => e.key === 'Enter' && run(txn.trim())}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 11, width: 110, fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <button onClick={() => run(txn.trim())} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#fff', background: AC, border: 'none', borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}>
                <Play size={12} /> {loading ? 'Running…' : 'Run evaluation'}
              </button>
              {queue.slice(0, 6).map(id => (
                <button key={id} onClick={() => { setTxn(id); run(id); }}
                  style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: result.transaction_id === id ? AC : 'var(--text-muted)', background: result.transaction_id === id ? 'var(--accent-dim)' : 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                  {id}
                </button>
              ))}
            </div>
          </div>

          {/* case + leaderboard */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{result.case_id}</span>
              <Badge color={result.ground_truth_label === 'fraud' ? 'var(--red)' : 'var(--green)'}>truth: {result.ground_truth_label}</Badge>
              <Badge color="#34d399">gold: {result.gold_disposition}</Badge>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>3 agents · same case · ranked by total reward</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranked.map((r, i) => <AgentRow key={r.agent} run={r} rank={i} />)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 12, background: 'var(--bg-elevated)', borderRadius: 7, padding: '9px 11px' }}>
              The naive baselines can still land the right label (blocking a fraud) - but the <b style={{ color: '#60a5fa' }}>process verifier</b> docks them for deciding blind, and the <b style={{ color: '#34d399' }}>outcome verifier</b> punishes blocking good customers. The disciplined investigator wins on the trajectory, which is what you'd actually train an agent to do.
            </div>
          </div>

          {/* winner trajectory */}
          {winner && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <Trophy size={13} style={{ color: AC }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Winning trajectory - {winner.agent}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {winner.trajectory.map((t, i) => {
                  const decide = t.type === 'decide';
                  const Icon = decide ? Gavel : Eye;
                  const c = decide ? AC : '#60a5fa';
                  const tint = decide ? 'var(--accent-dim)' : `${c}1a`;
                  const ring = decide ? '1px solid var(--accent)' : `1px solid ${c}55`;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < winner.trajectory.length - 1 ? 10 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: tint, border: ring, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={11} style={{ color: c }} />
                        </div>
                        {i < winner.trajectory.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 2 }} />}
                      </div>
                      <div style={{ flex: 1, paddingTop: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{t.action}</span>
                          {t.revealed && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>→ revealed {t.revealed}</span>}
                          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: t.reward >= 0 ? 'var(--green)' : 'var(--text-muted)' }}>{t.reward >= 0 ? '+' : ''}{t.reward.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 10.5, color: 'var(--text-muted)' }}>
                <ChevronRight size={12} style={{ color: AC }} />
                inspected {winner.scorecard.process_detail?.covered?.length || 0}/{winner.scorecard.process_detail?.decisive?.length || 0} decisive evidence items before deciding · process {winner.scorecard.process_reward >= 0 ? '+' : ''}{winner.scorecard.process_reward.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', opacity: 0.7, textAlign: 'center', lineHeight: 1.5 }}>
        A resettable environment over synthetic cases: known state → bounded action space → decision trajectory → process + outcome verifiers. The investigator workbench, made trainable.
      </div>
    </div>
  );
}
