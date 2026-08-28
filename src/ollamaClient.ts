import type { AiHealth, AiPromptRequest, AiPromptResponse } from "./contracts.js";

export interface OllamaClientOptions {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export class OllamaClient {
  constructor(private readonly options: OllamaClientOptions) {}

  async health(): Promise<AiHealth> {
    const started = performance.now();
    try {
      const response = await fetch(`${this.options.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(this.options.timeoutMs)
      });

      if (!response.ok) {
        return {
          status: "degraded",
          provider: "ollama",
          model: this.options.model,
          latencyMs: Math.round(performance.now() - started),
          detail: `Ollama returned HTTP ${response.status}`
        };
      }

      const body = (await response.json()) as { models?: Array<{ name?: string }> };
      const installed = body.models?.some((entry) => entry.name === this.options.model) ?? false;

      return {
        status: installed ? "ready" : "degraded",
        provider: "ollama",
        model: this.options.model,
        latencyMs: Math.round(performance.now() - started),
        detail: installed ? undefined : `Configured model '${this.options.model}' is not installed`
      };
    } catch (error) {
      return {
        status: "offline",
        provider: "ollama",
        model: this.options.model,
        latencyMs: Math.round(performance.now() - started),
        detail: error instanceof Error ? error.message : "Unknown Ollama connection error"
      };
    }
  }

  async generate(request: AiPromptRequest): Promise<AiPromptResponse> {
    const started = performance.now();
    const prompt = request.system
      ? `${request.system.trim()}\n\nUSER:\n${request.prompt.trim()}`
      : request.prompt.trim();

    const response = await fetch(`${this.options.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        prompt,
        stream: false,
        options: { temperature: request.temperature }
      }),
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Ollama generation failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as { response?: string };
    if (typeof body.response !== "string") {
      throw new Error("Ollama response did not contain generated text");
    }

    return {
      provider: "ollama",
      model: this.options.model,
      output: body.response,
      latencyMs: Math.round(performance.now() - started)
    };
  }
}
