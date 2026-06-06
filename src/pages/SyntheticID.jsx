import { useState } from 'react';
import { callLLM } from '../llm-provider.js';
import InputPanel from '../syntheticid/InputPanel';
import AttackTimeline from '../syntheticid/AttackTimeline';
import DetectionGapMap from '../syntheticid/DetectionGapMap';
import ExposureScore from '../syntheticid/ExposureScore';
import Recommendations from '../syntheticid/Recommendations';

const SYSTEM_PROMPT = `You are a senior fraud intelligence analyst specializing in adversarial AI threat modeling at a top-tier fintech. Your role is to produce precise, technical attack simulations showing how an autonomous AI fraud agent would attack a given platform's onboarding or verification flow.

Write in the tone of a threat intelligence report: clinical, specific, and technical. Not sensationalist. Use real tool names, real fraud techniques, and real detection methods where appropriate.

Return ONLY valid JSON. No preamble, no markdown fences, no commentary. Your response must be parseable directly by JSON.parse().`;

function buildPrompt(platform, sophistication, defenses) {
  const defenseList = defenses.length ? defenses.join(', ') : 'None configured';
  return `Platform being attacked: ${platform}
Attack sophistication level: ${sophistication}
Defenses currently deployed: ${defenseList}

Generate a realistic, technically accurate attack simulation. Return exactly this JSON structure:

{
  "attack_timeline": [
    { "step": 1, "name": "...", "description": "...", "targeted_defense": "...", "outcome": "BYPASSED or DETECTED or UNCERTAIN", "outcome_reason": "..." }
  ],
  "detection_gap_map": {
    "existing_defenses": [{ "defense": "...", "effective": "Yes or Partial or No", "reason": "...", "circumvention": "..." }],
    "missing_defenses": [{ "defense": "...", "exposed_surface": "...", "exploitation_difficulty": "Easy or Medium or Hard" }]
  },
  "exposure_scores": {
    "identity_spoofability": 0, "liveness_bypassability": 0, "signal_evasion": 0,
    "scale_potential": 0, "recovery_speed": 0, "overall": 0, "verdict": "..."
  },
  "recommendations": [{ "defense": "...", "rationale": "...", "implementation_difficulty": "Low or Medium or High", "estimated_fraud_reduction": "..." }]
}

Requirements:
- attack_timeline: 7-9 steps covering the full lifecycle
- existing_defenses: include ALL ${defenses.length} defenses from the deployed list
- missing_defenses: 3-5 critical gaps specific to this platform type
- recommendations: exactly 4 items, ranked by ROI
- Scores honestly reflect actual risk (strong defenses → lower scores)`;
}

export default function SyntheticID() {
  const [results, setResults]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [platform, setPlatform]   = useState('');
  const [sophistication, setSoph] = useState('Advanced');
  const [defenses, setDefenses]   = useState([]);

  async function handleAnalyze() {
    if (!platform.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const raw = await callLLM({
        systemPrompt: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(platform, sophistication, defenses) }],
        maxTokens: 4000,
      });
      const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setResults(json);
    } catch (e) {
      setError(e.message ?? 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100%', overflowY: 'auto', padding: 24,
      background: 'var(--bg-base)', color: 'var(--text)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <InputPanel
        platform={platform} setPlatform={setPlatform}
        sophistication={sophistication} setSophistication={setSoph}
        defenses={defenses} setDefenses={setDefenses}
        onAnalyze={handleAnalyze} loading={loading}
      />

      {error && (
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 8,
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          color: 'var(--red)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Running threat simulation…
        </div>
      )}

      {results && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AttackTimeline timeline={results.attack_timeline} />
          <DetectionGapMap gapMap={results.detection_gap_map} />
          <ExposureScore scores={results.exposure_scores} />
          <Recommendations recommendations={results.recommendations} />
        </div>
      )}
    </div>
  );
}
