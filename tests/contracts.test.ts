import { describe, expect, it } from "vitest";
import { AiPromptRequestSchema } from "../src/contracts.js";

describe("AiPromptRequestSchema", () => {
  it("accepts a valid local AI request", () => {
    const parsed = AiPromptRequestSchema.parse({ prompt: "Return AI_READY" });
    expect(parsed.prompt).toBe("Return AI_READY");
    expect(parsed.temperature).toBe(0.1);
  });

  it("rejects empty prompts", () => {
    expect(() => AiPromptRequestSchema.parse({ prompt: "" })).toThrow();
  });

  it("rejects unsafe temperature values outside the contract", () => {
    expect(() => AiPromptRequestSchema.parse({ prompt: "test", temperature: 3 })).toThrow();
  });
});
