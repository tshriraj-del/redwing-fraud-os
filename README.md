# Riposte — AI Fraud Prevention Platform

> A production-grade, full-stack AI fraud prevention platform. Five integrated analyst tools. One unified command center. A closed feedback loop that gets smarter with every fraud event.

![Riposte Platform](https://img.shields.io/badge/Riposte-AI%20Fraud%20Platform-818cf8?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20XGBoost%20%7C%20LLM-0ea5e9?style=for-the-badge)
![AUC](https://img.shields.io/badge/Ensemble%20AUC-0.979-22c55e?style=for-the-badge)
![Transactions](https://img.shields.io/badge/Training%20Data-880K%20transactions-f59e0b?style=for-the-badge)

---

## What Is Riposte?

Most fraud platforms react to fraud that already happened. **Riposte learns from fraud that hasn't happened yet** — running an autonomous AI agent that detects and blocks AI-driven fraud in real time, retraining on novel patterns nightly, and self-generating rules before fraudsters reach production.

It combines:
- **Supervised + unsupervised ML** for transaction scoring (XGBoost + IsolationForest, AUC 0.979)
- **Autonomous AI fraud agent** that detects card testing bots, ATO bots, deepfakes, credential stuffing, synthetic identity farms, and adversarial ML attacks — real-time, 24/7
- **LLM-powered rule generation** that closes the gap between ML and rules automatically
- **Real-time network graph analysis** for fraud ring detection
- **AI investigation copilot** for structured case analysis
- **EU AI Act Article 14 compliance** via human-in-the-loop case review

All five analyst tools are wired together in a single command center with a shared feedback loop.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Fraud OS  (port 5173)                         │
│              Unified AI Command Center                          │
│  Dashboard · FraudSense · RuleBreaker · SyntheticID Agent       │
│  XAI Lab · SAR Writer · ML Detection Lab · Network Intel        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP + SSE
                           ▼
          ┌────────────────────────────────┐
          │   Riposte Operator  (port 8000) │
          │  XGBoost scoring · Rule Factory │
          │  Autonomous Agent · LLM proxy   │
          │  Network graph · XAI engine     │
          └────────────────────────────────┘
```

All LLM calls route through the operator backend — no API keys in the browser.

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

```
SyntheticID Agent detects novel AI fraud pattern
        ↓  novel_attack_buffer fills (10 events)
Rule Factory triggered: gap extraction → LLM analysis → candidate rules
        ↓  backtest against 880K transactions
Quality gate: precision > 78% → auto-deploy | > 55% → shadow | else → reject
        ↓  rule coverage improves
Agent encounters narrowed attack surface → repeat
```

Every other platform trains on historical confirmed fraud. Riposte generates rules for fraud that hasn't happened yet.

---

## Analyst Tools

### Dashboard
Command center overview — live ML metrics (AUC, fraud rate, rule gaps), 5-tool launcher, activity feed.

### SyntheticID Agent
Autonomous AI fraud detection agent backed by the XGBoost ML model. Runs 24/7, classifies every transaction into 7 threat types (card testing bot, ATO bot, deepfake bypass, credential stuffing, synthetic identity farm, adversarial ML, clean), and makes block/flag/allow decisions in real time. Self-learning: novel attack clusters trigger Rule Factory to generate and deploy new rules automatically.

Analyst control center includes:
- **Live Feed** — SSE-streamed blocking decisions with AI signal breakdown
- **Case Review** — human-in-the-loop queue for flagged transactions (EU AI Act Article 14)
- **Agent Settings** — global thresholds, per-threat controls, speed, and 5 special toggles (High Alert Mode, Zero Tolerance Bot, Self-Learning, Human Review Required, Auto-Deploy Rules)

**Tech:** FastAPI · XGBoost · asyncio SSE · React

### FraudSense
LLM-powered fraud investigation copilot. Submit a fraud case and receive a structured 4-stage investigation: risk score 0–100, signal analysis, fraud classification, loss estimate, root cause, and recommended action.

**Tech:** React · LLM proxy (operator backend)

### RuleBreaker
Adversarial rule stress-tester. Tests existing fraud rules against edge cases and adversarial inputs to find detection gaps before they reach production.

**Tech:** React · LLM proxy

### XAI Lab
Explainable AI layer. SHAP feature attribution, model drift monitoring, EU AI Act Article 13 transparency reports, SR 26-02 model risk governance artefacts.

**Tech:** React · FastAPI · SHAP

### SAR Writer
FinCEN Form 111 SAR narrative generator for BSA/AML compliance. 5-W compliance checker, 13 fraud typologies, initial/continuing/corrected filing types.

**Tech:** React · LLM proxy

### ML Detection Lab
Trains and serves the core fraud scoring engine. XGBoost supervised classification + IsolationForest unsupervised anomaly detection. SHAP values explain every prediction.

**Key stats:**
- 880,719 transactions (855K Kaggle + 25K synthetic fraud rows)
- 23 features: velocity (1h/4h/24h/7d/30d), behavioural deviation, rail risk, recipient/device familiarity
- Ensemble AUC: **0.979**

**Tech:** Python · XGBoost · IsolationForest · scikit-learn · SHAP · KMeans

### Network Intelligence
Real-time fraud ring detection graph. Visualises users, devices, and recipients as nodes with transactions as edges. Surfaces shared devices and mule accounts automatically.

- 39 shared devices flagged (same hardware, 3+ user accounts)
- 285 mule accounts flagged (recipients of 5+ fraud transactions)

**Tech:** React · react-force-graph-2d · D3 · FastAPI · pandas

---

## Fraud Typologies Covered

| Typology | Description |
|---|---|
| Card Testing Bot | Automated card validity + limit probing at scale |
| ATO Bot | LLM-assisted credential stuffing + account takeover |
| Synthetic Identity Farm | Fabricated PII + real SSN, aged and monetised |
| Deepfake Bypass | Synthetic voice/video used to authorise transfers |
| Credential Stuffing | Mass credential replay from breach dumps |
| Adversarial ML | Inputs crafted to evade the ML model specifically |
| Pig Butchering | Long-term relationship fraud → crypto investment scam |
| APP Scam | Authorised push payment fraud via social engineering |

---

## Tech Stack

| Category | Technologies |
|---|---|
| ML / Data | Python, XGBoost, IsolationForest, scikit-learn, SHAP, KMeans, pandas, numpy |
| LLM | Server-side only via operator backend LLM proxy |
| Backend | FastAPI, uvicorn, asyncio SSE streaming |
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Visualisation | Recharts (metrics/drift), react-force-graph-2d + D3 (network graph) |
| Data | 880,719 transactions, Jupyter notebook ML pipeline |

---

## Running Locally

### Prerequisites
- Node 18+, Python 3.9+
- LLM API key (Anthropic, OpenAI, Groq, or Mistral)

### 1. ML Models (one-time setup)
```bash
# Run the ML Fraud Engine notebook
jupyter notebook "ML Fraud Engine.ipynb"
# Run all cells — trains XGBoost + IsoForest, saves to ~/pulseml_models/
```

### 2. Operator Backend (port 8000)
```bash
cd operator
echo "ANTHROPIC_API_KEY=your_key_here" > .env
python3 -m uvicorn main:app --port 8000 --reload
```

The operator serves ML scoring, the autonomous SyntheticID agent, Rule Factory, Network graph, XAI engine, and the LLM proxy.

### 3. Fraud OS Dashboard (port 5173)
```bash
cd fraud-os
npm install
npm run dev
# Open http://localhost:5173
```

---

## Scale

| Metric | Value |
|---|---|
| Training transactions | 880,719 |
| ML features | 23 |
| Fraud detection rules | 41 + auto-generated |
| Threat types (autonomous agent) | 7 |
| AI behavioral signals | 5 |
| Ensemble AUC | 0.979 |
| Shared devices detected | 39 |
| Mule accounts detected | 285 |
| Backend port | 8000 (single operator service) |

---

*For defensive and research use only.*
