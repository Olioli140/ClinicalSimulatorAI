# ClinicalSimulatorAI

Offline-first AI framework for autonomous participants, clinical reasoning, and explainable tutoring in medical simulation.

## Project goal

ClinicalSimulatorAI provides a simulator-agnostic AI layer that can observe structured clinical state, propose constrained actions, and explain decisions without owning the physiological truth of the simulation.

The host simulator remains authoritative for physiology, devices, pharmacology, events, and action execution.

## AI roadmap

- **AI-0 — Local Foundation**: local runtime, contracts, health checks, deterministic gateway behavior.
- **AI-1 — Clinical Observer + Explain**: structured state interpretation and participant-facing explanations.
- **AI-2 — Controlled Action Bridge**: validated, whitelisted simulator actions only.
- **AI-3 — Autonomous Participant**: closed-loop stable anesthesia management with reassessment.
- **AI-3V — Validation**: automated scenario testing, safety metrics, replay and regression gates.

## Architecture principle

```text
Host Simulator
   |
   v
AIStateSnapshot
   |
   v
Local AI Gateway ---> Local LLM (initially Ollama)
   |
   v
AIProposal
   |
   v
Host-side validation + Unified Action API
```

The AI must never directly mutate vital signs or hidden physiology.

## AI-0 quick start

Requirements:

- Node.js 20+
- npm 10+
- Ollama installed locally
- a local model, configured with `OLLAMA_MODEL`

```bash
npm install
cp .env.example .env
npm run dev
```

Then open `http://localhost:8787/health`.

## Safety scope

This repository is intended for medical simulation, education, and software research. It is not a clinical decision support system and must not be used to guide real-world patient care.

## License

License selection is intentionally deferred until the project owner chooses the desired open-source terms.
