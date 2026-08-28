import type { ActionContext, ActionValidationResult, AiActionProposal } from "./actionContracts.js";

function medicationName(proposal: AiActionProposal): string | undefined {
  const value = proposal.action.parameters.drug;
  return typeof value === "string" ? value : undefined;
}

export function validateActionProposal(proposal: AiActionProposal, context: ActionContext): ActionValidationResult {
  const reasons: string[] = [];
  const type = proposal.action.type;

  if (!context.capabilities.allowedActionTypes.includes(type)) {
    reasons.push(`ACTION_NOT_ALLOWED:${type}`);
  }

  if (type.startsWith("MED_")) {
    if (!context.capabilities.hasIvAccess) reasons.push("NO_IV_ACCESS");
    const drug = medicationName(proposal);
    if (!drug) reasons.push("MEDICATION_MISSING");
    else if (!context.capabilities.availableMedications.includes(drug)) reasons.push(`MEDICATION_UNAVAILABLE:${drug}`);

    if (type === "MED_BOLUS") {
      const dose = proposal.action.parameters.dose;
      if (typeof dose !== "number" || dose <= 0) reasons.push("INVALID_BOLUS_DOSE");
      if (drug && typeof dose === "number") {
        const maxDose = context.constraints.maxMedicationBolusByDrug[drug];
        if (maxDose !== undefined && dose > maxDose) reasons.push(`BOLUS_EXCEEDS_LIMIT:${drug}`);
      }
    }
  }

  if (type === "FLUID_GIVE") {
    if (!context.capabilities.hasIvAccess) reasons.push("NO_IV_ACCESS");
    const volumeMl = proposal.action.parameters.volumeMl;
    if (typeof volumeMl !== "number" || volumeMl <= 0) reasons.push("INVALID_FLUID_VOLUME");
    else if (volumeMl > context.constraints.maxFluidBolusMl) reasons.push("FLUID_EXCEEDS_LIMIT");
  }

  if (type === "VENT_MODE_CHANGE") {
    const mode = proposal.action.parameters.mode;
    if (typeof mode !== "string") reasons.push("VENT_MODE_MISSING");
    else if (!context.capabilities.availableVentilatorModes.includes(mode)) reasons.push(`VENT_MODE_UNAVAILABLE:${mode}`);
  }

  if (type === "REQUEST_LAB" && !context.capabilities.canRequestLabs) reasons.push("LAB_REQUEST_UNAVAILABLE");
  if (type === "REQUEST_BGA" && !context.capabilities.canRequestBga) reasons.push("BGA_REQUEST_UNAVAILABLE");

  const duplicate = context.snapshot.recentActions.find(
    action => action.type === type && action.secondsAgo < context.constraints.minSecondsBetweenSameAction
  );
  if (duplicate) reasons.push("ACTION_COOLDOWN_ACTIVE");

  return reasons.length === 0
    ? { accepted: true, reasons: [], normalizedProposal: proposal }
    : { accepted: false, reasons };
}
