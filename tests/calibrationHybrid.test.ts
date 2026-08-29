import { describe, expect, it } from "vitest";
import { ROBUSTNESS_CASES } from "../src/robustnessCases.js";
import { CALIBRATION_NOTES } from "../src/calibration.js";
import { observerCoverage, observerSignalsFor } from "../src/hybridObserverSignals.js";

describe("AI-4.6C calibration and hybrid observer", () => {
  it("calibrates every robustness case exactly once", () => {
    expect(CALIBRATION_NOTES).toHaveLength(ROBUSTNESS_CASES.length);
    expect(new Set(CALIBRATION_NOTES.map(note => note.caseId)).size).toBe(ROBUSTNESS_CASES.length);
    expect(new Set(CALIBRATION_NOTES.map(note => note.caseId))).toEqual(new Set(ROBUSTNESS_CASES.map(test => test.id)));
  });

  it("provides deterministic observer coverage for every case", () => {
    expect(observerCoverage(ROBUSTNESS_CASES.map(test => test.id))).toHaveLength(ROBUSTNESS_CASES.length);
  });

  it("observer signals contain no explicit hidden diagnosis labels used by the suite", () => {
    const forbidden = ["hemorrhage", "anaphylaxis", "sepsis", "embolism", "pneumothorax", "aspiration", "bronchospasm", "awareness", "overdose", "copd"];
    for (const test of ROBUSTNESS_CASES) {
      const serialized = JSON.stringify(observerSignalsFor(test)).toLowerCase();
      for (const claim of forbidden) expect(serialized).not.toContain(claim);
    }
  });

  it("keeps observer output diagnosis-free while still flagging known strong missed abnormalities", () => {
    const pressure = ROBUSTNESS_CASES.find(test => test.id === "pressure-01")!;
    const oxygen = ROBUSTNESS_CASES.find(test => test.id === "oxygen-01")!;
    const depth = ROBUSTNESS_CASES.find(test => test.id === "depth-01")!;
    expect(observerSignalsFor(pressure).map(x => x.code)).toContain("MAP_LOW");
    expect(observerSignalsFor(oxygen).map(x => x.code)).toContain("SPO2_LOW");
    expect(observerSignalsFor(depth).map(x => x.code)).toContain("BIS_HIGH");
  });
});
