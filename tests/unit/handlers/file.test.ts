import { describe, expect, test } from "bun:test";
import { fileHandler } from "../../../src/handlers/file";
import { join } from "path";

const FIXTURES = join(import.meta.dir, "../../fixtures");

describe("fileHandler.canHandle", () => {
  test("matches file input type", () => {
    expect(fileHandler.canHandle("test.pdf", "file")).toBe(true);
  });

  test("rejects non-file types", () => {
    expect(fileHandler.canHandle("https://x.com", "url")).toBe(false);
    expect(fileHandler.canHandle("-", "stdin")).toBe(false);
    expect(fileHandler.canHandle("foo", "unknown")).toBe(false);
  });
});

describe("fileHandler.handle", () => {
  test("extracts PDF text", async () => {
    const r = await fileHandler.handle(join(FIXTURES, "docs/article.pdf"), {});
    expect(r.text).toContain("Building CLI Tools");
    expect(r.metadata.handler).toBe("file");
    expect(r.metadata.mimeType).toBe("application/pdf");
  });

  test("extracts DOCX text", async () => {
    const r = await fileHandler.handle(join(FIXTURES, "docs/article.docx"), {});
    expect(r.text).toContain("Building CLI Tools");
    expect(r.metadata.handler).toBe("file");
  });

  test("extracts plain text", async () => {
    const r = await fileHandler.handle(join(FIXTURES, "docs/sample.txt"), {});
    expect(r.text).toContain("plain text document");
    expect(r.text).toContain("中文测试");
  });

  test("extracts markdown", async () => {
    const r = await fileHandler.handle(join(FIXTURES, "docs/article.md"), {});
    expect(r.text).toContain("Building CLI Tools");
  });

  test("extracts CSV", async () => {
    const r = await fileHandler.handle(join(FIXTURES, "docs/test-cases.csv"), {});
    expect(r.text).toContain("name");
    expect(r.text).toContain("handler");
  });

  test("throws on empty file", async () => {
    await expect(
      fileHandler.handle(join(FIXTURES, "edge-cases/empty.txt"), {}),
    ).rejects.toThrow(/empty/i);
  });

  test("handles binary garbage gracefully", async () => {
    // kreuzberg may extract something or throw — either is acceptable
    try {
      const r = await fileHandler.handle(join(FIXTURES, "edge-cases/garbage.bin"), {});
      expect(typeof r.text).toBe("string");
    } catch (err: any) {
      expect(err.message).toContain("Failed to extract");
    }
  });
});
