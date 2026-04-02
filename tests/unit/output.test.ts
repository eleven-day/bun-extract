import { describe, expect, test, afterEach } from "bun:test";
import { writeOutput } from "../../src/output";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { OutputEnvelope } from "../../src/types";

const sampleEnvelope: OutputEnvelope = {
  input: "https://example.com",
  type: "url",
  text: "Hello, world!",
  metadata: { handler: "test" },
};

const tmpFile = join(tmpdir(), `bun-kit-test-${Date.now()}.txt`);

afterEach(() => {
  if (existsSync(tmpFile)) unlinkSync(tmpFile);
});

describe("writeOutput", () => {
  test("json mode produces valid JSON with correct shape", async () => {
    const chunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: any) => {
      chunks.push(String(chunk));
      return true;
    };

    await writeOutput(sampleEnvelope, { json: true });
    process.stdout.write = origWrite;

    const output = JSON.parse(chunks.join(""));
    expect(output.input).toBe("https://example.com");
    expect(output.type).toBe("url");
    expect(output.text).toBe("Hello, world!");
    expect(output.metadata.handler).toBe("test");
  });

  test("text mode outputs only text field", async () => {
    const chunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: any) => {
      chunks.push(String(chunk));
      return true;
    };

    await writeOutput(sampleEnvelope, {});
    process.stdout.write = origWrite;

    expect(chunks.join("").trim()).toBe("Hello, world!");
  });

  test("--output writes to file", async () => {
    await writeOutput(sampleEnvelope, { output: tmpFile });

    const content = await Bun.file(tmpFile).text();
    expect(content.trim()).toBe("Hello, world!");
  });

  test("--output with --json writes JSON to file", async () => {
    await writeOutput(sampleEnvelope, { json: true, output: tmpFile });

    const content = await Bun.file(tmpFile).text();
    const parsed = JSON.parse(content);
    expect(parsed.input).toBe("https://example.com");
  });
});
