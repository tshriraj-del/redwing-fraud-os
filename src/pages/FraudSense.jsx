import { useState, useEffect } from 'react';
import { Sparkles, Search } from 'lucide-react';
import InputSection from '../fraudsense/components/InputSection.jsx';
import ResultsSection from '../fraudsense/components/ResultsSection.jsx';
import SkeletonLoader from '../fraudsense/components/SkeletonLoader.jsx';
import { investigateCase } from '../fraudsense/api.js';
import { processFile, MAX_FILES } from '../fraudsense/files.js';
import { CASE_TYPES, MIN_INPUT_LENGTH } from '../fraudsense/constants.js';

const DEMO_ANALYSIS = {
  risk_score: { score: 87, tier: 'HIGH', confidence: 'High', score_basis: 'Multiple strong behavioural signals consistent with card testing bot. Extreme velocity, micro-amounts, and machine-timing regularity.' },
  loss_estimate: { direct: 0, indirect: 4200, total: 4200, currency: 'USD', recovery_likelihood: 'High', recovery_basis: 'No successful large-value transaction completed - testing phase intercepted.' },
  signals: [
    { label: 'Micro-amount velocity burst', strength: 'Strong', basis: 'Observed', direction: 'Increases risk' },
    { label: 'Machine-like timing regularity (< 40ms variance)', strength: 'Strong', basis: 'Observed', direction: 'Increases risk' },
    { label: '28 P2P transactions in 3 hours', strength: 'Strong', basis: 'Observed', direction: 'Increases risk' },
    { label: 'All transactions to new recipients', strength: 'Strong', basis: 'Observed', direction: 'Increases risk' },
    { label: 'No manual input lag detected', strength: 'Medium', basis: 'Inferred', direction: 'Increases risk' },
  ],
  classification: { primary_type: 'Card Testing / Carding', secondary_type: null, confidence: 'High', typology_basis: 'Micro-amount burst on P2P rails is the canonical card testing pattern. Velocity and timing confirm automated execution.' },
  root_cause_analysis: { trigger: 'Compromised card data purchased from darknet marketplace', method: 'Automated bot script submitting $0.50–$1.99 P2P transfers to test card validity before high-value cashout', timeline: 'Pattern started at 02:14 UTC; 28 transactions over 3h 12m', entry_point: 'Mobile P2P API with insufficient rate limiting below $2.00 threshold' },
  fact_assessment: {
    facts: ['28 transactions in 3h 12m window', 'All amounts between $0.50 and $1.99', 'All recipients are first-time payees', 'Timing variance < 40ms between transactions'],
    inferences: ['Bot-driven automation (no human can maintain <40ms timing consistency)', 'Card testing preparatory to high-value cashout attempt'],
    hypotheses: ['Compromised card data from recent darknet market breach'],
  },
  recommendation: {
    action: 'Decline',
    rationale: 'Card testing bot confirmed with high confidence. Block all further transactions and initiate rule synthesis.',
    steps: ['Immediately block all outbound Zelle from this account', 'Quarantine device fingerprint - block same device on all accounts', 'Escalate to fraud operations for rule synthesis via Rule Factory', 'Notify card issuer of potential compromised card data'],
    escalation_required: true, law_enforcement: false,
  },
};

const DEMO_CASE_TEXT = 'Account opened 3 weeks ago. In the past 3 hours, 28 Zelle transfers ranging from $0.50 to $1.97 were sent to 28 different first-time recipients. Timing between transactions averages 410 seconds with < 40ms variance. No manual delay patterns detected. Device fingerprint is consistent across all transactions but flagged as a headless browser environment.';

export default function FraudSense() {
  const [caseText, setCaseText]       = useState('');
  const [caseType, setCaseType]       = useState(CASE_TYPES[0]);
  const [contextFlags, setContextFlags] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [analysis, setAnalysis]       = useState(null);
  const [caseMeta, setCaseMeta]       = useState(null);
  const [live, setLive]               = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2500) })
      .then(() => setLive(true))
      .catch(() => {
        setLive(false);
        setCaseText(DEMO_CASE_TEXT);
        setAnalysis(DEMO_ANALYSIS);
        setCaseMeta({ caseText: DEMO_CASE_TEXT, caseType: CASE_TYPES[0], contextFlags: [], attachments: [] });
      });
  }, []);

  function toggleFlag(flag) {
    setContextFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  }

  async function addFiles(fileList) {
    setError('');
    const incoming = Array.from(fileList ?? []);
    if (!incoming.length) return;
    const room = MAX_FILES - attachments.length;
    if (room <= 0) { setError(`Max ${MAX_FILES} files.`); return; }
    const results = await Promise.allSettled(incoming.slice(0, room).map(processFile));
    const ok = [], failed = [];
    for (const r of results) {
      if (r.status === 'fulfilled') ok.push(r.value);
      else failed.push(r.reason?.message || 'A file could not be read.');
    }
    if (ok.length) {
      setAttachments(prev => {
        const seen = new Set(prev.map(a => a.id));
        return [...prev, ...ok.filter(a => !seen.has(a.id))];
      });
    }
    if (failed.length) setError(failed.join(' '));
  }

  function removeFile(id) {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }

  async function runInvestigation() {
    const hasText = caseText.trim().length >= MIN_INPUT_LENGTH;
    if (!hasText && attachments.length === 0) {
      setError(`Enter at least ${MIN_INPUT_LENGTH} characters or attach a file.`);
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const result = await investigateCase(caseText.trim(), caseType, contextFlags, attachments);
      setAnalysis(result);
      setCaseMeta({
        caseText: caseText.trim(),
        caseType,
        contextFlags: [...contextFlags],
        attachments: attachments.map(a => ({ name: a.name, kind: a.kind })),
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function resetCase() {
    setCaseText(''); setCaseType(CASE_TYPES[0]); setContextFlags([]);
    setAttachments([]); setAnalysis(null); setCaseMeta(null); setError('');
  }

  const status = loading ? 'analyzing' : analysis ? 'complete' : 'ready';

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Suite-style header bar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>FraudSense - Investigation Copilot</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>LLM investigation: signal extraction → risk scoring → classification → root cause → recommended action</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: live ? 'var(--green)' : live === false ? 'var(--yellow)' : 'var(--text-muted)' }} />
            {live === null ? 'Connecting…' : live ? 'Live · operator online' : 'Demo mode · showing a sample case'}
          </div>
        </div>

      <main className="mx-auto max-w-[1100px]" style={{ width: '100%' }}>
        <InputSection
          caseText={caseText}
          setCaseText={setCaseText}
          caseType={caseType}
          setCaseType={setCaseType}
          contextFlags={contextFlags}
          toggleFlag={toggleFlag}
          attachments={attachments}
          addFiles={addFiles}
          removeFile={removeFile}
          onInvestigate={runInvestigation}
          loading={loading}
        />

        {error && !loading && (
          <div
            role="alert"
            className="mx-auto mt-6 flex max-w-[720px] items-start gap-3 rounded-lg border px-4 py-3.5 text-[12px]"
            style={{ borderColor: 'var(--accent-red)', background: 'var(--accent-red-dim)', color: 'var(--text-primary)' }}
          >
            <div className="mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center">⚠</div>
            <div className="flex-1">
              <p className="font-display uppercase tracking-[0.1em]" style={{ color: 'var(--accent-red)' }}>
                Investigation failed
              </p>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
            <button
              type="button"
              onClick={runInvestigation}
              className="shrink-0 rounded-lg border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors"
              style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-8">
          {loading && <SkeletonLoader />}
          {!loading && analysis && (
            <ResultsSection analysis={analysis} caseMeta={caseMeta} onReset={resetCase} />
          )}
          {!loading && !analysis && !error && <FraudSenseEmptyState />}
        </div>
      </main>
      </div>
    </div>
  );
}

function FraudSenseEmptyState() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', background: 'var(--bg-surface)',
      border: '1px solid var(--border)', borderRadius: 10, padding: '40px 24px' }}>
      <div style={{ width: 40, height: 40, margin: '0 auto 14px', borderRadius: 9, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--accent-dim)', color: 'var(--accent-bright)' }}>
        <Search size={18} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Awaiting case input</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6, maxWidth: 420, marginInline: 'auto' }}>
        Paste a case or open one from the Investigator panel. FraudSense extracts signals, scores risk, classifies the typology,
        reconstructs root cause, and recommends a data-grounded action - citing the evidence it used.
      </div>
    </div>
  );
}
