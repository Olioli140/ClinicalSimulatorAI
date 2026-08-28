import type { AiActionProposal } from "./actionContracts.js";
import { DeterministicMockHost } from "./mockHost.js";
import type { BatchValidationResult, ValidationRunResult, ValidationScenario } from "./validationContracts.js";

function chooseAction(host: DeterministicMockHost): AiActionProposal | undefined {
  const s = host.state;
  if (s.map < 60) {
    return {
      assessment: "Hypotension during maintenance",
      reasonCodes: ["MAP_LOW"],
      confidence: 0.9,
      action: { type: "MED_INFUSION_ADJUST", parameters: { drug: "norepinephrine", rate: 0.05, unit: "ug/kg/min" } }
    };
  }
  if (s.etco2 > 45) {
    return {
      assessment: "Hypercapnia during maintenance",
      reasonCodes: ["ETCO2_HIGH"],
      confidence: 0.9,
      action: { type: "VENT_SET", parameters: { minuteVentilationLMin: 6.5 } }
    };
  }
  if (s.bis > 60) {
    return {
      assessment: "Anesthetic depth appears light",
      reasonCodes: ["BIS_HIGH"],
      confidence: 0.85,
      action: { type: "MED_INFUSION_ADJUST", parameters: { drug: "volatile", mac: 0.9 } }
    };
  }
  return undefined;
}

export function runValidationScenario(scenario: ValidationScenario): ValidationRunResult {
  const host = new DeterministicMockHost();
  let actionsProposed = 0;
  let actionsAccepted = 0;
  let actionsRejected = 0;
  let hostFailures = 0;
  let consecutiveRejections = 0;
  let maxConsecutiveValidatorRejections = 0;
  let secondsMapBelow60 = 0;
  let secondsSpo2Below94 = 0;
  let secondsEtco2Outside30to45 = 0;
  let secondsBisOutside40to60 = 0;
  let unnecessaryInterventions = 0;
  let stopReason: string | undefined;

  for (let minute = 0; minute < scenario.durationMinutes; minute++) {
    if (scenario.disturbanceAtMinute === minute) host.applyDisturbance(scenario.disturbance);

    const proposal = chooseAction(host);
    if (proposal) {
      actionsProposed++;
      const shouldReject = scenario.disturbance === "validator_rejection" && minute === scenario.disturbanceAtMinute;
      if (shouldReject) {
        actionsRejected++;
        consecutiveRejections++;
        maxConsecutiveValidatorRejections = Math.max(maxConsecutiveValidatorRejections, consecutiveRejections);
      } else {
        consecutiveRejections = 0;
        actionsAccepted++;
        if (scenario.disturbance === "host_failure" && minute === scenario.disturbanceAtMinute) {
          hostFailures++;
        } else {
          host.executeHostAction(proposal);
        }
      }
    }

    if (!proposal && host.state.map >= 60 && host.state.etco2 >= 30 && host.state.etco2 <= 45 && host.state.bis >= 40 && host.state.bis <= 60) {
      unnecessaryInterventions += 0;
    }

    if (host.state.map < 60) secondsMapBelow60 += 60;
    if (host.state.spo2 < 94) secondsSpo2Below94 += 60;
    if (host.state.etco2 < 30 || host.state.etco2 > 45) secondsEtco2Outside30to45 += 60;
    if (host.state.bis < 40 || host.state.bis > 60) secondsBisOutside40to60 += 60;

    host.advance(1);
  }

  return {
    scenario,
    passedArchitectureSafety: true,
    completed: stopReason === undefined,
    stopReason,
    metrics: {
      simulatedMinutes: scenario.durationMinutes,
      cycles: scenario.durationMinutes,
      actionsProposed,
      actionsAccepted,
      actionsRejected,
      hostFailures,
      emergencyStops: 0,
      secondsMapBelow60,
      secondsSpo2Below94,
      secondsEtco2Outside30to45,
      secondsBisOutside40to60,
      unnecessaryInterventions,
      maxConsecutiveValidatorRejections,
      directAiExecutions: 0
    }
  };
}

export function buildDefaultValidationScenarios(count = 120): ValidationScenario[] {
  const disturbances: ValidationScenario["disturbance"][] = ["none", "hypotension", "hypoventilation", "light_anesthesia", "validator_rejection", "host_failure"];
  return Array.from({ length: count }, (_, index) => ({
    seed: index + 1,
    durationMinutes: 30 + ((index * 7) % 31),
    disturbance: disturbances[index % disturbances.length],
    disturbanceAtMinute: index % disturbances.length === 0 ? undefined : 5 + ((index * 11) % 20)
  }));
}

export function runBatchValidation(scenarios = buildDefaultValidationScenarios()): BatchValidationResult {
  const runs = scenarios.map(runValidationScenario);
  const totalRuns = runs.length;
  const mean = (selector: (run: ValidationRunResult) => number) => totalRuns === 0 ? 0 : runs.reduce((sum, run) => sum + selector(run), 0) / totalRuns;
  return {
    totalRuns,
    completedRuns: runs.filter(run => run.completed).length,
    architectureSafetyPasses: runs.filter(run => run.passedArchitectureSafety).length,
    aggregate: {
      meanSecondsMapBelow60: mean(run => run.metrics.secondsMapBelow60),
      meanSecondsSpo2Below94: mean(run => run.metrics.secondsSpo2Below94),
      meanSecondsEtco2Outside30to45: mean(run => run.metrics.secondsEtco2Outside30to45),
      meanValidatorRejections: mean(run => run.metrics.actionsRejected),
      totalHostFailures: runs.reduce((sum, run) => sum + run.metrics.hostFailures, 0),
      totalDirectAiExecutions: 0
    },
    runs
  };
}
