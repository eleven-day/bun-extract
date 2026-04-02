import { describe, expect, test } from "bun:test";
import { complete } from "../../src/llm";

describe("complete", () => {
  test("throws AuthError when no API key", async () => {
    await expect(
      complete({ apiKey: "", model: "test", userPrompt: "hello" }),
    ).rejects.toThrow(/API key not configured/);
  });

  test("throws AuthError on invalid key", async () => {
    await expect(
      complete({ apiKey: "invalid-key-xxx", model: "anthropic/claude-3-haiku", userPrompt: "hello" }),
    ).rejects.toThrow();
  }, 15_000);
});
