import type { AiStateSnapshot, ExplainRequest } from "./contracts.js";

export function observableFacts(snapshot: AiStateSnapshot): string[] {
  const facts: string[] = [`Phase: ${snapshot.phase}`];
  const v = snapshot.vitals;
  if (v.hr !== undefined) facts.push(`HR ${v.hr}/min`);
  if (v.map !== undefined) facts.push(`MAP ${v.map} mmHg`);
  if (v.spo2 !== undefined) facts.push(`SpO2 ${v.spo2}%`);
  if (v.etco2 !== undefined) facts.push(`EtCO2 ${v.etco2} mmHg`);
  if (v.temperatureC !== undefined) facts.push(`Temperature ${v.temperatureC} C`);
  const a = snapshot.anesthesia;
  if (a.mac !== undefined) facts.push(`MAC ${a.mac}`);
  if (a.bis !== undefined) facts.push(`BIS ${a.bis}`);
  if (a.tofRatio !== undefined) facts.push(`TOF ratio ${a.tofRatio}`);
  if (a.tofCount !== undefined) facts.push(`TOF count ${a.tofCount}/4`);
  const vent = snapshot.ventilation;
  if (vent.mode) facts.push(`Ventilation mode ${vent.mode}`);
  if (vent.fio2 !== undefined) facts.push(`FiO2 ${vent.fio2}`);
  if (vent.minuteVentilationLMin !== undefined) facts.push(`Minute ventilation ${vent.minuteVentilationLMin} L/min`);
  if (vent.peakPressureCmH2O !== undefined) facts.push(`Peak pressure ${vent.peakPressureCmH2O} cmH2O`);
  for (const finding of snapshot.visibleFindings) facts.push(`Visible finding: ${finding}`);
  for (const trend of snapshot.trends) facts.push(`Trend: ${trend.signal} ${trend.direction} over ${trend.windowSeconds}s`);
  return facts;
}

export function buildExplainPrompt(request: ExplainRequest): { system: string; prompt: string } {
  const facts = observableFacts(request.snapshot);
  const modeInstruction = request.mode === "minimal"
    ? "Keep the explanation brief."
    : request.mode === "learning"
      ? "Teach the reasoning, include plausible alternatives and what would distinguish them."
      : "Explain the important reasoning in clear clinical teaching language.";

  return {
    system: [
      "You are an educational clinical simulation observer.",
      "You are NOT the treating clinician and you cannot act on the simulator.",
      "Use only the supplied observable facts. Never invent measurements, diagnoses, treatments, or hidden simulator state.",
      "Distinguish observations from interpretations and uncertainty.",
      "Return strict JSON with keys: assessment, priority, explanation, evidence, possibilities, watchNext, limitations.",
      "priority must be one of routine, attention, urgent, critical.",
      modeInstruction
    ].join(" "),
    prompt: `Participant question: ${request.question}\n\nObservable facts:\n- ${facts.join("\n- ")}\n\nRecent medications: ${JSON.stringify(request.snapshot.medications)}\nRecent actions: ${JSON.stringify(request.snapshot.recentActions)}`
  };
}
