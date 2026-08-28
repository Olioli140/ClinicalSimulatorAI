import type { ActionValidationResult } from "./actionContracts.js";
import type { AutonomyStepRequest, AutonomousModelDecision } from "./autonomyContracts.js";
import { observableFacts } from "./observer.js";
import { validateActionProposal } from "./actionValidator.js";

export type AutonomyGateResult =
  | { allowed: true }
  | { allowed: false; stopReason: string };

export function evaluateAutonomyGate(request: AutonomyStepRequest): AutonomyGateResult {
  if (request.safety.emergencyStop) return { allowed: false, stopReason: "HOST_EMERGENCY_STOP" };
  if (request.safety.instructorPause) return { allowed: false, stopReason: "INSTRUCTOR_PAUSE" };
  if (request.context.snapshot.phase !== "maintenance") return { allowed: false, stopReason: "OUTSIDE_MAINTENANCE_SCOPE" };
  if (!request.safety.airwaySecured) return { allowed: false, stopReason: "AIRWAY_NOT_SECURED" };
  if (!request.safety.anesthesiaMachineConnected) return { allowed: false, stopReason: "ANESTHESIA_MACHINE_NOT_CONNECTED" };
  if (request.session.elapsedSeconds >= request.config.maxSessionSeconds) return { allowed: false, stopReason: "SESSION_TIME_LIMIT" };
  if (request.session.consecutiveValidatorRejections >= request.config.maxConsecutiveValidatorRejections) {
    return { allowed: false, stopReason: "VALIDATOR_REJECTION_LIMIT" };
  }
  return { allowed: true };
}

export function buildAutonomyPrompt(request: AutonomyStepRequest): { system: string; prompt: string } {
  const facts = observableFacts(request.context.snapshot);
  return {
    system: [
      "You are an autonomous participant in an educational anesthesia simulation, limited to maintenance of an already secured airway.",
      "Follow the cycle OBSERVE -> ASSESS -> PRIORITIZE -> DECIDE -> PROPOSE -> WAIT -> REASSESS.",
      "You cannot execute actions and cannot mutate simulator state.",
      "Only propose actions from the declared whitelist and only when an intervention is justified by supplied observable data.",
      "Prefer hold/reassessment when no intervention is clearly indicated.",
      "Never invent hidden diagnoses, measurements, equipment, medications, or host action outcomes.",
      "A host-side validator and Unified Action API remain authoritative.",
      "Return strict JSON with decision, assessment, priority, reasoningSummary, waitSeconds, optional actionProposal, optional stopReason.",
      "decision must be hold, propose_action, or stop.",
      `Allowed action types: ${request.context.capabilities.allowedActionTypes.join(", ")}.`
    ].join(" "),
    prompt: [
      `Session: ${request.session.sessionId}`,
      `Cycle: ${request.session.cycleIndex}`,
      `Elapsed seconds: ${request.session.elapsedSeconds}`,
      `Consecutive validator rejections: ${request.session.consecutiveValidatorRejections}`,
      `Last host action result: ${JSON.stringify(request.session.lastHostActionResult ?? null)}`,
      "Observable facts:",
      ...facts.map(f => `- ${f}`),
      `Available medications: ${request.context.capabilities.availableMedications.join(", ") || "none"}`,
      `Ventilator modes: ${request.context.capabilities.availableVentilatorModes.join(", ") || "none"}`,
      `IV access: ${request.context.capabilities.hasIvAccess}`,
      `Can request labs: ${request.context.capabilities.canRequestLabs}`,
      `Can request BGA: ${request.context.capabilities.canRequestBga}`,
      `Constraints: ${JSON.stringify(request.context.constraints)}`,
      `Reassessment interval must be between ${request.config.minReassessmentSeconds} and ${request.config.maxReassessmentSeconds} seconds.`
    ].join("\n")
  };
}

export function normalizeWaitSeconds(waitSeconds: number, request: AutonomyStepRequest): number {
  return Math.max(request.config.minReassessmentSeconds, Math.min(waitSeconds, request.config.maxReassessmentSeconds));
}

export function validateAutonomousDecision(
  decision: AutonomousModelDecision,
  request: AutonomyStepRequest
): ActionValidationResult | undefined {
  if (decision.decision !== "propose_action" || !decision.actionProposal) return undefined;
  return validateActionProposal(decision.actionProposal, request.context);
}

export function createAuditEntry(
  decision: AutonomousModelDecision,
  request: AutonomyStepRequest,
  validation?: ActionValidationResult
) {
  return {
    sessionId: request.session.sessionId,
    cycleIndex: request.session.cycleIndex,
    simulatorTimestamp: request.context.snapshot.timestamp,
    phase: "maintenance" as const,
    assessment: decision.assessment,
    priority: decision.priority,
    decision: decision.decision,
    reasoningSummary: decision.reasoningSummary,
    proposal: decision.actionProposal,
    validatorAccepted: validation?.accepted,
    validatorReasons: validation?.reasons ?? [],
    hostExecutionRequired: true as const,
    executedByAiService: false as const,
    nextReassessmentSeconds: normalizeWaitSeconds(decision.waitSeconds, request)
  };
}
