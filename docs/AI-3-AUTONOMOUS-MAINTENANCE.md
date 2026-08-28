# AI-3 — Autonomous Maintenance Participant

## Goal

AI-3 adds a narrow autonomous participant loop for educational anesthesia simulation. It is deliberately restricted to maintenance anesthesia after the airway is already secured and the anesthesia machine is connected.

## Scope

AI-3 may observe, assess, prioritize, decide, propose one allowed action, wait, and reassess.

It is not allowed to:
- induce anesthesia
- manage an unsecured airway
- extubate
- bypass the Action Validator
- directly write simulator physiology or device state
- execute actions itself
- continue after host emergency stop, instructor pause, scope exit, session limit, or repeated validator rejection

## Loop

```text
OBSERVE
  -> ASSESS
  -> PRIORITIZE
  -> DECIDE
  -> PROPOSE or HOLD
  -> VALIDATE
  -> HOST HANDOFF
  -> WAIT
  -> REASSESS
```

## Endpoint

`POST /v1/autonomy/step`

Each call represents exactly one autonomy cycle. The host owns scheduling and calls the next cycle only after the requested reassessment interval.

This is intentional: the AI service does not run an uncontrolled background loop.

## Host safety gates

The model is not called when any hard gate fails:
- phase is not `maintenance`
- airway is not secured
- anesthesia machine is not connected
- host emergency stop is active
- instructor pause is active
- session time limit is reached
- validator rejection limit is reached

## Action authority

AI-3 reuses the AI-2 whitelist and deterministic Action Validator.

Even an accepted action remains:

```text
executable: false
hostExecutionRequired: true
```

The private host simulator must translate an accepted proposal into its own Unified Action API and perform its own final validation before execution.

## Audit trail

Every completed model cycle produces an audit entry containing:
- session/cycle identity
- simulator timestamp
- assessment and priority
- decision and concise reasoning summary
- optional proposal
- validator result/reasons
- next reassessment interval
- explicit proof that the AI service did not execute the action

## Initial benchmark

The first validation target is not crisis management. It is stable maintenance anesthesia in an already intubated patient.

Suggested evaluation window: 30–60 simulated minutes.

Suggested metrics:
- time outside configured MAP range
- time outside configured SpO2 range
- time outside configured EtCO2 range
- inappropriate or unnecessary interventions
- validator rejection count
- repeated-action rate
- action-to-reassessment latency
- host execution failures
- quality of explanations/audit rationale

## Freeze candidate

AI-3 can be considered a candidate for validation freeze when it can repeatedly complete stable maintenance scenarios while:
1. remaining inside scope,
2. producing only schema-valid decisions,
3. using only whitelisted actions,
4. honoring host stops immediately,
5. requiring host execution for every action,
6. preserving a complete audit trail.

## Next sprint — AI-3V

AI-3V should focus on deterministic mock-host simulation, batch scenario replay, quantitative metrics, failure injection, and 100+ automated maintenance runs before expanding autonomy into induction, emergence, or crises.
