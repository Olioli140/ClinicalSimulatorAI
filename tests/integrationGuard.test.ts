import { describe, expect, it } from "vitest";
import { canHandoffAction } from "../src/integrationGuard.js";
import type { IntegrationSafetyState, SimulatorActionHandoff, SimulatorSnapshotEnvelope } from "../src/integrationContracts.js";

const envelope: SimulatorSnapshotEnvelope = {
  contractVersion: "1.0",
  sessionId: "session-1",
  sequence: 42,
  capturedAt: 1000,
  mode: "autonomous_maintenance",
  snapshot: {
    timestamp: 1000,
    phase: "maintenance",
    patient: { ageYears: 55, weightKg: 80 },
    vitals: { hr: 72, map: 68, spo2: 98, etco2: 38 },
    anesthesia: { bis: 48, tofRatio: 0.4 },
    ventilation: { mode: "VCV", fio2: 0.4, vtMl: 500, rr: 12, peepCmH2O: 5, minuteVentilationLMin: 6 },
    medications: [], visibleFindings: [], trends: [], recentActions: []
  }
};

const safety: IntegrationSafetyState = {
  emergencyStop: false, instructorPause: false, participantVisible: true,
  autonomyEnabledByHost: true, airwaySecured: true, anesthesiaMachineConnected: true
};

const handoff: SimulatorActionHandoff = {
  contractVersion: "1.0", proposalId: "p-1", sessionId: "session-1", basedOnSequence: 42, createdAt: 1001,
  proposal: { assessment: "MAP below preferred range", reasonCodes: ["MAP_LOW"], confidence: 0.8,
    action: { type: "MED_INFUSION_ADJUST", target: "norepinephrine", parameters: { rate: 0.05, unit: "ug/kg/min" } } }
};

describe("AI-4 integration guard", () => {
  it("allows current maintenance handoff when host explicitly enabled autonomy", () => {
    expect(canHandoffAction("autonomous_maintenance", safety, envelope, handoff)).toEqual({ allowed: true });
  });
  it("blocks shadow mode from changing the simulator", () => {
    expect(canHandoffAction("shadow", safety, envelope, handoff)).toEqual({ allowed: false, reason: "MODE_DOES_NOT_ALLOW_HOST_ACTION" });
  });
  it("blocks stale proposals", () => {
    expect(canHandoffAction("autonomous_maintenance", safety, envelope, { ...handoff, basedOnSequence: 41 })).toEqual({ allowed: false, reason: "STALE_SNAPSHOT" });
  });
  it("blocks autonomy outside maintenance", () => {
    const induction = { ...envelope, snapshot: { ...envelope.snapshot, phase: "induction" as const } };
    expect(canHandoffAction("autonomous_maintenance", safety, induction, handoff)).toEqual({ allowed: false, reason: "OUTSIDE_MAINTENANCE_SCOPE" });
  });
  it("honors instructor pause and emergency stop", () => {
    expect(canHandoffAction("autonomous_maintenance", { ...safety, instructorPause: true }, envelope, handoff).allowed).toBe(false);
    expect(canHandoffAction("autonomous_maintenance", { ...safety, emergencyStop: true }, envelope, handoff).allowed).toBe(false);
  });
});
