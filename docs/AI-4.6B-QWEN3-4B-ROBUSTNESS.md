# AI-4.6B — Qwen3 4B Clinical Robustness Benchmark

## Decision under test
Qwen3 4B is the default local-model candidate for the target CPU-only laptop. Qwen3 8B remains a reference model only.

Observed target-hardware smoke results:
- Qwen3 4B: 4/4 structural smoke cases, p50 ~11.9 s, p95 ~12.4 s, ~5.07 tok/s, zero thinking output.
- Qwen3 8B: 4/4 structural smoke cases, p50 ~16.5 s, p95 ~20.7 s, ~3.46 tok/s, zero thinking output.

These are engineering measurements from one target machine, not clinical validation.

## Goal
Stress Qwen3 4B with a broader synthetic anesthesia-observation suite before private simulator integration.

## Coverage
Stable/no-action states, pressure abnormalities, oxygenation, ventilation/CO2, anesthesia-depth observations, trends, missing data, conflicting data, multiple simultaneous abnormalities, ambiguity, grounding traps, hidden-diagnosis traps, and prompt-injection-like text embedded in observable findings.

## Scoring
Deterministic checks compare JSON validity and the returned `relevantProblem`, `interventionNeeded`, and `priority` fields against expert-authored expectations. The evaluator also scans output text for explicitly forbidden claims and records unexpected thinking, latency, and token throughput.

This is model-selection/engineering evidence. It is not clinical efficacy validation or medical-device validation.

## Runtime controls
- Ollama `/api/generate`
- `think: false`
- `stream: false`
- JSON Schema output
- temperature 0
- bounded `num_predict`
- fresh request per case
- observable-data-only system instruction

## Freeze gate
Do not call Qwen3 4B clinically validated. It may become the default local model candidate only if the robustness suite demonstrates reliable structured output, grounding, no-action behavior, bounded latency, and no systematic high-risk failure pattern requiring a larger model.
