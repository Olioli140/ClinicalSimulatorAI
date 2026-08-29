import { BENCHMARK_CASES, type BenchmarkCase } from "./llmBenchmark.js";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    relevantProblem: { type: "boolean" },
    interventionNeeded: { type: "boolean" },
    priority: { type: "string", enum: ["none", "low", "medium", "high"] },
    nextMonitor: { type: "string" }
  },
  required: ["relevantProblem", "interventionNeeded", "priority", "nextMonitor"],
  additionalProperties: false
} as const;

export interface OllamaGenerateTelemetry {
  response?: string;
  thinking?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  done_reason?: string;
}

export interface RealBenchmarkResult {
  caseId: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  totalDurationMs?: number;
  loadDurationMs?: number;
  evalTokens?: number;
  tokensPerSecond?: number;
  jsonValid: boolean;
  thinkingChars: number;
  outputChars: number;
  error?: string;
}

function nsToMs(value?: number): number | undefined {
  return typeof value === "number" ? value / 1_000_000 : undefined;
}

function tokensPerSecond(count?: number, durationNs?: number): number | undefined {
  if (!count || !durationNs) return undefined;
  return count / (durationNs / 1_000_000_000);
}

export class RealOllamaBenchmark {
  constructor(
    private readonly baseUrl = "http://localhost:11434",
    private readonly timeoutMs = 120_000
  ) {}

  async runCase(model: string, test: BenchmarkCase): Promise<RealBenchmarkResult> {
    const started = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          system: "You are an anesthesia simulator assistant. Use only supplied observable data. Do not infer hidden diagnoses or invent measurements. Return only the requested JSON object. Do not explain reasoning.",
          prompt: `${test.prompt}\n\nReturn exactly: {\"relevantProblem\":boolean,\"interventionNeeded\":boolean,\"priority\":\"none|low|medium|high\",\"nextMonitor\":string}`,
          stream: false,
          think: false,
          format: RESPONSE_SCHEMA,
          keep_alive: "5m",
          options: { temperature: 0, num_predict: 96 }
        }),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const body = (await response.json()) as OllamaGenerateTelemetry;
      const output = body.response ?? "";
      let jsonValid = false;
      try { JSON.parse(output); jsonValid = true; } catch { jsonValid = false; }

      return {
        caseId: test.id,
        model,
        ok: jsonValid && (body.thinking?.length ?? 0) === 0,
        latencyMs: Math.round(performance.now() - started),
        totalDurationMs: nsToMs(body.total_duration),
        loadDurationMs: nsToMs(body.load_duration),
        evalTokens: body.eval_count,
        tokensPerSecond: tokensPerSecond(body.eval_count, body.eval_duration),
        jsonValid,
        thinkingChars: body.thinking?.length ?? 0,
        outputChars: output.length
      };
    } catch (error) {
      return {
        caseId: test.id,
        model,
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        jsonValid: false,
        thinkingChars: 0,
        outputChars: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async run(model: string, cases = BENCHMARK_CASES): Promise<RealBenchmarkResult[]> {
    const results: RealBenchmarkResult[] = [];
    for (const test of cases) results.push(await this.runCase(model, test));
    return results;
  }
}

export function summarizeRealBenchmark(results: RealBenchmarkResult[]) {
  const passed = results.filter(r => r.ok).length;
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const at = (fraction: number) => latencies.length ? latencies[Math.floor((latencies.length - 1) * fraction)] : 0;
  const speeds = results.flatMap(r => typeof r.tokensPerSecond === "number" ? [r.tokensPerSecond] : []);
  return {
    cases: results.length,
    passed,
    successRate: results.length ? passed / results.length : 0,
    p50LatencyMs: at(0.5),
    p95LatencyMs: at(0.95),
    meanTokensPerSecond: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : undefined,
    totalThinkingChars: results.reduce((sum, r) => sum + r.thinkingChars, 0)
  };
}
