import { describe, expect, it } from "vitest";
import { ActionContextSchema, AiActionProposalSchema } from "../src/actionContracts.js";
import { validateActionProposal } from "../src/actionValidator.js";

const context = ActionContextSchema.parse({
  snapshot: {
    timestamp: 300,
    phase: "maintenance",
    patient: { ageYears: 55, weightKg: 80 },
    vitals: { hr: 78, map: 56, spo2: 98, etco2: 36 },
    anesthesia: { mac: 0.8, bis: 50 },
    ventilation: { mode: "VCV", fio2: 0.4 },
    medications: [], visibleFindings: [], trends: [], recentActions: []
  },
  capabilities: {
    allowedActionTypes: ["MED_INFUSION_ADJUST", "FLUID_GIVE", "REQUEST_NIBP"],
    availableMedications: ["norepinephrine"],
    availableVentilatorModes: ["VCV", "PCV"],
    hasIvAccess: true,
    canRequestLabs: false,
    canRequestBga: false
  },
  constraints: { maxFluidBolusMl: 500, maxMedicationBolusByDrug: {}, minSecondsBetweenSameAction: 10 }
});

describe("AI-2 Action Validator", () => {
  it("accepts an allowed medication adjustment", () => {
    const proposal = AiActionProposalSchema.parse({
      assessment: "Hypotension",
      reasonCodes: ["MAP_LOW"],
      confidence: 0.8,
      action: { type: "MED_INFUSION_ADJUST", parameters: { drug: "norepinephrine", rate: 0.05, unit: "ug/kg/min" } }
    });
    expect(validateActionProposal(proposal, context).accepted).toBe(true);
  });

  it("rejects an unavailable medication", () => {
    const proposal = AiActionProposalSchema.parse({
      assessment: "Hypotension",
      reasonCodes: ["MAP_LOW"],
      confidence: 0.7,
      action: { type: "MED_INFUSION_ADJUST", parameters: { drug: "epinephrine", rate: 0.02 } }
    });
    const result = validateActionProposal(proposal, context);
    expect(result.accepted).toBe(false);
    expect(result.reasons.join(" ")).toContain("MEDICATION_UNAVAILABLE");
  });

  it("rejects excessive fluid bolus", () => {
    const proposal = AiActionProposalSchema.parse({
      assessment: "Hypotension",
      reasonCodes: ["MAP_LOW"],
      confidence: 0.5,
      action: { type: "FLUID_GIVE", parameters: { volumeMl: 1000 } }
    });
    expect(validateActionProposal(proposal, context).reasons).toContain("FLUID_EXCEEDS_LIMIT");
  });

  it("rejects action types absent from host capabilities", () => {
    const proposal = AiActionProposalSchema.parse({
      assessment: "Need blood gas",
      reasonCodes: ["CHECK_GAS_EXCHANGE"],
      confidence: 0.6,
      action: { type: "REQUEST_BGA", parameters: {} }
    });
    expect(validateActionProposal(proposal, context).accepted).toBe(false);
  });
});
