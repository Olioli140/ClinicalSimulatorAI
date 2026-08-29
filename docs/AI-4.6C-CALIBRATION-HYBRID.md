# AI-4.6C — Benchmark Calibration & Hybrid Observer

## Why this sprint exists
The first 40-case Qwen3 4B robustness run produced 13/40 strict classification passes (32.5%) while preserving 40/40 forbidden-claim grounding, valid structured output, and zero visible thinking output. Several failures were clear false negatives (for example low MAP, low SpO2 and abnormal BIS), while others exposed ambiguity in the benchmark itself (missing monitor vs physiologic problem, trend-only relevance, severity disagreements).

AI-4.6C therefore does two things without changing simulator truth:

1. Calibrates the prior benchmark result into `confirmed-model-error`, `boundary-case`, and `passed` categories.
2. Adds a realistic hybrid path where a deterministic observer supplies diagnosis-free observable flags before Qwen3 4B performs language/prioritization work.

## Important architecture boundary
The deterministic observer may emit only observable-state labels such as:
- `MAP_LOW`
- `SPO2_LOW`
- `ETCO2_HIGH`
- `BIS_HIGH`
- `TREND_WORSENING`
- `REQUIRED_MONITOR_MISSING`
- `SIGNAL_QUALITY_POOR`
- `DATA_AMBIGUOUS`

It must never emit hidden event truth or etiologic diagnoses. The LLM still must not invent diagnoses.

This models the intended simulator architecture: deterministic physiology/observer logic remains authoritative and fast; the LLM handles interpretation, prioritization, explanation and later constrained action proposals.

## Run on target hardware
```powershell
npm run benchmark:hybrid -- --model qwen3:4b
```

The output file is `hybrid-qwen3-4b.json`.

## What to compare
Compare the hybrid result with the prior raw 40-case run:
- strict classification success
- grounding success
- performance on cases previously tagged `confirmed-model-error`
- performance on `boundary-case` cases
- p50/p95 latency
- token throughput
- unwanted thinking output

The hybrid benchmark intentionally keeps the original expected classifications so improvement cannot come from simply relaxing answers after seeing model output.

## Interpretation
A large improvement in the confirmed-model-error subset supports Qwen3 4B as a language/prioritization layer behind deterministic observer logic. Failure despite explicit diagnosis-free observer flags suggests that the model itself is too unreliable for the relevant classification task.

Boundary cases should not be used alone to accept or reject the model; they need expert review and may later motivate a richer output contract separating `physiologicProblem`, `monitoringProblem`, `uncertainty`, and `requiresAction`.

## Scope
Engineering/model-selection evidence only. Not clinical efficacy validation, not a medical-device validation, and not permission for autonomous patient care.