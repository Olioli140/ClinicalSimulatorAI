# AI-0 — Local Foundation Architecture Freeze

Status: initial foundation candidate

## Purpose

AI-0 establishes a local, offline-capable AI boundary for medical simulation. It does not implement clinical reasoning, autonomous actions, or physiology.

## Invariants

1. The host simulator is authoritative for physiology and device state.
2. The AI layer never directly writes vital signs or hidden patient state.
3. AI-0 communicates through explicit schemas only.
4. Local inference is the default path; cloud inference is not required.
5. The gateway binds to localhost by default.
6. Provider-specific code is isolated so Ollama can later be replaced by llama.cpp or another local runtime.
7. Failure of the AI runtime must degrade gracefully and must never stop the host simulation.

## AI-0 interfaces

### GET /health

Returns provider status, configured model, latency, and optional detail.

### POST /v1/generate

Input:

```json
{
  "system": "optional system instruction",
  "prompt": "required prompt",
  "temperature": 0.1
}
```

Output:

```json
{
  "provider": "ollama",
  "model": "configured model",
  "output": "generated text",
  "latencyMs": 123
}
```

## Explicitly out of scope for AI-0

- clinical state snapshots
- diagnosis or clinical interpretation
- drug or ventilator actions
- autonomous participant loops
- participant teaching logic
- real patient decision support

These enter in AI-1 through AI-3 only after the contracts are defined and validated.

## Acceptance criteria

- TypeScript project builds under Node.js 20+.
- Request schema rejects invalid payloads.
- Local gateway starts without cloud credentials.
- `/health` reports `ready`, `degraded`, or `offline` without crashing.
- generation calls have a finite timeout.
- no endpoint can mutate simulator state.
