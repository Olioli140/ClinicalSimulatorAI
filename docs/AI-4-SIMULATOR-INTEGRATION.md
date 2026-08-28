# AI-4 — Simulator Integration Contract

AI-4 defines the public, simulator-agnostic boundary between ClinicalSimulatorAI and a host clinical simulator. It deliberately does not contain private AnesthesiaSimulator internals.

## Data flow

Host simulator -> `SimulatorSnapshotEnvelope` -> ClinicalSimulatorAI -> `SimulatorActionHandoff` -> host validator / Unified Action API -> `SimulatorActionResult`.

The host remains authoritative for physiology, device state, action execution and safety controls. ClinicalSimulatorAI must never directly mutate physiological state.

## Modes

- `off`: no AI observation or action.
- `explain`: read-only participant explanations.
- `shadow`: AI may generate proposals for audit/comparison, but proposals cannot be handed to the host for execution.
- `controlled`: proposals may be handed to the host after normal validation; host execution remains authoritative.
- `autonomous_maintenance`: bounded autonomous maintenance only after explicit host enablement and hard safety gates.

## Safety invariants

Autonomous maintenance requires all of the following:

1. Host explicitly enabled autonomy.
2. Current simulator phase is `maintenance`.
3. Airway is secured.
4. Anesthesia machine is connected.
5. Instructor pause is false.
6. Emergency stop is false.
7. Proposal belongs to the current session.
8. Proposal is based on the current snapshot sequence.

A proposal based on an older sequence is rejected as `STALE_SNAPSHOT`.

## Private AnesthesiaSimulator adapter

The private simulator should implement an adapter that:

1. maps only participant-observable state into `AiStateSnapshot`;
2. never exposes hidden event truth or latent physiology to the AI;
3. maps accepted `SimulatorActionHandoff` objects into the existing Unified Action API;
4. returns the real host action result and action ID;
5. records the complete audit trail;
6. exposes instructor pause and emergency stop outside the AI process.

## Recommended rollout

Integration should be activated progressively:

1. `off`
2. `explain`
3. `shadow`
4. `controlled`
5. `autonomous_maintenance`

Do not jump directly from mock-host validation to autonomous control of the real simulator. First compare shadow proposals against participant/expert actions and inspect the audit trail.

## Scope

AI-4 is an integration contract, not clinical validation. Medical performance must be validated against the real deterministic simulator core and expert reference scenarios before any broader autonomy scope is enabled.
