import { describe, expect, test } from "bun:test";
import { detectInputType } from "../../src/router";

describe("detectInputType", () => {
  test("detects HTTP URLs", () => {
    expect(detectInputType("https://example.com")).toBe("url");
    expect(detectInputType("http://example.com/path?q=1")).toBe("url");
    expect(detectInputType("HTTPS://EXAMPLE.COM")).toBe("url");
  });

  test("detects stdin marker", () => {
    expect(detectInputType("-")).toBe("stdin");
  });

  test("detects existing files", () => {
    expect(detectInputType("package.json")).toBe("file");
    expect(detectInputType("./package.json")).toBe("file");
  });

  test("returns unknown for non-existent paths", () => {
    expect(detectInputType("definitely-not-a-file-xyz.abc")).toBe("unknown");
  });

  test("returns unknown for random strings", () => {
    expect(detectInputType("hello world")).toBe("unknown");
  });
});
