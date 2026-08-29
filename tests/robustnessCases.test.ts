import { describe, expect, it } from "vitest";
import { ROBUSTNESS_CASES } from "../src/robustnessCases.js";

describe("AI-4.6B robustness cases", () => {
  it("contains at least 40 cases with unique ids", () => {
    expect(ROBUSTNESS_CASES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ROBUSTNESS_CASES.map(c => c.id)).size).toBe(ROBUSTNESS_CASES.length);
  });

  it("covers stable, missing-data, ambiguity, grounding and prompt-injection families", () => {
    const families = new Set(ROBUSTNESS_CASES.map(c => c.family));
    for (const family of ["stable", "missing-data", "ambiguity", "grounding", "prompt-injection"]) {
      expect(families.has(family)).toBe(true);
    }
  });

  it("contains no-action cases and forbidden-claim traps", () => {
    expect(ROBUSTNESS_CASES.some(c => !c.expected.relevantProblem && !c.expected.interventionNeeded)).toBe(true);
    expect(ROBUSTNESS_CASES.some(c => c.forbiddenClaims.length > 0)).toBe(true);
  });
});
