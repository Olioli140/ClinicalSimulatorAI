import { describe, expect, it } from "vitest";
import { AutonomyStepRequestSchema, AutonomousModelDecisionSchema, AutonomyAuditEntrySchema } from "../src/autonomyContracts.js";
import { createAuditEntry, evaluateAutonomyGate, normalizeWaitSeconds, validateAutonomousDecision } from "../src/autonomyLoop.js";

const baseRequest = AutonomyStepRequestSchema.parse({
  context: {
    snapshot: {
      timestamp: 300,
      phase: "maintenance",
      patient: { ageYears: 55, weightKg: 80, asa: 2 },
      vitals: { hr: 72, map: 68, spo2: 98, etco2: 38 },
      anesthesia: { mac: 0.8, bis: 48, tofRatio: 0.4 },
      ventilation: { mode: "VCV", fio2: 0.4, vtMl: 480, rr: 12, peepCmH2O: 5, minuteVentilationLMin: 5.8, peakPressureCmH2O: 20 },
      medications: [{ name: "norepinephrine", route: "IV", rate: 0.02, rateUnit: "ug/kg/min" }],
      visibleFindings: [],
      trends: [],
      recentActions: []
    },
    capabilities: {
      allowedActionTypes: ["VENT_SET", "MED_INFUSION_ADJUST", "FLUID_GIVE", "REQUEST_NIBP", "REQUEST_BGA"],
      availableMedications: ["norepinephrine"],
      availableVentilatorModes: ["VCV", "PCV"],
      hasIvAccess: true,
      canRequestLabs: false,
      canRequestBga: true
    },
    constraints: {
      maxFluidBolusMl: 500,
      maxMedicationBolusByDrug: {},
      minSecondsBetweenSameAction: 15
    }
  },
  config: {
    scope: "maintenance_only",
    minReassessmentSeconds: 15,
    maxReassessmentSeconds: 60,
    maxSessionSeconds: 3600,
    maxConsecutiveValidatorRejections: 3,
    requireHostAcknowledgement: true
  },
  safety: {
    airwaySecured: true,
    anesthesiaMachineConnected: true,
    emergencyStop: false,
    instructorPause: false
  },
  session: {
    sessionId: "test-session",
    cycleIndex: 2,
    elapsedSeconds: 120,
    consecutiveValidatorRejections: 0
  }
});

describe("AI-3 autonomy loop", () => {
  it("allows only a secured maintenance context", () => {
    expect(evaluateAutonomyGate(baseRequest)).toEqual({ allowed: true });
    const induction = AutonomyStepRequestSchema.parse({
      ...baseRequest,
      context: { ...baseRequest.context, snapshot: { ...baseRequest.context.snapshot, phase: "induction" } }
    });
    expect(evaluateAutonomyGate(induction)).toEqual({ allowed: false, stopReason: "OUTSIDE_MAINTENANCE_SCOPE" });
  });

  it("honors host emergency stop before model reasoning", () => {
    const stopped = AutonomyStepRequestSchema.parse({
      ...baseRequest,
      safety: { ...baseRequest.safety, emergencyStop: true }
    });
    expect(evaluateAutonomyGate(stopped)).toEqual({ allowed: false, stopReason: "HOST_EMERGENCY_STOP" });
  });

  it("stops after repeated validator rejection", () => {
    const rejected = AutonomyStepRequestSchema.parse({
      ...baseRequest,
      session: { ...baseRequest.session, consecutiveValidatorRejections: 3 }
    });
    expect(evaluateAutonomyGate(rejected)).toEqual({ allowed: false, stopReason: "VALIDATOR_REJECTION_LIMIT" });
  });

  it("clamps reassessment cadence", () => {
    expect(normalizeWaitSeconds(2, baseRequest)).toBe(15);
    expect(normalizeWaitSeconds(120, baseRequest)).toBe(60);
    expect(normalizeWaitSeconds(30, baseRequest)).toBe(30);
  });

  it("validates proposed actions through the AI-2 validator and never marks them executable", () => {
    const decision = AutonomousModelDecisionSchema.parse({
      decision: "propose_action",
      assessment: "MAP is trending toward the lower target range",
      priority: "attention",
      reasoningSummary: "A small vasopressor adjustment is proposed for host validation.",
      waitSeconds: 20,
      actionProposal: {
        assessment: "relative hypotension",
        reasonCodes: ["MAP_LOW_NORMAL"],
        confidence: 0.7,
        action: {
          type: "MED_INFUSION_ADJUST",
          target: "norepinephrine",
          parameters: { drug: "norepinephrine", rate: 0.03, unit: "ug/kg/min" }
        }
      }
    });
    const validation = validateAutonomousDecision(decision, baseRequest);
    expect(validation?.accepted).toBe(true);
    const audit = AutonomyAuditEntrySchema.parse(createAuditEntry(decision, baseRequest, validation));
    expect(audit.executedByAiService).toBe(false);
    expect(audit.hostExecutionRequired).toBe(true);
  });

  it("rejects malformed action decisions without an action proposal", () => {
    expect(() => AutonomousModelDecisionSchema.parse({
      decision: "propose_action",
      assessment: "test",
      priority: "routine",
      reasoningSummary: "test",
      waitSeconds: 20
    })).toThrow();
  });
});
