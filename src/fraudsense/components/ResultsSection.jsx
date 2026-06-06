import { useState } from 'react';
import RiskScorePanel from './RiskScorePanel.jsx';
import LossEstimatePanel from './LossEstimatePanel.jsx';
import SignalsPanel from './SignalsPanel.jsx';
import ClassificationPanel from './ClassificationPanel.jsx';
import RcaPanel from './RcaPanel.jsx';
import EvidenceBasisPanel from './EvidenceBasisPanel.jsx';
import RecommendationPanel from './RecommendationPanel.jsx';
import { buildMarkdownReport } from '../report.js';

export default function ResultsSection({ analysis, caseMeta, onReset }) {
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);

  async function copyReport() {
    const md = buildMarkdownReport(analysis, caseMeta);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      // Fallback for environments without clipboard permission
      const ta = document.createElement('textarea');
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative mx-auto max-w-[1100px]">
      {/* (1) cyan scan line sweeps top → bottom over the results area, then gone */}
      <span
        className="pointer-events-none absolute inset-x-0 z-10 h-px bg-[color:var(--accent-cyan)] shadow-[0_0_12px_var(--accent-cyan)]"
        style={{ animation: 'resultsScan 0.6s ease-out forwards' }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <RiskScorePanel riskScore={analysis.risk_score} order={1} />
        <LossEstimatePanel lossEstimate={analysis.loss_estimate} order={2} />
        <SignalsPanel signals={analysis.signals} order={3} />
        <ClassificationPanel classification={analysis.classification} order={4} />
        <RcaPanel rca={analysis.root_cause_analysis} order={5} />
        <EvidenceBasisPanel factAssessment={analysis.fact_assessment} order={6} />
        <div className="lg:col-span-2">
          <RecommendationPanel recommendation={analysis.recommendation} order={7} />
        </div>
      </div>

      {/* Copy / reset controls */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={copyReport}
          className="rounded-lg border border-dashed px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-150"
          style={{
            borderColor: flash ? 'var(--accent-cyan)' : 'var(--border-active)',
            color: flash ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}
        >
          {copied ? 'Copied to clipboard ✓' : 'Copy Report'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-dashed border-[color:var(--border-active)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] transition-colors duration-150 hover:text-[color:var(--text-primary)]"
        >
          New Case
        </button>
      </div>
    </div>
  );
}
