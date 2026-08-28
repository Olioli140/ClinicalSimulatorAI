import { z } from "zod";

export const AiHealthSchema = z.object({
  status: z.enum(["ready", "degraded", "offline"]),
  provider: z.literal("ollama"),
  model: z.string(),
  latencyMs: z.number().nonnegative().optional(),
  detail: z.string().optional()
});

export type AiHealth = z.infer<typeof AiHealthSchema>;

export const AiPromptRequestSchema = z.object({
  system: z.string().min(1).optional(),
  prompt: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.1)
});

export type AiPromptRequest = z.infer<typeof AiPromptRequestSchema>;

export const AiPromptResponseSchema = z.object({
  provider: z.literal("ollama"),
  model: z.string(),
  output: z.string(),
  latencyMs: z.number().nonnegative()
});

export type AiPromptResponse = z.infer<typeof AiPromptResponseSchema>;
