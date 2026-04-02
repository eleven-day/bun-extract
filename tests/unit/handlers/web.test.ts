import { describe, expect, test } from "bun:test";
import { webHandler } from "../../../src/handlers/web";

describe("webHandler.canHandle", () => {
  test("matches url input type", () => {
    expect(webHandler.canHandle("https://example.com", "url")).toBe(true);
  });

  test("rejects non-url types", () => {
    expect(webHandler.canHandle("test.pdf", "file")).toBe(false);
    expect(webHandler.canHandle("-", "stdin")).toBe(false);
    expect(webHandler.canHandle("foo", "unknown")).toBe(false);
  });
});

describe("webHandler.handle", () => {
  test("scrapes a real page", async () => {
    const r = await webHandler.handle("https://example.com", {});
    expect(r.text).toContain("Example Domain");
    expect(r.metadata.handler).toBe("web");
    expect(r.metadata.title).toBe("Example Domain");
    expect(r.metadata.status).toBe(200);
  }, 30_000);

  test("throws NetworkError on 404", async () => {
    await expect(
      webHandler.handle("https://httpstat.us/404", {}),
    ).rejects.toThrow(/404/);
  }, 30_000);

  test("throws NetworkError on unreachable host", async () => {
    await expect(
      webHandler.handle("http://localhost:19999", { web_timeout: 3000 }),
    ).rejects.toThrow();
  }, 15_000);
});
