# REDWING — AI Fraud Detection Platform

> A production-grade, full-stack AI fraud detection platform. Five interconnected systems. One unified command center. A closed feedback loop that gets smarter with every fraud event.

![REDWING Platform](https://img.shields.io/badge/REDWING-AI%20Fraud%20Platform-818cf8?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20XGBoost%20%7C%20LLM-0ea5e9?style=for-the-badge)
![AUC](https://img.shields.io/badge/Ensemble%20AUC-0.979-22c55e?style=for-the-badge)
![Transactions](https://img.shields.io/badge/Training%20Data-880K%20transactions-f59e0b?style=for-the-badge)

---

## What Is REDWING?

Most fraud platforms react to fraud that already happened. **REDWING learns from fraud that hasn't happened yet** — simulating tomorrow's attacks today, retraining on them tonight, and deploying countermeasures before fraudsters reach production.

It combines:
- **Supervised + unsupervised ML** for transaction scoring
- **LLM-powered rule generation** that closes the gap between ML and rules automatically
- **Adversarial attack simulation** that feeds labelled training signal back into the ML pipeline
- **Real-time network graph analysis** for fraud ring detection
- **AI investigation copilot** for structured case analysis

All five systems are wired together in a single command center with live health checks, real-time metrics, and a shared feedback loop.

---

## The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRAUD OS  (port 5179)                     │
│              Unified AI Command Center                       │
└──────┬──────────┬──────────┬──────────┬────────────┬────────┘
       │          │          │          │            │
  FraudSense  Rule Factory  ML Lab  Network Intel  SyntheticID
  (5175)       (8000)       (8001)    (8000)        (5177)
```

### 4-Layer Scoring Pipeline

Every transaction runs through four layers before a decision:

| Layer | Weight | What It Does |
|---|---|---|
| Rule Engine | 40% | 41 rules across 6 fraud typologies |
| ML Ensemble | 45% | XGBoost (70%) + IsolationForest (30%) |
| Behavioral Baselines | 15% | 30/60/90-day rolling user profiles |
| Rail Thresholds | Override | Crypto, FedNow, RTP, Zelle-specific gates |

**Output:** `APPROVE` / `REVIEW` / `ESCALATE` / `DECLINE`

---

## The Self-Improvement Loop

This is what separates REDWING from conventional fraud platforms:

```
SyntheticID simulates AI fraud agent attack
        ↓  BYPASSED steps → /syntheticid/ingest
Operator appends labelled fraud gap rows (typology + rule_score=0)
        ↓  extract_rule_gaps: ensemble_score > 0.70, rule_score < 30
Rule Factory sends gaps to Claude → generates candidate rules
        ↓  backtest against 880K transactions
Quality gate: precision > 78% → auto-deploy | > 55% → shadow | else → reject
        ↓  rule coverage improves
SyntheticID finds new attack surfaces → repeat
```

Every other platform trains on historical confirmed fraud. REDWING generates rules for fraud that hasn't happened yet.

---

## Systems

### 🖥 Fraud OS — Unified Command Center
The dashboard that ties everything together. Live health polling across all systems, real AUC from the ML server, rule gap counts from the operator, activity feed, and one-click navigation into every tool.

**Tech:** React 18 · Vite · Tailwind CSS · React Router v6 · Recharts · lucide-react

---

### 🧠 ML Detection Lab
Trains and serves the core fraud scoring engine. XGBoost handles supervised classification; IsolationForest handles unsupervised anomaly detection for novel attacks with no prior label. SHAP values explain every prediction.

**Key stats:**
- 880,719 transactions (855K Kaggle + 25K synthetic fraud rows)
- 23 features: velocity (1h/4h/24h/7d/30d), behavioural deviation, rail risk, recipient/device familiarity, cross-typology indicators
- Ensemble AUC: **0.979**
- KMeans (5 clusters) for behavioural profiling per user
- Served via FastAPI on port 8001 with `/score`, `/drift`, `/features`, `/health` endpoints

**Tech:** Python · XGBoost · IsolationForest · scikit-learn · SHAP · KMeans · pandas · FastAPI · Jupyter

---

### ⚡ Rule Factory
A self-improving rule engine powered by Claude. Detects transactions where ML fired with high confidence but no rule triggered — sends those gaps to Claude, which generates candidate rules, backtests them, and auto-deploys the ones that pass the quality gate.

**Quality gate:**
- Precision > 78% → **auto-deploy**
- Precision > 55% → **shadow mode** (monitor before promoting)
- Below 55% → **rejected**

**Tech:** Python · FastAPI · Claude Sonnet 4.6 · pandas · React · Vite

---

### 🔴 SyntheticID Lab → [repo](https://github.com/tshriraj-del/syntheticid-lab)
Adversarial identity stress-tester. Simulates a full AI fraud agent attack (7–9 steps: recon → identity construction → document fabrication → onboarding bypass → account establishment → fraud execution → evasion) against any platform. Every BYPASSED attack step is converted to a labelled fraud gap row and fed directly into Rule Factory as training signal — the only source in the stack that generates typology-labelled data Rule Factory can learn from.

**Tech:** React · Vite · Tailwind · Claude Sonnet 4.6

---

### 🔍 FraudSense → [repo](https://github.com/tshriraj-del/fraudsense)
LLM-powered fraud investigation copilot. Submit a fraud case and receive a structured 4-stage investigation: risk score 0–100, signal analysis, fraud classification, loss estimate, root cause, and recommended action.

**Tech:** React · Vite · Tailwind · Claude Sonnet 4.6

---

### 🕸 Network Intelligence
Real-time fraud ring detection graph. Visualises users, devices, and recipients as nodes with transactions as edges. Surfaces shared devices (synthetic identity farms) and mule accounts automatically. Built on the full 880K-row transaction dataset.

**Live from current dataset:**
- 39 shared devices flagged (same hardware, 3+ user accounts)
- 285 mule accounts flagged (recipients of 5+ fraud transactions)

**Tech:** React · react-force-graph-2d · D3 · FastAPI · pandas

---

### 📄 SAR Writer → [repo](https://github.com/tshriraj-del/sar-writer)
FinCEN Form 111 SAR narrative generator for BSA/AML compliance. Input a fraud case and get back a compliant SAR narrative, Form 111 structured field mapping, a five-W compliance checker (WHO/WHAT/WHEN/WHERE/WHY/HOW), and pre-filing examiner notes. Supports 13 fraud typologies, initial/continuing/corrected filing types.

**Tech:** React · Vite · Tailwind

---

### 📋 RuleBreaker → [repo](https://github.com/tshriraj-del/rulebreaker)
Standalone adversarial rule stress-tester. Tests existing fraud rules against edge cases and adversarial inputs to find detection gaps before they reach production.

**Tech:** React · Vite · Claude Sonnet 4.6

---

## Fraud Typologies Covered

| Typology | Description |
|---|---|
| Synthetic Identity | Fabricated PII + real SSN, aged and monetised |
| AI-Powered ATO | LLM-assisted credential stuffing + account takeover |
| Deepfake Social Engineering | Synthetic voice/video used to authorise transfers |
| Pig Butchering | Long-term relationship fraud → crypto investment scam |
| APP Scam | Authorised push payment fraud via social engineering |
| Card Testing Bot | Automated card validity + limit probing at scale |

---

## Tech Stack

| Category | Technologies |
|---|---|
| ML / Data | Python, XGBoost, IsolationForest, scikit-learn, SHAP, KMeans, pandas, numpy |
| LLM | Claude Sonnet 4.6 (Anthropic API) — server-side + browser |
| Backend | FastAPI, uvicorn, SSE streaming |
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Visualisation | Recharts (metrics/drift), react-force-graph-2d + D3 (network graph) |
| Data | 880,719 transactions, Jupyter notebook ML pipeline |

---

## Running Locally

### Prerequisites
- Node 18+, Python 3.9+
- Anthropic API key

### 1. ML Models (one-time setup)
```bash
# Run the ML Fraud Engine notebook
jupyter notebook "ML Fraud Engine.ipynb"
# Run all cells — trains XGBoost + IsoForest, saves to ~/pulseml_models/
```

### 2. ML Server (port 8001)
```bash
cd ~/pulseml_models
python3 server.py
```

### 3. Operator / Rule Factory Backend (port 8000)
```bash
cd operator
echo "ANTHROPIC_API_KEY=your_key_here" > .env
python3 -m uvicorn main:app --port 8000 --reload
```

### 4. Fraud OS Dashboard (port 5179)
```bash
cd fraud-os
npm install
npm run dev
# Open http://localhost:5179
```

### 5. FraudSense (port 5175) — optional
```bash
cd fraudsense
echo "VITE_ANTHROPIC_API_KEY=your_key_here" > .env
npm run dev
```

### 6. SyntheticID Lab (port 5177) — optional
```bash
cd syntheticid-lab
echo "VITE_ANTHROPIC_API_KEY=your_key_here" > .env
npm run dev
```

---

## Scale

| Metric | Value |
|---|---|
| Training transactions | 880,719 |
| ML features | 23 |
| Fraud detection rules | 41 + auto-generated |
| Fraud typologies | 6 |
| Ensemble AUC | 0.979 |
| Shared devices detected | 39 |
| Mule accounts detected | 285 |
| Microservices | 5 (ports 5175, 5177, 5179, 8000, 8001) |

---

*For defensive and research use only.*
