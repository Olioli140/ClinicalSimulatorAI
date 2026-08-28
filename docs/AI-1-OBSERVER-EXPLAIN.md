# AI-1 — Clinical Observer + Explain Layer

## Goal

AI-1 turns the AI-0 local runtime into a read-only clinical observer for simulation education.

## Hard boundary

AI-1 cannot execute simulator actions and cannot mutate physiology, devices, medication state, events, or scenario state.

The host simulator sends a deliberately restricted `AiStateSnapshot`. Hidden truth such as active event identifiers, latent physiology, instructor-only diagnoses, scoring keys, or future scenario events must never be included.

## Endpoint

`POST /v1/explain`

Input:
- observable clinical snapshot
- participant question
- teaching mode: `minimal`, `tutor`, or `learning`

Output:
- assessment
- priority
- explanation
- evidence actually present in the snapshot
- plausible possibilities
- what to watch next
- limitations/uncertainty

## Teaching modes

- `minimal`: concise situational explanation
- `tutor`: clear clinical reasoning
- `learning`: reasoning plus alternatives and discriminating observations

## Safety and epistemic rules

1. Observations and interpretations remain distinct.
2. The model must not invent values or hidden simulator state.
3. Diagnoses are expressed as interpretations/possibilities unless directly observable.
4. Model output is schema validated before it reaches the host UI.
5. Invalid JSON or schema-invalid output is rejected rather than silently accepted.
6. AI-1 has no action endpoint.

## Integration pattern

```text
Host Simulator
    |
    | restricted observable snapshot
    v
AiStateSnapshot schema
    |
    v
Clinical Observer
    |
    v
Local LLM
    |
    v
ExplainResponse validation
    |
    v
Participant UI: Explain / Why?
```

## Acceptance criteria

- Hidden-state fields are rejected by the strict snapshot schema.
- Explanation generation works without an internet connection when the local model is available.
- AI output is rejected if it is not valid structured JSON.
- No simulator mutation path exists in AI-1.
- Tests verify observer boundary behavior.
- CI typecheck, tests and build pass.

## Next sprint

AI-2 introduces proposed actions behind a strict whitelist and Action Validator. AI proposals remain non-authoritative: only the simulator Unified Action API may execute accepted actions.
