import { useRef, useState } from 'react';
import {
  CASE_TYPES,
  CONTEXT_FLAGS,
  EXAMPLE_CASES,
  MIN_INPUT_LENGTH,
} from '../constants.js';
import { ACCEPT_ATTR, MAX_FILES, prettySize } from '../files.js';
import { PaperclipIcon, CloseIcon, FileIcon, ImageIcon } from './Icons.jsx';

export default function InputSection({
  caseText,
  setCaseText,
  caseType,
  setCaseType,
  contextFlags,
  toggleFlag,
  attachments = [],
  addFiles,
  removeFile,
  onInvestigate,
  loading,
}) {
  const trimmedLen = caseText.trim().length;
  const tooShort = trimmedLen < MIN_INPUT_LENGTH;
  // Allow submission when there's enough text OR at least one attachment.
  const canSubmit = !loading && (!tooShort || attachments.length > 0);

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function applyExample(ex) {
    setCaseText(ex.text);
    setCaseType(ex.caseType);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  return (
    <section
      className="panel mx-auto max-w-[720px] p-5 sm:p-7"
      aria-label="Case input"
    >
      {/* 2px cyan top accent */}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--accent-cyan)]" />

      <h2 className="panel-label mb-4 flex items-center gap-2 text-[11px] text-[color:var(--text-secondary)]">
        <span className="text-[color:var(--accent-cyan)]">▸</span> Investigate a case
      </h2>

      {/* Case type — segmented pill buttons */}
      <div className="mb-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
          Case type
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CASE_TYPES.map((t) => {
            const active = t === caseType;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setCaseType(t)}
                aria-pressed={active}
                className="rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-all duration-150"
                style={
                  active
                    ? {
                        background: 'var(--accent-cyan-dim)',
                        borderColor: 'var(--accent-cyan)',
                        color: 'var(--accent-cyan)',
                      }
                    : {
                        background: 'var(--bg-base)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Textarea */}
      <label htmlFor="case-input" className="sr-only">
        Case description
      </label>
      <textarea
        id="case-input"
        value={caseText}
        onChange={(e) => setCaseText(e.target.value)}
        placeholder="Paste a case description, transaction details, or suspicious activity summary..."
        className="min-h-[140px] w-full resize-y rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-base)] px-4 py-3 font-mono text-[13px] leading-relaxed text-[color:var(--text-primary)] placeholder:text-[color:var(--text-dim)] transition focus:border-[color:var(--accent-cyan)] focus:outline-none focus:[box-shadow:0_0_0_3px_rgba(57,208,216,0.08)]"
      />

      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em]">
        {trimmedLen > 0 && tooShort ? (
          <span className="text-[color:var(--accent-amber)]">
            {trimmedLen}/{MIN_INPUT_LENGTH} — need more detail
          </span>
        ) : (
          <span className="text-[color:var(--text-dim)]">{trimmedLen} chars</span>
        )}
      </div>

      {/* Attachments — drop zone + picker */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
          <span>Evidence files (optional)</span>
          <span>
            {attachments.length}/{MAX_FILES}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-5 transition-colors duration-150"
          style={{
            borderColor: dragOver ? 'var(--accent-cyan)' : 'var(--border-active)',
            background: dragOver ? 'var(--accent-cyan-dim)' : 'transparent',
          }}
        >
          <PaperclipIcon className="h-4 w-4 text-[color:var(--accent-cyan)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-secondary)]">
            Drop files or click to attach
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-[color:var(--text-dim)]">
            TXT · CSV · JSON · LOG · PNG · JPG · PDF — max 8MB each
          </span>
        </button>

        {attachments.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-base)] px-2.5 py-1.5"
              >
                {a.kind === 'image' ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-[color:var(--accent-purple)]" />
                ) : (
                  <FileIcon className="h-4 w-4 shrink-0 text-[color:var(--accent-cyan)]" />
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[color:var(--text-primary)]">
                  {a.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-[color:var(--text-dim)]">
                  {a.kind} · {prettySize(a.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="shrink-0 text-[color:var(--text-dim)] transition-colors hover:text-[color:var(--accent-red)]"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Optional context — toggle chips */}
      <div className="mt-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
          Add context (optional)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CONTEXT_FLAGS.map((flag) => {
            const active = contextFlags.includes(flag);
            return (
              <button
                key={flag}
                type="button"
                onClick={() => toggleFlag(flag)}
                aria-pressed={active}
                className="rounded-lg border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.04em] transition-all duration-150"
                style={
                  active
                    ? {
                        background: 'var(--accent-cyan-dim)',
                        borderColor: 'var(--accent-cyan)',
                        color: 'var(--accent-cyan)',
                      }
                    : {
                        background: 'transparent',
                        borderColor: 'var(--border)',
                        color: 'var(--text-dim)',
                      }
                }
              >
                {active ? '✓ ' : ''}
                {flag}
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onInvestigate}
        disabled={!canSubmit}
        className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg border font-display text-[13px] uppercase tracking-[0.1em] transition-all duration-150 disabled:opacity-40 ${
          loading ? 'animate-border-pulse' : ''
        }`}
        style={{
          borderColor: 'var(--accent-cyan)',
          color: 'var(--accent-cyan)',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          if (canSubmit) {
            e.currentTarget.style.background = 'var(--accent-cyan-dim)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(57,208,216,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {loading ? (
          <span className="flex h-4 items-end gap-1" aria-label="Analyzing">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1 origin-bottom animate-eq bg-[color:var(--accent-cyan)]"
                style={{ height: '14px', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : (
          'Investigate Case'
        )}
      </button>

      {/* Example chips */}
      <div className="mt-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
          Load example
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_CASES.map((ex, i) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => applyExample(ex)}
              title={ex.label}
              className="rounded-lg border border-dashed border-[color:var(--border-active)] bg-transparent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-secondary)] transition-all duration-150 hover:border-solid hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)]"
            >
              Case {String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
