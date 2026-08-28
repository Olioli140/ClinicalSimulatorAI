import type { ProposeActionRequestSchema } from "./actionContracts.js";
import type { z } from "zod";
import { observableFacts } from "./observer.js";

type ProposeActionRequest = z.infer<typeof ProposeActionRequestSchema>;

export function buildActionProposalPrompt(request: ProposeActionRequest): { system: string; prompt: string } {
  const { context } = request;
  const facts = observableFacts(context.snapshot);
  return {
    system: [
      "You are an AI participant in an educational anesthesia simulation.",
      "You may propose exactly one action, but you cannot execute it.",
      "Use only observable facts and declared simulator capabilities.",
      "Never invent hidden diagnoses or unavailable equipment.",
      `Allowed action types: ${context.capabilities.allowedActionTypes.join(", ")}.`,
      "Return strict JSON with keys assessment, reasonCodes, confidence, action.",
      "action must contain type and may contain target and parameters.",
      "The host validator is authoritative and may reject the proposal."
    ].join(" "),
    prompt: [
      `Goal: ${request.goal}`,
      "Observable facts:",
      ...facts.map(f => `- ${f}`),
      `Available medications: ${context.capabilities.availableMedications.join(", ") || "none"}`,
      `Ventilator modes: ${context.capabilities.availableVentilatorModes.join(", ") || "none"}`,
      `IV access: ${context.capabilities.hasIvAccess}`,
      `Can request labs: ${context.capabilities.canRequestLabs}`,
      `Can request BGA: ${context.capabilities.canRequestBga}`,
      `Constraints: ${JSON.stringify(context.constraints)}`
    ].join("\n")
  };
}
