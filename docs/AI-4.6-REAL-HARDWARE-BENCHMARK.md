# AI-4.6 — Real Hardware / Non-Thinking Benchmark

## Purpose
Run the local model benchmark against a real Ollama installation before private simulator integration.

This sprint measures engineering suitability only. It is not clinical validation and does not certify medical correctness.

## Runtime controls
Each case is isolated in a fresh `/api/generate` request and uses:

- `think: false`
- `stream: false`
- JSON Schema structured output
- `temperature: 0`
- bounded output (`num_predict: 96`)
- observable-data-only system instruction

The runner records wall-clock latency plus Ollama telemetry when available: total/load duration, output token count, token generation speed, JSON validity, and unexpected thinking output.

## Reference hardware
Initial deployment target:

- Intel Core i7-8665U
- 24 GB RAM
- Intel UHD 620
- CPU inference assumed

## Windows quick start
From PowerShell:

```powershell
git clone https://github.com/Olioli140/ClinicalSimulatorAI.git
cd ClinicalSimulatorAI
npm install
npm run benchmark:real -- --model qwen3:4b
```

If the repository is already cloned:

```powershell
cd <path-to-ClinicalSimulatorAI>
git pull
npm install
npm run benchmark:real -- --model qwen3:4b
```

The command writes a JSON report such as `benchmark-qwen3-4b.json` in the project directory.

## Comparison
After the 4B run, install and test the reference model:

```powershell
ollama pull qwen3:8b
npm run benchmark:real -- --model qwen3:8b
```

Compare JSON success, unexpected thinking, p50/p95 latency, token speed, failures, and later the clinical/grounding score from AI-4.5. A faster model should not be selected if it is materially worse on grounding or safe no-action behavior.

## Important boundary
The benchmark must never send private simulator truth, hidden diagnoses, patient-identifying data, or instructor-only state to the public test fixtures.
