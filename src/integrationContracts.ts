import { z } from "zod";
import { AiStateSnapshotSchema } from "./contracts.js";
import { AiActionProposalSchema } from "./actionContracts.js";

export const IntegrationModeSchema = z.enum(["off", "explain", "shadow", "controlled", "autonomous_maintenance"]);
export type IntegrationMode = z.infer<typeof IntegrationModeSchema>;

export const SimulatorSnapshotEnvelopeSchema = z.object({
  contractVersion: z.literal("1.0"),
  sessionId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  capturedAt: z.number().nonnegative(),
  mode: IntegrationModeSchema,
  snapshot: AiStateSnapshotSchema
}).strict();
export type SimulatorSnapshotEnvelope = z.infer<typeof SimulatorSnapshotEnvelopeSchema>;

export const SimulatorActionHandoffSchema = z.object({
  contractVersion: z.literal("1.0"),
  proposalId: z.string().min(1),
  sessionId: z.string().min(1),
  basedOnSequence: z.number().int().nonnegative(),
  createdAt: z.number().nonnegative(),
  proposal: AiActionProposalSchema
}).strict();
export type SimulatorActionHandoff = z.infer<typeof SimulatorActionHandoffSchema>;

export const SimulatorActionResultSchema = z.object({
  contractVersion: z.literal("1.0"),
  proposalId: z.string().min(1),
  sessionId: z.string().min(1),
  status: z.enum(["accepted", "rejected", "failed", "expired"]),
  hostTimestamp: z.number().nonnegative(),
  hostActionId: z.string().min(1).optional(),
  reasonCode: z.string().min(1).optional(),
  message: z.string().optional()
}).strict();
export type SimulatorActionResult = z.infer<typeof SimulatorActionResultSchema>;

export const IntegrationSafetyStateSchema = z.object({
  emergencyStop: z.boolean().default(false),
  instructorPause: z.boolean().default(false),
  participantVisible: z.boolean().default(true),
  autonomyEnabledByHost: z.boolean().default(false),
  airwaySecured: z.boolean(),
  anesthesiaMachineConnected: z.boolean()
}).strict();
export type IntegrationSafetyState = z.infer<typeof IntegrationSafetyStateSchema>;
