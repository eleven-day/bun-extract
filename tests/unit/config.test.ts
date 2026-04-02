import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { loadConfig, ConfigSchema } from "../../src/config";

describe("ConfigSchema", () => {
  test("accepts empty object", () => {
    expect(ConfigSchema.parse({})).toEqual({});
  });

  test("accepts valid config", () => {
    const config = ConfigSchema.parse({
      openrouter_api_key: "sk-test",
      default_model: "claude-3-haiku",
    });
    expect(config.openrouter_api_key).toBe("sk-test");
    expect(config.default_model).toBe("claude-3-haiku");
  });

  test("rejects unknown fields in strict mode", () => {
    expect(() => ConfigSchema.parse({ unknown_field: "x" })).toThrow();
  });
});

describe("loadConfig", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    savedEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    savedEnv.BUN_KIT_MODEL = process.env.BUN_KIT_MODEL;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.BUN_KIT_MODEL;
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  test("returns empty config when no file exists", async () => {
    const config = await loadConfig();
    expect(config).toEqual({});
  });

  test("env var OPENROUTER_API_KEY overrides config", async () => {
    process.env.OPENROUTER_API_KEY = "env-key-123";
    const config = await loadConfig();
    expect(config.openrouter_api_key).toBe("env-key-123");
  });

  test("env var BUN_KIT_MODEL overrides config", async () => {
    process.env.BUN_KIT_MODEL = "gpt-4o";
    const config = await loadConfig();
    expect(config.default_model).toBe("gpt-4o");
  });
});
