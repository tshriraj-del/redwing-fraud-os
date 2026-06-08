import { useState, useEffect } from 'react'
import { FileText, ShieldAlert, CheckCircle, Copy, Check, RefreshCw, ChevronDown } from 'lucide-react'
import { callLLM } from '../llm-provider.js'

const TYPOLOGIES = [
  'Structuring / Smurfing',
  'Layering / Integration',
  'Account Takeover (ATO)',
  'Synthetic Identity Fraud',
  'APP Scam (Authorised Push Payment)',
  'Pig Butchering / Investment Scam',
  'Business Email Compromise (BEC)',
  'Wire Fraud',
  'Card Testing / Carding',
  'Trade-Based Money Laundering',
  'Darknet / Crypto Mixing',
  'Deepfake Social Engineering',
  'Mule Account Activity',
  'OFAC SDN / Sanctions Match',
  'PEP (Politically Exposed Person)',
  'Terrorist Financing',
  'Other',
]

const ACTIVITY_TYPES = [
  'BSA/Structuring', 'Fraud — ACH', 'Fraud — Card', 'Fraud — Check',
  'Fraud — Wire', 'Identity Theft', 'Money Laundering', 'Mortgage Loan Fraud',
  'OFAC / Sanctions Violation', 'Securities Fraud', 'Terrorist Financing', 'Other',
]

const FILING_TYPES = ['Initial SAR', 'Continuing Activity SAR', 'Corrected SAR']

const SYSTEM_PROMPT = `You are a senior BSA/AML compliance officer with 15+ years of experience filing Suspicious Activity Reports with FinCEN. You write SAR narratives that meet FinCEN Form 111 standards and pass regulatory examination without findings.

Your narratives are:
- Factual and chronological — no speculation, no editorialising
- Written in third person (e.g. "The subject" not "you" or "I")
- Structured to answer WHO, WHAT, WHEN, WHERE, WHY and HOW explicitly
- Compliant with FinCEN's guidance: SAR Activity Review, BSA/AML Examination Manual
- Appropriately technical: use correct typology terminology (structuring, layering, smurfing, beneficial ownership, KYC, CDD, EDD, etc.)
- Free of PII beyond what is necessary for law enforcement identification
- Clear about which transactions are suspicious and why they deviate from expected activity

OFAC / SANCTIONS CASES: When the typology is "OFAC SDN / Sanctions Match" or activity type is "OFAC / Sanctions Violation":
- Identify the specific OFAC list hit (SDN, OFAC Consolidated, sectoral sanctions, etc.)
- Note the match score and matched entity name from the screening result
- State the blocked or rejected transaction details (amount, counterparty, date)
- Reference 31 CFR Part 501 and applicable Executive Orders
- Note that blocked funds have been frozen pending OFAC guidance
- Flag that a OFAC report (not just a SAR) may also be required within 10 business days
- Recommend escalation to Legal / Chief Compliance Officer immediately

CRITICAL: Respond ONLY with a valid JSON object. No markdown fences, no preamble, no trailing text.`

function buildPrompt(form) {
  return `Generate a complete SAR filing package for the following case.

FILING TYPE: ${form.filingType}
SUBJECT NAME: ${form.subjectName || 'Unknown'}
SUBJECT ACCOUNT(S): ${form.subjectAccounts || 'See narrative'}
SUBJECT OCCUPATION: ${form.subjectOccupation || 'Unknown'}
RELATIONSHIP TO INSTITUTION: ${form.relationship || 'Customer'}
SUSPICIOUS ACTIVITY TYPOLOGY: ${form.typology}
DATE RANGE OF SUSPICIOUS ACTIVITY: ${form.dateFrom} to ${form.dateTo}
TOTAL SUSPICIOUS AMOUNT: $${form.totalAmount || '0'}
PRIOR SAR FILED: ${form.priorSAR ? 'Yes — ' + form.priorSAR : 'No'}
ACTIONS TAKEN: ${form.actionsTaken || 'Account under review'}
CASE NOTES FROM ANALYST: ${form.caseNotes}
${form.transactions ? `\nRAW TRANSACTION DATA:\n${form.transactions}` : ''}

Return this exact JSON structure:

{
  "narrative": "The complete SAR narrative as a single string. 3-5 paragraphs. Chronological. Third person. Covers WHO, WHAT, WHEN, WHERE, WHY, HOW. End with actions taken by the institution.",
  "form_fields": {
    "activity_type": "The most appropriate FinCEN activity type checkbox",
    "instrument_type": "Cash, Wire Transfer, ACH, Check, Credit/Debit Card, Virtual Currency, or Other",
    "amount": "${form.totalAmount || 'TBD'}",
    "date_range_from": "${form.dateFrom}",
    "date_range_to": "${form.dateTo}",
    "filing_type": "${form.filingType}",
    "law_enforcement_contacted": "Yes or No",
    "subject_role": "Initiator, Recipient, Both, or Unknown"
  },
  "compliance_check": {
    "who":   { "present": true, "note": "one sentence" },
    "what":  { "present": true, "note": "one sentence" },
    "when":  { "present": true, "note": "one sentence" },
    "where": { "present": true, "note": "one sentence" },
    "why":   { "present": true, "note": "one sentence" },
    "how":   { "present": true, "note": "one sentence" }
  },
  "examiner_notes": ["note 1", "note 2"]
}`
}

const DEMO_SAR_RESULT = {
  narrative: `On or about March 14, 2026, the subject, John R. Mercer (DOB: 1988-07-22), initiated a series of wire transfers totaling $47,500 from account ending in 4821 held at First Federal Bank, NA. The subject's account, opened in January 2026, exhibited no prior wire transfer activity. The institution's transaction monitoring system generated alerts on March 14, 15, and 16, 2026 for structuring and unusual wire activity.\n\nThe suspicious activity consists of seven wire transfers ranging from $5,200 to $8,900, each executed within a 72-hour window to four separate overseas beneficiary accounts located in Cyprus (×2), Singapore (×1), and the United Arab Emirates (×1). None of the beneficiary accounts had any prior relationship with the subject or with First Federal Bank, NA. Enhanced due diligence (EDD) conducted on March 17, 2026 revealed that the subject had received three ACH credits totaling $51,400 from a U.S.-based LLC incorporated 11 days prior to the credits, whose beneficial ownership could not be verified through standard KYC procedures.\n\nThe transaction pattern — rapid layering through multiple jurisdictions with a newly-incorporated domestic source entity and first-time overseas beneficiaries — is consistent with money laundering typologies described in FinCEN SAR Activity Review Issue 22. The subject declined to provide documentation supporting the business purpose of the transfers when contacted by the institution's fraud operations team on March 17, 2026.\n\nFirst Federal Bank, NA has placed a hold on the subject's account pending further review. All wire transfer capabilities have been suspended. The matter has been escalated to the institution's Chief Compliance Officer and external legal counsel. No prior SARs have been filed on this subject. This SAR is filed within the 30-day reporting requirement (activity detected March 14, 2026; SAR filed March 31, 2026).`,
  form_fields: {
    activity_type: 'Money Laundering',
    instrument_type: 'Wire Transfer',
    amount: '47500',
    date_range_from: '2026-03-14',
    date_range_to: '2026-03-16',
    filing_type: 'Initial SAR',
    law_enforcement_contacted: 'No',
    subject_role: 'Initiator',
  },
  compliance_check: {
    who:   { present: true, note: 'Subject identified with full name, DOB, and account number' },
    what:  { present: true, note: 'Seven wire transfers totaling $47,500 described with amounts and dates' },
    when:  { present: true, note: 'Activity dates March 14–16, 2026 explicitly stated' },
    where: { present: true, note: 'Overseas jurisdictions (Cyprus, Singapore, UAE) identified' },
    why:   { present: true, note: 'Layering pattern and unverifiable source entity noted' },
    how:   { present: true, note: 'Wire transfer mechanism with newly-incorporated source entity described' },
  },
  examiner_notes: [
    'Verify whether subject has a FinCEN 314(b) information-sharing agreement with any correspondent banks involved.',
    'Consider cross-referencing subject name and the four beneficiary account numbers against OFAC SDN list prior to filing.',
    'If subject is a U.S. person and transfers involved blocked countries, a separate OFAC report may be required within 10 business days.',
  ],
};

const DEMO_FORM = {
  filingType: 'Initial SAR',
  subjectName: 'John R. Mercer',
  subjectAccounts: '****4821',
  subjectOccupation: 'Self-employed consultant',
  relationship: 'Customer since January 2026',
  typology: 'Layering / Integration',
  dateFrom: '2026-03-14',
  dateTo: '2026-03-16',
  totalAmount: '47500',
  priorSAR: '',
  actionsTaken: 'Account hold placed. Wire capabilities suspended. Escalated to CCO.',
  caseNotes: 'Seven wire transfers to 4 overseas accounts in 72h. Source: unverifiable LLC incorporated 11 days before credits. Subject declined to explain business purpose.',
  transactions: '',
};

const EMPTY_FORM = {
  filingType: 'Initial SAR',
  subjectName: '',
  subjectAccounts: '',
  subjectOccupation: '',
  relationship: 'Customer',
  typology: 'Structuring / Smurfing',
  dateFrom: '',
  dateTo: '',
  totalAmount: '',
  priorSAR: '',
  actionsTaken: '',
  caseNotes: '',
  transactions: '',
}

export default function SARWriter() {
  const [form, setForm]               = useState(EMPTY_FORM)
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [copied, setCopied]           = useState(false)
  const [activeSection, setActiveSection] = useState('narrative')

  useEffect(() => {
    fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2500) })
      .catch(() => { setForm(DEMO_FORM); setResult(DEMO_SAR_RESULT); });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const generate = async () => {
    if (!form.caseNotes.trim()) { setError('Add case notes before generating.'); return }
    if (!form.dateFrom || !form.dateTo) { setError('Date range is required.'); return }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const raw = await callLLM({
        systemPrompt: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(form) }],
        maxTokens: 4000,
      })
      const text = typeof raw === 'string' ? raw : raw?.content?.[0]?.text ?? raw
      const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
      setResult(JSON.parse(cleaned))
      setActiveSection('narrative')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyNarrative = async () => {
    if (!result?.narrative) return
    await navigator.clipboard.writeText(result.narrative)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const allChecks = result
    ? Object.values(result.compliance_check).every(c => c.present)
    : false

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg-base)', color: 'var(--text)' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 24px 64px', display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT: Input Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <FormCard title="Filing Information">
            <FormRow label="Filing Type">
              <StyledSelect value={form.filingType} onChange={v => set('filingType', v)} options={FILING_TYPES} />
            </FormRow>
            <FormRow label="Suspicious Activity Typology">
              <StyledSelect value={form.typology} onChange={v => set('typology', v)} options={TYPOLOGIES} />
            </FormRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormRow label="Date From">
                <input type="date" value={form.dateFrom} onChange={e => set('dateFrom', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
              </FormRow>
              <FormRow label="Date To">
                <input type="date" value={form.dateTo} onChange={e => set('dateTo', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
              </FormRow>
            </div>
            <FormRow label="Total Suspicious Amount ($)">
              <input type="number" placeholder="e.g. 47500" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
            </FormRow>
          </FormCard>

          <FormCard title="Subject Information">
            <FormRow label="Subject Name">
              <input placeholder="Full legal name or 'Unknown'" value={form.subjectName} onChange={e => set('subjectName', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
            </FormRow>
            <FormRow label="Account Number(s)">
              <input placeholder="e.g. ****4821, ****9034" value={form.subjectAccounts} onChange={e => set('subjectAccounts', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
            </FormRow>
            <FormRow label="Occupation">
              <input placeholder="e.g. Self-employed, Unknown" value={form.subjectOccupation} onChange={e => set('subjectOccupation', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
            </FormRow>
            <FormRow label="Relationship to Institution">
              <input placeholder="e.g. Customer since 2021" value={form.relationship} onChange={e => set('relationship', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
            </FormRow>
          </FormCard>

          <FormCard title="Case Details">
            <FormRow label="Case Notes *" hint="Describe the suspicious activity — what happened, what triggered the review, what's anomalous">
              <textarea
                placeholder="e.g. Customer made 9 cash deposits of $9,800 each over 12 days across 3 branches, totalling $88,200. Amounts consistently just below the $10,000 CTR threshold..."
                value={form.caseNotes}
                onChange={e => set('caseNotes', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', minHeight: 110, resize: 'vertical', lineHeight: 1.6 }}
              />
            </FormRow>
            <FormRow label="Raw Transaction Data" hint="Optional — paste CSV, JSON, or plain text">
              <textarea
                placeholder="date,amount,type,account&#10;2024-01-03,$9800,cash deposit,****4821"
                value={form.transactions}
                onChange={e => set('transactions', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', minHeight: 70, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.55 }}
              />
            </FormRow>
            <FormRow label="Prior SAR Reference" hint="Leave blank if none">
              <input placeholder="e.g. SAR filed 2023-08-15, ref #2309-XXXX" value={form.priorSAR} onChange={e => set('priorSAR', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
            </FormRow>
            <FormRow label="Actions Taken">
              <input placeholder="e.g. Account restricted; law enforcement notified" value={form.actionsTaken} onChange={e => set('actionsTaken', e.target.value)} style={{ width: '100%', padding: '7px 10px' }} />
            </FormRow>
          </FormCard>

          {error && (
            <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#f85149', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 20px',
              background: loading ? 'rgba(240,180,41,0.08)' : 'rgba(240,180,41,0.12)',
              border: '1px solid rgba(240,180,41,0.4)',
              borderRadius: 10, color: '#f0b429',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(240,180,41,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = loading ? 'rgba(240,180,41,0.08)' : 'rgba(240,180,41,0.12)' }}
          >
            {loading ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(240,180,41,0.3)', borderTopColor: '#f0b429', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Generating SAR…
              </>
            ) : (
              <><FileText size={15} /> Generate SAR Narrative</>
            )}
          </button>
        </div>

        {/* RIGHT: Output */}
        <div>
          {!loading && !result && <EmptyState />}
          {loading && <SARSkeleton />}

          {!loading && result && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 10, marginBottom: 16,
                background: allChecks ? 'rgba(63,185,80,0.08)' : 'rgba(240,180,41,0.08)',
                border: `1px solid ${allChecks ? 'rgba(63,185,80,0.3)' : 'rgba(240,180,41,0.3)'}`,
              }}>
                <CheckCircle size={14} color={allChecks ? 'var(--green)' : 'var(--accent)'} />
                <span style={{ fontSize: 13, color: allChecks ? 'var(--green)' : 'var(--accent)', fontWeight: 600 }}>
                  {allChecks ? 'All five Ws present — narrative is FinCEN-compliant' : 'Some five-W elements need attention — see Compliance Check tab'}
                </span>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                {[
                  { id: 'narrative',  label: 'SAR Narrative' },
                  { id: 'fields',     label: 'Form 111 Fields' },
                  { id: 'compliance', label: 'Compliance Check' },
                  { id: 'examiner',   label: 'Examiner Notes' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${activeSection === tab.id ? 'var(--accent)' : 'transparent'}`,
                    color: activeSection === tab.id ? 'var(--text)' : 'var(--text-muted)',
                    padding: '9px 18px', fontSize: 13,
                    fontWeight: activeSection === tab.id ? 600 : 400,
                    cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s ease',
                  }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeSection === 'narrative' && (
                <div>
                  <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '24px 28px',
                    fontSize: 13.5, lineHeight: 1.85, color: 'var(--text)',
                    whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif',
                  }}>
                    {result.narrative}
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                    <button onClick={copyNarrative} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      background: copied ? 'rgba(63,185,80,0.1)' : 'rgba(56,139,253,0.1)',
                      border: `1px solid ${copied ? 'rgba(63,185,80,0.35)' : 'rgba(56,139,253,0.35)'}`,
                      color: copied ? 'var(--green)' : 'var(--blue)', transition: 'all 0.2s ease',
                    }}>
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Copied' : 'Copy Narrative'}
                    </button>
                    <button onClick={() => { setResult(null); setForm(EMPTY_FORM) }} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                    }}>
                      <RefreshCw size={13} /> New SAR
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                      ~{result.narrative.split(' ').length} words
                    </span>
                  </div>
                </div>
              )}

              {activeSection === 'fields' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Suggested values for FinCEN Form 111. Review before filing.</div>
                  {Object.entries(result.form_fields).map(([key, value]) => (
                    <div key={key} style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', gap: 16,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 160 }}>
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'compliance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>All five Ws must be present before filing with FinCEN.</div>
                  {Object.entries(result.compliance_check).map(([key, val]) => (
                    <div key={key} style={{
                      background: val.present ? 'rgba(63,185,80,0.05)' : 'rgba(248,81,73,0.05)',
                      border: `1px solid ${val.present ? 'rgba(63,185,80,0.2)' : 'rgba(248,81,73,0.2)'}`,
                      borderRadius: 10, padding: '14px 16px',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: val.present ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: val.present ? 'var(--green)' : 'var(--red)' }}>
                          {key.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: val.present ? 'var(--green)' : 'var(--red)', marginBottom: 3 }}>
                          {key === 'who' ? 'WHO — Subject identification' :
                           key === 'what' ? 'WHAT — Activity description' :
                           key === 'when' ? 'WHEN — Dates and timeline' :
                           key === 'where' ? 'WHERE — Accounts and jurisdiction' :
                           key === 'why' ? 'WHY — Basis for suspicion' :
                           'HOW — Methodology and scheme'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{val.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'examiner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Pre-filing risk notes. Address these before submitting to FinCEN.</div>
                  {result.examiner_notes.map((note, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '14px 16px',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                      }}>{i + 1}</div>
                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FormCard({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function FormRow({ label, hint, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 500 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5, opacity: 0.7 }}>{hint}</div>}
    </div>
  )
}

function StyledSelect({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '7px 32px 7px 10px', appearance: 'none', cursor: 'pointer' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 480, gap: 18,
      border: '1px dashed var(--border)', borderRadius: 14, padding: 40,
    }}>
      <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(240,180,41,0.07)', border: '1px solid rgba(240,180,41,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={28} color="#f0b429" strokeWidth={1.4} />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>SAR narrative ready to generate</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Fill in the case details on the left. Subject information, date range, and case notes are the most important inputs.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['SAR Narrative', 'Form 111 Fields', 'Compliance Check', 'Examiner Notes'].map(l => (
          <span key={l} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)' }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function SARSkeleton() {
  const Bar = ({ w = '100%', h = 13 }) => <div className="skeleton" style={{ width: w, height: h, marginBottom: 8 }} />
  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['SAR Narrative', 'Form 111 Fields', 'Compliance Check', 'Examiner Notes'].map(t => (
          <div key={t} className="skeleton" style={{ height: 34, width: 130, borderRadius: 8 }} />
        ))}
      </div>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
        <Bar w="60%" h={11} /><div style={{ height: 8 }} />
        <Bar /><Bar /><Bar w="80%" /><div style={{ height: 16 }} />
        <Bar /><Bar /><Bar w="90%" /><Bar w="70%" /><div style={{ height: 16 }} />
        <Bar /><Bar w="85%" /><Bar />
      </div>
    </div>
  )
}
