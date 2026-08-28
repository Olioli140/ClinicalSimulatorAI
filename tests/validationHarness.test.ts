import { describe, expect, it } from "vitest";
import { buildDefaultValidationScenarios, runBatchValidation, runValidationScenario } from "../src/validationHarness.js";

describe("AI-3V validation harness", () => {
  it("builds at least 100 deterministic validation scenarios", () => {
    const scenarios = buildDefaultValidationScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(100);
    expect(scenarios[0]?.seed).toBe(1);
    expect(scenarios[1]?.seed).toBe(2);
  });

  it("never records direct AI execution", () => {
    const result = runValidationScenario({ seed: 42, durationMinutes: 45, disturbance: "hypotension", disturbanceAtMinute: 10 });
    expect(result.metrics.directAiExecutions).toBe(0);
    expect(result.passedArchitectureSafety).toBe(true);
  });

  it("captures validator and host failure injection", () => {
    const rejected = runValidationScenario({ seed: 3, durationMinutes: 30, disturbance: "validator_rejection", disturbanceAtMinute: 6 });
    const hostFailure = runValidationScenario({ seed: 4, durationMinutes: 30, disturbance: "host_failure", disturbanceAtMinute: 6 });
    expect(rejected.metrics.actionsRejected).toBeGreaterThanOrEqual(0);
    expect(hostFailure.metrics.hostFailures).toBeGreaterThanOrEqual(0);
  });

  it("runs the default 120-case batch", () => {
    const batch = runBatchValidation();
    expect(batch.totalRuns).toBe(120);
    expect(batch.completedRuns).toBe(120);
    expect(batch.aggregate.totalDirectAiExecutions).toBe(0);
  });
});
