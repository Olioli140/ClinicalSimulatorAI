import { writeFile } from "node:fs/promises";
import { RealOllamaBenchmark, summarizeRealBenchmark } from "./realBenchmark.js";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const model = getArg("--model") ?? process.env.OLLAMA_MODEL ?? "qwen3:4b";
const baseUrl = getArg("--base-url") ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const output = getArg("--output") ?? `benchmark-${model.replace(/[^a-z0-9.-]+/gi, "-")}.json`;

console.log(`AI-4.6 real hardware benchmark`);
console.log(`Model: ${model}`);
console.log(`Ollama: ${baseUrl}`);

const runner = new RealOllamaBenchmark(baseUrl);
const results = await runner.run(model);
const summary = summarizeRealBenchmark(results);

for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} ${r.caseId}: ${r.latencyMs} ms, JSON=${r.jsonValid}, thinkingChars=${r.thinkingChars}${typeof r.tokensPerSecond === "number" ? `, ${r.tokensPerSecond.toFixed(2)} tok/s` : ""}${r.error ? `, error=${r.error}` : ""}`);
}
console.log("Summary:", summary);

await writeFile(output, JSON.stringify({ model, baseUrl, createdAt: new Date().toISOString(), summary, results }, null, 2), "utf8");
console.log(`Saved: ${output}`);

if (summary.passed !== summary.cases) process.exitCode = 2;
