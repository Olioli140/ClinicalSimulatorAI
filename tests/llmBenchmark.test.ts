import { describe, expect, it } from "vitest";
import { BENCHMARK_CASES, DEFAULT_BENCHMARK_MODELS, runModelBenchmark, type TextGenerationProvider } from "../src/llmBenchmark.js";

const provider: TextGenerationProvider = {
  async generate(_model, prompt) {
    if (prompt.includes("Return JSON only")) return JSON.stringify({ assessment: "MAP 54 mmHg is low", action: "evaluate and propose through validated action API" });
    if (prompt.includes("MAP 54")) return "Highest-priority visible abnormality: MAP 54 mmHg is low.";
    if (prompt.includes("EtCO2 52")) return "Observable issue: EtCO2 is 52 mmHg while minute ventilation is 3.8 L/min.";
    return "No intervention is needed from the supplied stable values.";
  }
};

describe("AI-4.5 LLM benchmark", () => {
  it("has CPU-sized Apache-2.0 Qwen candidates", () => {
    expect(DEFAULT_BENCHMARK_MODELS.map(x => x.ollamaTag)).toEqual(["qwen3:4b", "qwen3:8b"]);
    expect(DEFAULT_BENCHMARK_MODELS.every(x => x.license === "Apache-2.0")).toBe(true);
  });
  it("scores deterministic benchmark cases", async () => {
    const results = await runModelBenchmark(provider, DEFAULT_BENCHMARK_MODELS[0], BENCHMARK_CASES);
    expect(results).toHaveLength(BENCHMARK_CASES.length);
    expect(results.every(x => x.score >= 90)).toBe(true);
    expect(results.find(x => x.caseId === "structured-proposal")?.jsonValid).toBe(true);
  });
  it("penalizes hallucinated forbidden claims", async () => {
    const bad: TextGenerationProvider = { async generate() { return "This is hemorrhage with hypoxia."; } };
    const [result] = await runModelBenchmark(bad, DEFAULT_BENCHMARK_MODELS[0], [BENCHMARK_CASES[1]]);
    expect(result.forbiddenClaimsFound).toContain("hemorrhage");
    expect(result.score).toBeLessThan(50);
  });
});
