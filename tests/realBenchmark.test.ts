import { afterEach, describe, expect, it, vi } from "vitest";
import { RealOllamaBenchmark, summarizeRealBenchmark } from "../src/realBenchmark.js";
import type { BenchmarkCase } from "../src/llmBenchmark.js";

const TEST_CASE: BenchmarkCase = {
  id: "stable",
  category: "no_action",
  prompt: "Stable observable state.",
  mustContain: [],
  forbiddenClaims: [],
  expectsJson: true
};

afterEach(() => vi.restoreAllMocks());

describe("RealOllamaBenchmark", () => {
  it("requests non-thinking structured deterministic output", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      response: JSON.stringify({ relevantProblem: false, interventionNeeded: false, priority: "none", nextMonitor: "routine monitoring" }),
      thinking: "",
      eval_count: 12,
      eval_duration: 1_000_000_000,
      total_duration: 1_200_000_000,
      load_duration: 100_000_000
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await new RealOllamaBenchmark("http://localhost:11434").runCase("qwen3:4b", TEST_CASE);
    expect(result.ok).toBe(true);
    expect(result.jsonValid).toBe(true);
    expect(result.thinkingChars).toBe(0);
    expect(result.tokensPerSecond).toBe(12);

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.think).toBe(false);
    expect(body.stream).toBe(false);
    expect(body.options.temperature).toBe(0);
    expect(body.options.num_predict).toBe(96);
    expect(body.format.type).toBe("object");
  });

  it("fails a response that still exposes thinking", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      response: JSON.stringify({ relevantProblem: false, interventionNeeded: false, priority: "none", nextMonitor: "routine" }),
      thinking: "hidden reasoning"
    }), { status: 200 }));
    const result = await new RealOllamaBenchmark().runCase("qwen3:4b", TEST_CASE);
    expect(result.ok).toBe(false);
    expect(result.thinkingChars).toBeGreaterThan(0);
  });

  it("summarizes latency and success", () => {
    const summary = summarizeRealBenchmark([
      { caseId: "a", model: "m", ok: true, latencyMs: 100, jsonValid: true, thinkingChars: 0, outputChars: 10, tokensPerSecond: 10 },
      { caseId: "b", model: "m", ok: false, latencyMs: 300, jsonValid: false, thinkingChars: 0, outputChars: 0, tokensPerSecond: 20 }
    ]);
    expect(summary.cases).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.successRate).toBe(0.5);
    expect(summary.meanTokensPerSecond).toBe(15);
  });
});
