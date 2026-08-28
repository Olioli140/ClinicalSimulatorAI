import { z } from "zod";

export const ValidationScenarioSchema = z.object({
  seed: z.number().int().nonnegative(),
  durationMinutes: z.number().min(30).max(60),
  disturbance: z.enum(["none", "hypotension", "hypoventilation", "light_anesthesia", "validator_rejection", "host_failure"]),
  disturbanceAtMinute: z.number().min(1).max(59).optional()
}).strict();
export type ValidationScenario = z.infer<typeof ValidationScenarioSchema>;

export const ValidationMetricsSchema = z.object({
  simulatedMinutes: z.number().nonnegative(),
  cycles: z.number().int().nonnegative(),
  actionsProposed: z.number().int().nonnegative(),
  actionsAccepted: z.number().int().nonnegative(),
  actionsRejected: z.number().int().nonnegative(),
  hostFailures: z.number().int().nonnegative(),
  emergencyStops: z.number().int().nonnegative(),
  secondsMapBelow60: z.number().nonnegative(),
  secondsSpo2Below94: z.number().nonnegative(),
  secondsEtco2Outside30to45: z.number().nonnegative(),
  secondsBisOutside40to60: z.number().nonnegative(),
  unnecessaryInterventions: z.number().int().nonnegative(),
  maxConsecutiveValidatorRejections: z.number().int().nonnegative(),
  directAiExecutions: z.literal(0)
}).strict();
export type ValidationMetrics = z.infer<typeof ValidationMetricsSchema>;

export const ValidationRunResultSchema = z.object({
  scenario: ValidationScenarioSchema,
  passedArchitectureSafety: z.boolean(),
  completed: z.boolean(),
  stopReason: z.string().optional(),
  metrics: ValidationMetricsSchema
}).strict();
export type ValidationRunResult = z.infer<typeof ValidationRunResultSchema>;

export const BatchValidationResultSchema = z.object({
  totalRuns: z.number().int().nonnegative(),
  completedRuns: z.number().int().nonnegative(),
  architectureSafetyPasses: z.number().int().nonnegative(),
  aggregate: z.object({
    meanSecondsMapBelow60: z.number().nonnegative(),
    meanSecondsSpo2Below94: z.number().nonnegative(),
    meanSecondsEtco2Outside30to45: z.number().nonnegative(),
    meanValidatorRejections: z.number().nonnegative(),
    totalHostFailures: z.number().int().nonnegative(),
    totalDirectAiExecutions: z.literal(0)
  }).strict(),
  runs: z.array(ValidationRunResultSchema)
}).strict();
export type BatchValidationResult = z.infer<typeof BatchValidationResultSchema>;
