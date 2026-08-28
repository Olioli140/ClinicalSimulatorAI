import { describe, expect, it } from "vitest";
import { AiStateSnapshotSchema, ExplainRequestSchema } from "../src/contracts.js";
import { buildExplainPrompt, observableFacts } from "../src/observer.js";

const snapshot = AiStateSnapshotSchema.parse({
  timestamp: 120,
  phase: "maintenance",
  patient: { ageYears: 38, weightKg: 76, asa: 2 },
  vitals: { hr: 82, map: 54, spo2: 98, etco2: 37 },
  anesthesia: { mac: 0.8, bis: 48, tofRatio: 0.25 },
  ventilation: { mode: "VCV", fio2: 0.4, minuteVentilationLMin: 6.2, peakPressureCmH2O: 21 },
  medications: [{ name: "norepinephrine", route: "IV", rate: 0.03, rateUnit: "ug/kg/min" }],
  visibleFindings: [],
  trends: [{ signal: "MAP", direction: "falling", windowSeconds: 120 }],
  recentActions: []
});

describe("AI-1 observer", () => {
  it("exposes only supplied observable facts", () => {
    const facts = observableFacts(snapshot).join(" ");
    expect(facts).toContain("MAP 54 mmHg");
    expect(facts).toContain("MAP falling");
    expect(facts).not.toContain("hypovolemia");
    expect(facts).not.toContain("anaphylaxis");
  });

  it("rejects unknown hidden-state fields", () => {
    expect(() => AiStateSnapshotSchema.parse({ ...snapshot, hiddenDiagnosis: "hypovolemia" })).toThrow();
  });

  it("builds a non-acting educational prompt", () => {
    const request = ExplainRequestSchema.parse({ snapshot, question: "Why is the blood pressure low?", mode: "learning" });
    const prompt = buildExplainPrompt(request);
    expect(prompt.system).toContain("cannot act on the simulator");
    expect(prompt.system).toContain("Never invent");
    expect(prompt.prompt).toContain("MAP 54 mmHg");
  });
});
