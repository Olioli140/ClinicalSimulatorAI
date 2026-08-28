import "dotenv/config";
import express from "express";
import { AiPromptRequestSchema } from "./contracts.js";
import { OllamaClient } from "./ollamaClient.js";

const port = Number(process.env.PORT ?? 8787);
const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 15000);

const client = new OllamaClient({ baseUrl, model, timeoutMs });
const app = express();

app.use(express.json({ limit: "128kb" }));

app.get("/health", async (_req, res) => {
  const health = await client.health();
  res.status(health.status === "ready" ? 200 : 503).json(health);
});

app.post("/v1/generate", async (req, res) => {
  const parsed = AiPromptRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      issues: parsed.error.issues
    });
    return;
  }

  try {
    const result = await client.generate(parsed.data);
    res.json(result);
  } catch (error) {
    res.status(503).json({
      error: "local_ai_unavailable",
      detail: error instanceof Error ? error.message : "Unknown generation error"
    });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`ClinicalSimulatorAI local gateway listening on http://127.0.0.1:${port}`);
});
