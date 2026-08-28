import { runBatchValidation } from "./validationHarness.js";

const batch = runBatchValidation();
const summary = {
  totalRuns: batch.totalRuns,
  completedRuns: batch.completedRuns,
  architectureSafetyPasses: batch.architectureSafetyPasses,
  aggregate: batch.aggregate
};

console.log(JSON.stringify(summary, null, 2));

if (batch.aggregate.totalDirectAiExecutions !== 0) process.exitCode = 2;
if (batch.architectureSafetyPasses !== batch.totalRuns) process.exitCode = 3;
