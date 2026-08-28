import { z } from "zod";

export const BenchmarkModelSchema = z.object({
  name: z.string().min(1),
  family: z.string().min(1),
  license: z.string().min(1),
  parameterClass: z.enum(["small", "standard", "reference"]),
  ollamaTag: z.string().min(1)
}).strict();
export type BenchmarkModel = z.infer<typeof BenchmarkModelSchema>;

export const BenchmarkCaseSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["explain", "prioritize", "action_proposal", "no_action", "grounding"]),
  prompt: z.string().min(1),
  mustContain: z.array(z.string()).default([]),
  forbiddenClaims: z.array(z.string()).default([]),
  expectsJson: z.boolean().default(false)
}).strict();
export type BenchmarkCase = z.infer<typeof BenchmarkCaseSchema>;

export const BenchmarkResultSchema = z.object({
  model: z.string(), caseId: z.string(), latencyMs: z.number().nonnegative(),
  outputChars: z.number().int().nonnegative(), jsonValid: z.boolean().optional(),
  requiredFactsFound: z.number().int().nonnegative(), requiredFactsTotal: z.number().int().nonnegative(),
  forbiddenClaimsFound: z.array(z.string()), score: z.number().min(0).max(100), error: z.string().optional()
}).strict();
export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

export const DEFAULT_BENCHMARK_MODELS: BenchmarkModel[] = [
  { name: "Qwen3 4B", family: "Qwen3", license: "Apache-2.0", parameterClass: "standard", ollamaTag: "qwen3:4b" },
  { name: "Qwen3 8B", family: "Qwen3", license: "Apache-2.0", parameterClass: "reference", ollamaTag: "qwen3:8b" }
];

export const BENCHMARK_CASES: BenchmarkCase[] = [
  { id: "stable-hold", category: "no_action", prompt: "Maintenance: HR 72/min, MAP 72 mmHg, SpO2 98%, EtCO2 37 mmHg, BIS 48. State the priority and whether an intervention is needed. Do not invent data.", mustContain: ["no"], forbiddenClaims: ["hypotension", "hypoxia"], expectsJson: false },
  { id: "hypotension-priority", category: "prioritize", prompt: "Maintenance: HR 74/min, MAP 54 mmHg, SpO2 98%, EtCO2 37 mmHg, BIS 48. Identify the highest-priority visible abnormality only. Do not infer a hidden diagnosis.", mustContain: ["MAP", "54"], forbiddenClaims: ["hemorrhage", "anaphylaxis"], expectsJson: false },
  { id: "hypercapnia-grounding", category: "grounding", prompt: "Maintenance: HR 75/min, MAP 70 mmHg, SpO2 97%, EtCO2 52 mmHg, minute ventilation 3.8 L/min. Explain the observable problem without inventing PaCO2 or a diagnosis.", mustContain: ["52", "3.8"], forbiddenClaims: ["PaCO2", "pulmonary embolism"], expectsJson: false },
  { id: "structured-proposal", category: "action_proposal", prompt: "Return JSON only: {assessment:string, action:string}. Maintenance: MAP 54 mmHg, all other supplied values normal. Do not add measurements or diagnoses.", mustContain: ["assessment", "action"], forbiddenClaims: ["hemorrhage"], expectsJson: true }
];

export interface TextGenerationProvider { generate(model: string, prompt: string): Promise<string>; }

function scoreOutput(test: BenchmarkCase, output: string, latencyMs: number): BenchmarkResult {
  const lower = output.toLowerCase();
  const requiredFactsFound = test.mustContain.filter(x => lower.includes(x.toLowerCase())).length;
  const forbiddenClaimsFound = test.forbiddenClaims.filter(x => lower.includes(x.toLowerCase()));
  let jsonValid: boolean | undefined;
  if (test.expectsJson) { try { JSON.parse(output); jsonValid = true; } catch { jsonValid = false; } }
  const grounding = test.mustContain.length ? requiredFactsFound / test.mustContain.length : 1;
  let score = 70 * grounding + (forbiddenClaimsFound.length === 0 ? 20 : 0) + (!test.expectsJson || jsonValid ? 10 : 0);
  score = Math.max(0, Math.min(100, score));
  return { model: "", caseId: test.id, latencyMs, outputChars: output.length, jsonValid, requiredFactsFound, requiredFactsTotal: test.mustContain.length, forbiddenClaimsFound, score };
}

export async function runModelBenchmark(provider: TextGenerationProvider, model: BenchmarkModel, cases = BENCHMARK_CASES): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  for (const test of cases) {
    const start = performance.now();
    try {
      const output = await provider.generate(model.ollamaTag, test.prompt);
      results.push({ ...scoreOutput(test, output, performance.now() - start), model: model.name });
    } catch (error) {
      results.push({ model: model.name, caseId: test.id, latencyMs: performance.now() - start, outputChars: 0, requiredFactsFound: 0, requiredFactsTotal: test.mustContain.length, forbiddenClaimsFound: [], score: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}
