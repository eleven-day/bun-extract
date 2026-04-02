import { describe, expect, test } from "bun:test";
import { githubHandler } from "../../../src/handlers/github";

describe("githubHandler.canHandle", () => {
  test("matches GitHub repo URLs", () => {
    expect(githubHandler.canHandle("https://github.com/owner/repo", "url")).toBe(true);
    expect(githubHandler.canHandle("https://github.com/oven-sh/bun", "url")).toBe(true);
    expect(githubHandler.canHandle("https://github.com/anthropics/anthropic-cookbook", "url")).toBe(true);
  });

  test("rejects GitHub URLs without repo", () => {
    expect(githubHandler.canHandle("https://github.com", "url")).toBe(false);
    expect(githubHandler.canHandle("https://github.com/owner", "url")).toBe(false);
  });

  test("rejects non-GitHub URLs", () => {
    expect(githubHandler.canHandle("https://example.com", "url")).toBe(false);
    expect(githubHandler.canHandle("https://gitlab.com/owner/repo", "url")).toBe(false);
  });

  test("rejects non-url input types", () => {
    expect(githubHandler.canHandle("https://github.com/owner/repo", "file")).toBe(false);
  });
});

describe("githubHandler.handle", () => {
  test("fetches real repo in raw mode (no API key)", async () => {
    const r = await githubHandler.handle("https://github.com/anthropics/anthropic-cookbook", {});
    expect(r.metadata.handler).toBe("github");
    expect(r.metadata.mode).toBe("raw");
    expect(r.metadata.owner).toBe("anthropics");
    expect(r.metadata.repo).toBe("anthropic-cookbook");
    expect(r.text).toContain("README");
    expect(r.text.length).toBeGreaterThan(100);
  }, 15_000);

  test("includes directory tree in raw output", async () => {
    const r = await githubHandler.handle("https://github.com/anthropics/anthropic-cookbook", {});
    expect(r.text).toContain("Directory Structure");
  }, 15_000);

  test("throws on non-existent repo", async () => {
    await expect(
      githubHandler.handle("https://github.com/nonexistent-user-xyz/nonexistent-repo-abc", {}),
    ).rejects.toThrow(/not found/i);
  }, 15_000);
});
