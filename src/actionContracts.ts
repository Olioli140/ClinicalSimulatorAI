import { z } from "zod";
import { AiStateSnapshotSchema } from "./contracts.js";

export const AllowedActionTypeSchema = z.enum([
  "VENT_SET",
  "VENT_MODE_CHANGE",
  "MED_BOLUS",
  "MED_INFUSION_START",
  "MED_INFUSION_ADJUST",
  "MED_INFUSION_STOP",
  "FLUID_GIVE",
  "REQUEST_NIBP",
  "REQUEST_LAB",
  "REQUEST_BGA"
]);

export const AiActionProposalSchema = z.object({
  assessment: z.string().min(1),
  reasonCodes: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  action: z.object({
    type: AllowedActionTypeSchema,
    target: z.string().min(1).optional(),
    parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({})
  }).strict()
}).strict();
export type AiActionProposal = z.infer<typeof AiActionProposalSchema>;

export const ActionContextSchema = z.object({
  snapshot: AiStateSnapshotSchema,
  capabilities: z.object({
    allowedActionTypes: z.array(AllowedActionTypeSchema),
    availableMedications: z.array(z.string()).default([]),
    availableVentilatorModes: z.array(z.string()).default([]),
    hasIvAccess: z.boolean().default(false),
    canRequestLabs: z.boolean().default(false),
    canRequestBga: z.boolean().default(false)
  }).strict(),
  constraints: z.object({
    maxFluidBolusMl: z.number().positive().default(1000),
    maxMedicationBolusByDrug: z.record(z.string(), z.number().positive()).default({}),
    minSecondsBetweenSameAction: z.number().nonnegative().default(10)
  }).strict()
}).strict();
export type ActionContext = z.infer<typeof ActionContextSchema>;

export const ActionValidationResultSchema = z.object({
  accepted: z.boolean(),
  reasons: z.array(z.string()),
  normalizedProposal: AiActionProposalSchema.optional()
});
export type ActionValidationResult = z.infer<typeof ActionValidationResultSchema>;

export const ProposeActionRequestSchema = z.object({
  context: ActionContextSchema,
  goal: z.string().min(1).max(500).default("Propose the single highest-priority next action, or explain why no action is needed.")
});
