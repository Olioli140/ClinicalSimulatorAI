import type { IntegrationMode, IntegrationSafetyState, SimulatorActionHandoff, SimulatorSnapshotEnvelope } from "./integrationContracts.js";

export type IntegrationGateResult = { allowed: true } | { allowed: false; reason: string };

export function canObserve(envelope: SimulatorSnapshotEnvelope, safety: IntegrationSafetyState): IntegrationGateResult {
  if (envelope.mode === "off") return { allowed: false, reason: "AI_MODE_OFF" };
  if (safety.emergencyStop) return { allowed: false, reason: "HOST_EMERGENCY_STOP" };
  return { allowed: true };
}

export function canHandoffAction(
  mode: IntegrationMode,
  safety: IntegrationSafetyState,
  envelope: SimulatorSnapshotEnvelope,
  handoff: SimulatorActionHandoff
): IntegrationGateResult {
  if (mode === "off" || mode === "explain" || mode === "shadow") {
    return { allowed: false, reason: "MODE_DOES_NOT_ALLOW_HOST_ACTION" };
  }
  if (safety.emergencyStop) return { allowed: false, reason: "HOST_EMERGENCY_STOP" };
  if (safety.instructorPause) return { allowed: false, reason: "INSTRUCTOR_PAUSE" };
  if (handoff.sessionId !== envelope.sessionId) return { allowed: false, reason: "SESSION_MISMATCH" };
  if (handoff.basedOnSequence !== envelope.sequence) return { allowed: false, reason: "STALE_SNAPSHOT" };

  if (mode === "autonomous_maintenance") {
    if (!safety.autonomyEnabledByHost) return { allowed: false, reason: "AUTONOMY_NOT_ENABLED_BY_HOST" };
    if (envelope.snapshot.phase !== "maintenance") return { allowed: false, reason: "OUTSIDE_MAINTENANCE_SCOPE" };
    if (!safety.airwaySecured) return { allowed: false, reason: "AIRWAY_NOT_SECURED" };
    if (!safety.anesthesiaMachineConnected) return { allowed: false, reason: "ANESTHESIA_MACHINE_NOT_CONNECTED" };
  }

  return { allowed: true };
}
