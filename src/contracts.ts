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

const OptionalNumber = z.number().finite().optional();

export const AiStateSnapshotSchema = z.object({
  timestamp: z.number().nonnegative(),
  phase: z.enum(["preparation", "induction", "maintenance", "emergence", "handover"]),
  patient: z.object({
    ageYears: z.number().min(0).max(130),
    weightKg: z.number().positive().max(500),
    asa: z.number().int().min(1).max(6).optional()
  }),
  vitals: z.object({
    hr: OptionalNumber,
    map: OptionalNumber,
    spo2: OptionalNumber,
    etco2: OptionalNumber,
    temperatureC: OptionalNumber
  }),
  anesthesia: z.object({
    mac: OptionalNumber,
    bis: OptionalNumber,
    tofRatio: OptionalNumber,
    tofCount: z.number().int().min(0).max(4).optional()
  }),
  ventilation: z.object({
    mode: z.string().optional(),
    fio2: OptionalNumber,
    vtMl: OptionalNumber,
    rr: OptionalNumber,
    peepCmH2O: OptionalNumber,
    minuteVentilationLMin: OptionalNumber,
    peakPressureCmH2O: OptionalNumber
  }),
  medications: z.array(z.object({
    name: z.string().min(1),
    route: z.string().optional(),
    rate: OptionalNumber,
    rateUnit: z.string().optional()
  })).default([]),
  visibleFindings: z.array(z.string()).default([]),
  trends: z.array(z.object({
    signal: z.string(),
    direction: z.enum(["rising", "falling", "stable", "unknown"]),
    windowSeconds: z.number().positive()
  })).default([]),
  recentActions: z.array(z.object({
    type: z.string(),
    summary: z.string(),
    secondsAgo: z.number().nonnegative()
  })).default([])
}).strict();
export type AiStateSnapshot = z.infer<typeof AiStateSnapshotSchema>;

export const ExplainRequestSchema = z.object({
  snapshot: AiStateSnapshotSchema,
  question: z.string().min(1).max(500).default("Explain the current clinical situation."),
  mode: z.enum(["minimal", "tutor", "learning"]).default("tutor")
});
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

export const ExplainResponseSchema = z.object({
  assessment: z.string(),
  priority: z.enum(["routine", "attention", "urgent", "critical"]),
  explanation: z.string(),
  evidence: z.array(z.string()),
  possibilities: z.array(z.string()),
  watchNext: z.array(z.string()),
  limitations: z.array(z.string()),
  model: z.string(),
  latencyMs: z.number().nonnegative()
});
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
