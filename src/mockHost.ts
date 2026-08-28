import type { AiActionProposal } from "./actionContracts.js";

export interface MockHostState {
  minute: number;
  hr: number;
  map: number;
  spo2: number;
  etco2: number;
  bis: number;
  norepinephrine: number;
  minuteVentilation: number;
  mac: number;
}

export class DeterministicMockHost {
  state: MockHostState = {
    minute: 0,
    hr: 72,
    map: 72,
    spo2: 98,
    etco2: 37,
    bis: 48,
    norepinephrine: 0.03,
    minuteVentilation: 6.5,
    mac: 0.9
  };

  applyDisturbance(kind: string): void {
    if (["hypotension", "validator_rejection", "host_failure"].includes(kind)) this.state.map = 54;
    if (kind === "hypoventilation") { this.state.etco2 = 52; this.state.minuteVentilation = 3.8; }
    if (kind === "light_anesthesia") { this.state.bis = 68; this.state.mac = 0.5; }
  }

  executeHostAction(proposal: AiActionProposal): { ok: boolean } {
    const p = proposal.action.parameters;
    if (proposal.action.type === "MED_INFUSION_ADJUST" && p.drug === "norepinephrine" && typeof p.rate === "number") {
      this.state.norepinephrine = p.rate;
      this.state.map = Math.min(85, this.state.map + 8);
    }
    if (proposal.action.type === "VENT_SET") {
      if (typeof p.minuteVentilationLMin === "number") this.state.minuteVentilation = p.minuteVentilationLMin;
      this.state.etco2 = Math.max(32, this.state.etco2 - 7);
    }
    if (proposal.action.type === "MED_INFUSION_ADJUST" && p.drug === "volatile" && typeof p.mac === "number") {
      this.state.mac = p.mac;
      this.state.bis = Math.max(40, this.state.bis - 12);
    }
    return { ok: true };
  }

  advance(minutes = 1): void {
    this.state.minute += minutes;
    if (this.state.map < 60 && this.state.norepinephrine >= 0.05) this.state.map += 2;
    if (this.state.etco2 > 45 && this.state.minuteVentilation >= 6) this.state.etco2 -= 1;
    if (this.state.bis > 60 && this.state.mac >= 0.8) this.state.bis -= 2;
  }
}
