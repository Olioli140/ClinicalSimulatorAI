import { z } from "zod";
import { ActionContextSchema, AiActionProposalSchema } from "./actionContracts.js";

export const AutonomyConfigSchema = z.object({
  scope: z.literal("maintenance_only").default("maintenance_only"),
  minReassessmentSeconds: z.number().int().min(5).default(15),
  maxReassessmentSeconds: z.number().int().min(10).max(300).default(60),
  maxSessionSeconds: z.number().int().min(60).max(21600).default(3600),
  maxConsecutiveValidatorRejections: z.number().int().min(1).max(10).default(3),
  requireHostAcknowledgement: z.literal(true).default(true)
}).strict();
export type AutonomyConfig = z.infer<typeof AutonomyConfigSchema>;

export const HostSafetyStateSchema = z.object({
  airwaySecured: z.boolean(),
  anesthesiaMachineConnected: z.boolean(),
  emergencyStop: z.boolean().default(false),
  instructorPause: z.boolean().default(false)
}).strict();

export const HostActionResultSchema = z.object({
  proposalId: z.string().min(1),
  status: z.enum(["accepted", "rejected", "failed"]),
  reason: z.string().optional(),
  hostTimestamp: z.number().nonnegative()
}).strict();

export const AutonomySessionSchema = z.object({
  sessionId: z.string().min(1),
  cycleIndex: z.number().int().nonnegative(),
  elapsedSeconds: z.number().nonnegative(),
  consecutiveValidatorRejections: z.number().int().nonnegative().default(0),
  lastHostActionResult: HostActionResultSchema.optional()
}).strict();

export const AutonomyStepRequestSchema = z.object({
  context: ActionContextSchema,
  config: AutonomyConfigSchema.default({}),
  safety: HostSafetyStateSchema,
  session: AutonomySessionSchema
}).strict();
export type AutonomyStepRequest = z.infer<typeof AutonomyStepRequestSchema>;

export const AutonomousModelDecisionSchema = z.object({
  decision: z.enum(["hold", "propose_action", "stop"]),
  assessment: z.string().min(1),
  priority: z.enum(["routine", "attention", "urgent", "critical"]),
  reasoningSummary: z.string().min(1),
  waitSeconds: z.number().int().min(5).max(300),
  actionProposal: AiActionProposalSchema.optional(),
  stopReason: z.string().optional()
}).strict().superRefine((value, ctx) => {
  if (value.decision === "propose_action" && !value.actionProposal) {
    ctx.addIssue({ code: "custom", message: "actionProposal is required for propose_action" });
  }
  if (value.decision !== "propose_action" && value.actionProposal) {
    ctx.addIssue({ code: "custom", message: "actionProposal is only allowed for propose_action" });
  }
  if (value.decision === "stop" && !value.stopReason) {
    ctx.addIssue({ code: "custom", message: "stopReason is required for stop" });
  }
});
export type AutonomousModelDecision = z.infer<typeof AutonomousModelDecisionSchema>;

export const AutonomyAuditEntrySchema = z.object({
  sessionId: z.string(),
  cycleIndex: z.number().int().nonnegative(),
  simulatorTimestamp: z.number().nonnegative(),
  phase: z.literal("maintenance"),
  assessment: z.string(),
  priority: z.enum(["routine", "attention", "urgent", "critical"]),
  decision: z.enum(["hold", "propose_action", "stop"]),
  reasoningSummary: z.string(),
  proposal: AiActionProposalSchema.optional(),
  validatorAccepted: z.boolean().optional(),
  validatorReasons: z.array(z.string()).default([]),
  hostExecutionRequired: z.literal(true),
  executedByAiService: z.literal(false),
  nextReassessmentSeconds: z.number().int().min(5).max(300)
}).strict();
