import { useState } from 'react';
import InputSection from '../fraudsense/components/InputSection.jsx';
import ResultsSection from '../fraudsense/components/ResultsSection.jsx';
import SkeletonLoader from '../fraudsense/components/SkeletonLoader.jsx';
import { investigateCase } from '../fraudsense/api.js';
import { processFile, MAX_FILES } from '../fraudsense/files.js';
import { CASE_TYPES, MIN_INPUT_LENGTH } from '../fraudsense/constants.js';

export default function FraudSense() {
  const [caseText, setCaseText]       = useState('');
  const [caseType, setCaseType]       = useState(CASE_TYPES[0]);
  const [contextFlags, setContextFlags] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [analysis, setAnalysis]       = useState(null);
  const [caseMeta, setCaseMeta]       = useState(null);

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
    <div className="relative min-h-full overflow-auto" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <main className="relative z-10 mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
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
            className="mx-auto mt-6 flex max-w-[720px] items-start gap-3 rounded-lg border px-4 py-3.5 font-mono text-[12px]"
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
              className="shrink-0 rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors"
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
  );
}

function FraudSenseEmptyState() {
  return (
    <div className="mx-auto max-w-[720px] rounded-lg border border-dashed px-6 py-14 text-center"
      style={{ borderColor: 'var(--border-active)', background: 'rgba(13,17,23,0.4)' }}>
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border"
        style={{ borderColor: 'var(--border-active)', background: 'var(--bg-base)', color: 'var(--accent-cyan)' }}>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803M10.5 7.5v6m3-3h-6" />
        </svg>
      </span>
      <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-primary)' }}>
        Awaiting case input
      </h3>
      <p className="mx-auto mt-2 max-w-md font-mono text-[12px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
        FraudSense runs a 4-stage investigation — signal extraction, classification, root cause analysis, and a recommended action.
      </p>
    </div>
  );
}
