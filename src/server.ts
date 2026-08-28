import "dotenv/config";
import express from "express";
import { AiPromptRequestSchema, ExplainRequestSchema, ExplainResponseSchema } from "./contracts.js";
import { AiActionProposalSchema, ProposeActionRequestSchema } from "./actionContracts.js";
import { buildActionProposalPrompt } from "./actionDecision.js";
import { validateActionProposal } from "./actionValidator.js";
import { buildExplainPrompt } from "./observer.js";
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
  if (!parsed.success) return void res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
  try {
    res.json(await client.generate(parsed.data));
  } catch (error) {
    res.status(503).json({ error: "local_ai_unavailable", detail: error instanceof Error ? error.message : "Unknown generation error" });
  }
});

app.post("/v1/explain", async (req, res) => {
  const parsed = ExplainRequestSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "invalid_observation", issues: parsed.error.issues });
  try {
    const generated = await client.generate({ ...buildExplainPrompt(parsed.data), temperature: 0.1 });
    let payload: unknown;
    try { payload = JSON.parse(generated.output); }
    catch { return void res.status(502).json({ error: "invalid_model_output", detail: "Model did not return valid JSON." }); }
    const response = ExplainResponseSchema.safeParse({ ...(payload as object), model: generated.model, latencyMs: generated.latencyMs });
    if (!response.success) return void res.status(502).json({ error: "invalid_model_output", issues: response.error.issues });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ error: "local_ai_unavailable", detail: error instanceof Error ? error.message : "Unknown explanation error" });
  }
});

app.post("/v1/propose-action", async (req, res) => {
  const parsed = ProposeActionRequestSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "invalid_action_context", issues: parsed.error.issues });
  try {
    const generated = await client.generate({ ...buildActionProposalPrompt(parsed.data), temperature: 0.05 });
    let payload: unknown;
    try { payload = JSON.parse(generated.output); }
    catch { return void res.status(502).json({ error: "invalid_model_output", detail: "Model did not return valid JSON." }); }

    const proposal = AiActionProposalSchema.safeParse(payload);
    if (!proposal.success) return void res.status(502).json({ error: "invalid_action_proposal", issues: proposal.error.issues });

    const validation = validateActionProposal(proposal.data, parsed.data.context);
    res.json({
      proposal: proposal.data,
      validation,
      executable: false,
      handoff: validation.accepted ? "HOST_UNIFIED_ACTION_API_REQUIRED" : "REJECTED_BY_VALIDATOR",
      model: generated.model,
      latencyMs: generated.latencyMs
    });
  } catch (error) {
    res.status(503).json({ error: "local_ai_unavailable", detail: error instanceof Error ? error.message : "Unknown proposal error" });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`ClinicalSimulatorAI local gateway listening on http://127.0.0.1:${port}`);
});
