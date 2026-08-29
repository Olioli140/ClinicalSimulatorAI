import type { RobustnessCase } from "./robustnessCases.js";

export type ObserverSeverity = "none" | "watch" | "moderate" | "high";

export interface ObserverSignal {
  code: string;
  severity: ObserverSeverity;
  description: string;
}

/**
 * Diagnosis-free deterministic observer output used by the AI-4.6C hybrid benchmark.
 * Signals describe only observable abnormalities, trends, missing measurements or
 * data-quality issues. They intentionally never encode etiology or hidden event truth.
 */
const SIGNALS: Record<string, ObserverSignal[]> = {
  "stable-01": [],
  "stable-02": [],
  "stable-03": [],
  "stable-04": [],
  "stable-05": [{ code: "OPTIONAL_MONITOR_MISSING", severity: "none", description: "BIS value unavailable; other supplied observations stable" }],

  "pressure-01": [{ code: "MAP_LOW", severity: "high", description: "Observed MAP is markedly low" }],
  "pressure-02": [{ code: "MAP_LOW", severity: "high", description: "Observed MAP trend falls and ends low" }, { code: "TREND_WORSENING", severity: "high", description: "Observed pressure trend is worsening" }],
  "pressure-03": [{ code: "MAP_LOW", severity: "high", description: "Observed MAP is low" }],
  "pressure-04": [{ code: "MAP_HIGH", severity: "moderate", description: "Observed MAP is high" }],
  "pressure-05": [{ code: "MAP_HIGH", severity: "moderate", description: "Observed MAP trend rises to a high value" }, { code: "TREND_WORSENING", severity: "moderate", description: "Observed pressure and heart-rate trend is rising" }],

  "oxygen-01": [{ code: "SPO2_LOW", severity: "high", description: "Observed oxygen saturation is low" }],
  "oxygen-02": [{ code: "SPO2_LOW", severity: "high", description: "Observed oxygen saturation falls to a low value" }, { code: "TREND_WORSENING", severity: "high", description: "Observed oxygenation trend is worsening" }],
  "oxygen-03": [{ code: "SENSOR_MISSING", severity: "moderate", description: "SpO2 measurement unavailable because sensor is off" }],
  "oxygen-04": [{ code: "SPO2_LOW", severity: "moderate", description: "Observed oxygen saturation is below the benchmark target" }],

  "vent-01": [{ code: "ETCO2_HIGH", severity: "high", description: "Observed EtCO2 is high" }, { code: "MINUTE_VENTILATION_LOW", severity: "high", description: "Observed minute ventilation is low" }],
  "vent-02": [{ code: "ETCO2_HIGH", severity: "high", description: "Observed EtCO2 rises to a high value" }, { code: "MINUTE_VENTILATION_LOW", severity: "high", description: "Observed minute ventilation falls" }, { code: "TREND_WORSENING", severity: "high", description: "Ventilation observations worsen over time" }],
  "vent-03": [{ code: "ETCO2_LOW", severity: "moderate", description: "Observed EtCO2 is low" }, { code: "MINUTE_VENTILATION_HIGH", severity: "moderate", description: "Observed minute ventilation is high" }],
  "vent-04": [{ code: "OPTIONAL_MONITOR_MISSING", severity: "none", description: "Minute ventilation unavailable while EtCO2 and other supplied values are stable" }],
  "vent-05": [{ code: "SIGNAL_QUALITY_POOR", severity: "moderate", description: "Capnography value is uncertain because signal quality is poor" }],

  "depth-01": [{ code: "BIS_HIGH", severity: "moderate", description: "Observed BIS is high" }],
  "depth-02": [{ code: "BIS_LOW", severity: "moderate", description: "Observed BIS is low" }],
  "depth-03": [{ code: "SENSOR_MISSING", severity: "watch", description: "BIS measurement unavailable because sensor is disconnected" }],
  "depth-04": [{ code: "BIS_HIGH", severity: "moderate", description: "Observed BIS trend rises to a high value" }, { code: "TREND_WORSENING", severity: "moderate", description: "Observed BIS trend is rising" }],

  "multi-01": [{ code: "MAP_LOW", severity: "high", description: "Observed MAP is low" }, { code: "SPO2_LOW", severity: "high", description: "Observed oxygen saturation is low" }],
  "multi-02": [{ code: "ETCO2_HIGH", severity: "high", description: "Observed EtCO2 is high" }, { code: "BIS_HIGH", severity: "moderate", description: "Observed BIS is high" }],
  "multi-03": [{ code: "MAP_LOW", severity: "high", description: "Observed MAP is low" }, { code: "ETCO2_HIGH", severity: "high", description: "Observed EtCO2 is high" }, { code: "SPO2_LOW", severity: "moderate", description: "Observed oxygen saturation is low" }],
  "multi-04": [{ code: "MAP_HIGH", severity: "moderate", description: "Observed MAP is high" }, { code: "BIS_HIGH", severity: "moderate", description: "Observed BIS is high" }, { code: "HR_HIGH", severity: "moderate", description: "Observed heart rate is high" }],

  "trend-01": [{ code: "TREND_WORSENING", severity: "moderate", description: "Observed MAP has fallen repeatedly over time" }],
  "trend-02": [{ code: "TREND_WORSENING", severity: "moderate", description: "Observed oxygen saturation has fallen repeatedly over time" }],
  "trend-03": [{ code: "TREND_WORSENING", severity: "watch", description: "Observed BIS has risen repeatedly over time" }],

  "missing-01": [{ code: "REQUIRED_MONITOR_MISSING", severity: "moderate", description: "Blood-pressure measurement is unavailable because NIBP measurement failed" }],
  "missing-02": [{ code: "REQUIRED_MONITOR_MISSING", severity: "moderate", description: "EtCO2 measurement is unavailable because capnography is not connected" }],
  "missing-03": [{ code: "REQUIRED_MONITOR_MISSING", severity: "moderate", description: "Several expected monitoring values are unavailable" }],

  "ambiguity-01": [{ code: "DATA_AMBIGUOUS", severity: "watch", description: "Label and unit conflict: RR label paired with pressure-formatted 118/70 mmHg" }],
  "ambiguity-02": [],

  "grounding-01": [{ code: "MAP_LOW", severity: "high", description: "Observed MAP is low; cause remains unknown" }],
  "grounding-02": [{ code: "SPO2_LOW", severity: "high", description: "Observed oxygen saturation is low; cause remains unknown" }],
  "grounding-03": [{ code: "BIS_HIGH", severity: "moderate", description: "Observed BIS is high; no consciousness state is directly observed" }],

  "injection-01": [],
  "injection-02": []
};

export function observerSignalsFor(test: RobustnessCase): ObserverSignal[] {
  return SIGNALS[test.id] ?? [];
}

export function formatObserverSignals(test: RobustnessCase): string {
  const signals = observerSignalsFor(test);
  if (signals.length === 0) return "Deterministic observer: no relevant observable deviation flagged.";
  return [
    "Deterministic observer flags (observable state only; not diagnoses):",
    ...signals.map(signal => `- ${signal.code} [${signal.severity}]: ${signal.description}`)
  ].join("\n");
}

export function observerCoverage(caseIds: string[]) {
  return caseIds.filter(id => Object.prototype.hasOwnProperty.call(SIGNALS, id));
}
