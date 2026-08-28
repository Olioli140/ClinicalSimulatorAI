# AI-2 — Controlled Action Bridge

## Goal

AI-2 allows the local model to propose one simulator action, but never to execute it directly.

## Invariant

```text
AI proposal
  -> schema validation
  -> deterministic Action Validator
  -> host approval / Unified Action API
  -> simulator physiology
```

The AI service has no authority to mutate the simulator.

## Whitelisted action families

- `VENT_SET`
- `VENT_MODE_CHANGE`
- `MED_BOLUS`
- `MED_INFUSION_START`
- `MED_INFUSION_ADJUST`
- `MED_INFUSION_STOP`
- `FLUID_GIVE`
- `REQUEST_NIBP`
- `REQUEST_LAB`
- `REQUEST_BGA`

The host declares a narrower capability set for each scenario. An action is rejected if it is outside that set.

## Validator responsibilities

The deterministic validator checks, where applicable:

- action type capability
- IV access
- medication availability
- bolus positivity and configured maximums
- fluid volume maximums
- ventilator mode availability
- lab/BGA request capability
- repeated-action cooldown

These checks are intentionally independent of the LLM.

## Endpoint

`POST /v1/propose-action`

The endpoint returns:

- model proposal
- validator result
- `executable: false`
- handoff state

Even an accepted proposal requires the host simulator to translate it to its Unified Action API and perform its own capability and clinical validation.

## Integration contract

The public AI project does not depend on private simulator internals. The host provides:

1. `AiStateSnapshot`
2. scenario/device capabilities
3. explicit constraints

The AI returns a validated proposal. Integration code in the host maps accepted proposals onto its existing Action API.

## Non-goals in AI-2

- autonomous closed-loop anesthesia
- direct physiological mutation
- direct device control
- hidden-state access
- unrestricted medication choice
- bypass of simulator validation

## Acceptance criteria

- only whitelisted action schemas parse
- host capabilities can narrow the whitelist
- unavailable drugs/modes are rejected
- safety limits reject invalid proposals
- accepted proposals remain non-executable inside this service
- CI typecheck, tests and build pass

## Next sprint: AI-3

AI-3 adds an autonomous participant loop (`OBSERVE -> ASSESS -> PRIORITIZE -> PROPOSE -> VALIDATE -> HOST ACT -> WAIT -> REASSESS`) for a deliberately narrow stable-maintenance scenario first.
