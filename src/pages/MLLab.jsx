import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, Zap, Cpu, Activity } from 'lucide-react';
import { callOnce, fetchMLMetrics, fetchMLFeatures, fetchMLDrift, scoreTransactionML } from '../api.js';

const THRESHOLDS = { 'AUC-ROC': 0.93, 'Precision': 0.85, 'Recall': 0.80, 'F1 Score': 0.83 };

const SCORER_SYSTEM = `You are a fraud risk scoring engine for an ML fraud detection platform.
Given a transaction description, output a JSON object with exactly these fields:
{
  "score": <integer 0-100>,
  "severity": <"Low" | "Medium" | "High" | "Critical">,
  "key_signals": [<3-5 short strings, most important risk signals>],
  "reasoning": <1-2 sentences explaining the score>,
  "recommended_action": <"Approve" | "Review" | "Decline">
}
Be calibrated: most transactions are legitimate. Fraud is rare. Only score High/Critical if there are clear risk signals.
Respond with ONLY the JSON object, no other text.`;

function MetricCard({ label, value, threshold }) {
  const good = value >= threshold;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${good ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
      borderRadius: 10,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {good
          ? <CheckCircle2 size={13} style={{ color: 'var(--green)' }} />
          : <AlertTriangle size={13} style={{ color: 'var(--yellow)' }} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
        {value > 0 ? value.toFixed(4) : '—'}
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 6 }}>
        <div style={{
          height: '100%',
          width: `${Math.min(value * 100, 100)}%`,
          borderRadius: 2,
          background: good ? 'var(--green)' : 'var(--yellow)',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
        Threshold: {threshold.toFixed(2)} &nbsp;·&nbsp;
        {value > 0 && (
          <span style={{ color: good ? 'var(--green)' : 'var(--yellow)' }}>
            {good
              ? `+${((value - threshold) * 100).toFixed(1)}pp above`
              : `${((value - threshold) * 100).toFixed(1)}pp below`}
          </span>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: 'JetBrains Mono, monospace' }}>
          {p.dataKey}: {p.value}
        </div>
      ))}
    </div>
  );
};

function ScoreBar({ score }) {
  const color = score >= 85 ? 'var(--red)' : score >= 65 ? 'var(--yellow)' : score >= 40 ? 'var(--orange)' : 'var(--green)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', minWidth: 24, textAlign: 'right' }}>{score}</span>
    </div>
  );
}

function Stat({ label, value, ok }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: ok ? 'var(--green)' : 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 8, height: 2, borderRadius: 1, background: color }} />
      <span style={{ fontSize: 10 }}>{label}</span>
    </div>
  );
}

export default function MLLab() {
  const [txInput, setTxInput]       = useState('');
  const [scoring, setScoring]       = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreError, setScoreError] = useState(null);
  const [useMLEngine, setUseMLEngine] = useState(true);

  // Live data from RedWing ML server
  const [metrics, setMetrics]     = useState(null);
  const [features, setFeatures]   = useState([]);
  const [driftData, setDriftData] = useState([]);
  const [serverOk, setServerOk]   = useState(null); // null=loading, true, false
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function loadLiveData() {
      try {
        const [m, f, d] = await Promise.all([
          fetchMLMetrics(),
          fetchMLFeatures(),
          fetchMLDrift(30),
        ]);
        setMetrics(m);
        setFeatures(f.features.slice(0, 10));
        setDriftData(d.drift);
        setServerOk(true);
      } catch {
        setServerOk(false);
      } finally {
        setLoading(false);
      }
    }
    loadLiveData();
  }, []);

  async function scoreTransaction() {
    if (!txInput.trim() || scoring) return;
    setScoring(true);
    setScoreResult(null);
    setScoreError(null);
    try {
      if (useMLEngine) {
        // Parse amount from text, fall back to heuristics
        const amountMatch = txInput.match(/\$?([\d,]+(?:\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 500;
        const isCrypto = /crypto|bitcoin|btc|eth|usdt/i.test(txInput) ? 1.0 : 0.0;
        const isInstant = /wire|zelle|fednow|rtp|instant/i.test(txInput) ? 1.0 : 0.0;
        const isP2P = /p2p|venmo|cashapp|zelle/i.test(txInput) ? 1.0 : 0.0;
        const isRound = amount % 100 === 0 || amount % 1000 === 0 ? 1.0 : 0.0;
        const newRecip = /new|unknown|overseas|foreign|first time/i.test(txInput) ? 1.0 : 0.0;
        const velHigh = /multiple|repeated|velocity|many transactions/i.test(txInput) ? 5 : 0;
        const rail = isCrypto ? 'crypto' : isInstant ? 'FedNow' : isP2P ? 'Zelle' : 'card';

        const mlResult = await scoreTransactionML({
          amount, hour: 14,
          payment_rail: rail,
          is_crypto: isCrypto,
          is_instant_rail: isInstant,
          is_p2p: isP2P,
          is_round_amount: isRound,
          velocity_24h_raw: velHigh,
          new_recipient: newRecip,
          account_age_days: /new account|just opened|2-day|3-day/i.test(txInput) ? 2 : 365,
        });

        const decision = mlResult.decision;
        const sev = mlResult.redwing_score >= 85 ? 'Critical'
          : mlResult.redwing_score >= 65 ? 'High'
          : mlResult.redwing_score >= 40 ? 'Medium' : 'Low';

        setScoreResult({
          score: mlResult.redwing_score,
          severity: sev,
          key_signals: mlResult.top_signals,
          reasoning: `RedWing score ${mlResult.redwing_score}/100 — XGBoost: ${mlResult.xgb_score}, IsoForest: ${mlResult.iso_score}. Latency: ${mlResult.latency_ms}ms.`,
          recommended_action: decision === 'DECLINE' ? 'Decline' : decision === 'APPROVE' ? 'Approve' : 'Review',
          model_version: mlResult.model_version,
          source: 'ml-engine',
        });
      } else {
        const raw = await callOnce({
          systemPrompt: SCORER_SYSTEM,
          userMessage: `Score this transaction: ${txInput}`,
        });
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        setScoreResult({ ...JSON.parse(cleaned), source: 'llm' });
      }
    } catch (e) {
      setScoreError(e.message);
    } finally {
      setScoring(false);
    }
  }

  const scoreColor = (s) =>
    s >= 85 ? 'var(--red)' : s >= 65 ? 'var(--yellow)' : s >= 40 ? 'var(--orange)' : 'var(--green)';

  const metricCards = metrics ? [
    { label: 'AUC-ROC',   value: metrics.auc_redwing || metrics.auc_ensemble || 0,  threshold: THRESHOLDS['AUC-ROC'] },
    { label: 'Precision', value: metrics.precision || 0, threshold: THRESHOLDS['Precision'] },
    { label: 'Recall',    value: metrics.recall    || 0, threshold: THRESHOLDS['Recall'] },
    { label: 'F1 Score',  value: metrics.f1        || 0, threshold: THRESHOLDS['F1 Score'] },
  ] : [];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Model header */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: serverOk ? 'var(--green)' : serverOk === false ? 'var(--red)' : 'var(--yellow)', animation: serverOk ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            RedWing ML Engine &nbsp;
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>
              {metrics ? metrics.model_version : '—'}
            </span>
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={11} />
          {serverOk === null ? 'Connecting…' : serverOk ? 'Live · port 8001' : 'Server offline — run: uvicorn server:app --port 8001'}
        </div>
        {metrics && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            <Stat label="Transactions" value={metrics.n_transactions?.toLocaleString() ?? '—'} />
            <Stat label="Fraud rate" value={metrics.fraud_rate ? `${(metrics.fraud_rate * 100).toFixed(2)}%` : '—'} />
            <Stat label="Features" value={metrics.feature_count ?? '—'} ok={metrics.feature_count === 23} />
            <Stat label="FP rate" value={metrics.false_positive_rate ? `${(metrics.false_positive_rate * 100).toFixed(2)}%` : '—'} ok />
          </div>
        )}
      </div>

      {/* Metric cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', height: 100, opacity: 0.4 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {metricCards.map(m => <MetricCard key={m.label} {...m} />)}
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* Drift chart */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={12} style={{ color: 'var(--accent)' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Model Performance Drift (30d)</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                AUC-ROC · based on real model score · Dashed = threshold (0.93)
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
              <LegendDot color="var(--accent)" label="AUC" />
              <LegendDot color="var(--yellow)" label="Precision" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={driftData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradAUC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPrec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis domain={[0.82, 0.99]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(2)} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="AUC" stroke="#818cf8" strokeWidth={1.5} fill="url(#gradAUC)" dot={false} />
              <Area type="monotone" dataKey="Precision" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gradPrec)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Feature importance — live SHAP */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Feature Importance</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 14 }}>
            {features.length ? 'Live SHAP values (top 10)' : 'Loading…'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map(f => (
              <div key={f.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{f.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {(f.importance * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(f.importance / (features[0]?.importance || 1) * 100, 100)}%`,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #818cf8, #c084fc)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction scorer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Transaction Risk Scorer</span>
            </div>
            {/* Toggle: ML engine vs LLM */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
              <span style={{ color: !useMLEngine ? 'var(--accent)' : 'var(--text-muted)' }}>LLM</span>
              <button
                onClick={() => setUseMLEngine(v => !v)}
                style={{
                  width: 32, height: 16, borderRadius: 8,
                  background: useMLEngine ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: useMLEngine ? 18 : 2,
                  width: 12, height: 12, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ color: useMLEngine ? 'var(--accent)' : 'var(--text-muted)' }}>ML Engine</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
            {useMLEngine
              ? 'Parsed → RedWing model inference (real XGBoost + IsoForest, sub-ms)'
              : 'Describe a transaction — AI scores it using ML signal patterns'}
          </div>

          <textarea
            value={txInput}
            onChange={e => setTxInput(e.target.value)}
            placeholder="e.g. $4,200 wire transfer from a 2-day-old account to an overseas account, first transaction, device fingerprint changed 3 times in the last hour..."
            rows={3}
            style={{
              width: '100%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 12px',
              color: 'var(--text)',
              fontSize: 12,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />

          <button
            onClick={scoreTransaction}
            disabled={!txInput.trim() || scoring}
            style={{
              padding: '8px 18px',
              background: txInput.trim() && !scoring ? 'var(--accent)' : 'var(--bg-elevated)',
              border: 'none', borderRadius: 7,
              color: txInput.trim() && !scoring ? '#fff' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600,
              cursor: txInput.trim() && !scoring ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            {scoring
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Scoring…</>
              : <><Zap size={12} /> Score Transaction</>}
          </button>

          {scoreError && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, fontSize: 11, color: 'var(--red)' }}>
              {scoreError}
            </div>
          )}

          {scoreResult && (
            <div className="fade-in" style={{ marginTop: 14, padding: '14px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(scoreResult.score), fontFamily: 'JetBrains Mono, monospace' }}>
                  {scoreResult.score}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {scoreResult.source === 'ml-engine' && (
                    <span style={{ fontSize: 9, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.8 }}>
                      {scoreResult.model_version}
                    </span>
                  )}
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: `${scoreColor(scoreResult.score)}18`,
                    border: `1px solid ${scoreColor(scoreResult.score)}40`,
                    color: scoreColor(scoreResult.score),
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {scoreResult.severity}
                  </span>
                </div>
              </div>
              <ScoreBar score={scoreResult.score} />
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>{scoreResult.reasoning}</div>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {scoreResult.key_signals?.map((s, i) => (
                  <span key={i} style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                    {s}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: scoreResult.recommended_action === 'Approve' ? 'var(--green)' : scoreResult.recommended_action === 'Decline' ? 'var(--red)' : 'var(--yellow)' }}>
                Action: {scoreResult.recommended_action}
              </div>
            </div>
          )}
        </div>

        {/* Server info panel */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>RedWing Stack</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Layer 1 — Rule Engine', value: '41 rules · 6 typologies', color: 'var(--accent)' },
              { label: 'Layer 2 — XGBoost', value: metrics ? `AUC ${metrics.auc_xgboost || '—'}` : '—', color: '#818cf8' },
              { label: 'Layer 2 — IsoForest', value: metrics ? `AUC ${metrics.auc_isolation_forest || '—'}` : '—', color: '#c084fc' },
              { label: 'Layer 3 — Behavioral', value: '30/60/90d baselines', color: 'var(--yellow)' },
              { label: 'Ensemble AUC', value: metrics ? metrics.auc_ensemble?.toFixed(4) ?? '—' : '—', color: 'var(--green)' },
              { label: 'Weights', value: '40% rules · 45% ML · 15% base', color: 'var(--text-muted)' },
              { label: 'Server', value: serverOk ? 'localhost:8001 ✓' : 'offline', color: serverOk ? 'var(--green)' : 'var(--red)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: row.color, fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
