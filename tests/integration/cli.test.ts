import { describe, expect, test } from "bun:test";
import { join } from "path";
import { unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";

const CLI = join(import.meta.dir, "../../src/index.ts");

async function run(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", CLI, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, OPENROUTER_API_KEY: undefined, OPENAI_API_KEY: undefined },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

describe("CLI", () => {
  test("--help exits 0 and shows usage", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("bun-kit");
    expect(stdout).toContain("Usage");
  });

  test("--version exits 0 and shows version", async () => {
    const { stdout, exitCode } = await run(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("0.1.0");
  });

  test("no args shows help", async () => {
    const { stdout, exitCode } = await run([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage");
  });

  test("--json outputs valid JSON envelope", async () => {
    const { stdout, exitCode } = await run(["https://example.com", "--json"]);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(stdout);
    expect(envelope.input).toBe("https://example.com");
    expect(envelope.type).toBe("url");
    expect(typeof envelope.text).toBe("string");
    expect(typeof envelope.metadata).toBe("object");
  });

  test("text mode outputs only text", async () => {
    const { stdout, exitCode } = await run(["https://example.com"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toContain("Example Domain");
  }, 30_000);

  test("--output writes to file and stdout is empty", async () => {
    const tmpFile = join(tmpdir(), `bun-kit-cli-test-${Date.now()}.txt`);
    try {
      const { stdout, exitCode } = await run(["tests/fixtures/docs/sample.txt", "--output", tmpFile]);
      expect(exitCode).toBe(0);
      expect(stdout).toBe("");
      const content = await Bun.file(tmpFile).text();
      expect(content.trim()).toContain("plain text document");
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    }
  });

  test("file handler extracts PDF via CLI", async () => {
    const { stdout, exitCode } = await run(["tests/fixtures/docs/article.pdf", "--json"]);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(stdout);
    expect(envelope.type).toBe("file");
    expect(envelope.metadata.handler).toBe("file");
    expect(envelope.text).toContain("Building CLI Tools");
  });

  test("web handler scrapes URL via CLI", async () => {
    const { stdout, exitCode } = await run(["https://example.com", "--json"]);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(stdout);
    expect(envelope.type).toBe("url");
    expect(envelope.metadata.handler).toBe("web");
    expect(envelope.text).toContain("Example Domain");
  }, 30_000);

  test("github handler processes repo URL via CLI", async () => {
    const { stdout, exitCode } = await run(["https://github.com/anthropics/anthropic-cookbook", "--json"]);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(stdout);
    expect(envelope.type).toBe("url");
    expect(envelope.metadata.handler).toBe("github");
    expect(envelope.metadata.mode).toBe("raw");
    expect(envelope.text).toContain("README");
  }, 15_000);

  test("--model flag is accepted", async () => {
    const { exitCode } = await run(["https://example.com", "--model", "test-model"]);
    expect(exitCode).toBe(0);
  }, 30_000);

  test("image handler OCR via CLI", async () => {
    const { stdout, exitCode } = await run(["tests/fixtures/images/screenshot-text.png", "--json"]);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(stdout);
    expect(envelope.type).toBe("file");
    expect(envelope.metadata.handler).toBe("image");
    expect(envelope.text.length).toBeGreaterThan(10);
  }, 60_000);

  test("video handler via CLI", async () => {
    const { stdout, exitCode } = await run(["tests/fixtures/media/short-clip.mp4", "--json"]);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(stdout);
    expect(envelope.type).toBe("file");
    expect(envelope.metadata.handler).toBe("video");
    expect(envelope.metadata.duration).toBeGreaterThan(0);
    expect(envelope.metadata.hasAudio).toBe(true);
  }, 60_000);

  test("audio handler ASR via CLI", async () => {
    const { stdout, exitCode } = await run(["tests/fixtures/media/speech-en.wav", "--json"]);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(stdout);
    expect(envelope.type).toBe("file");
    expect(envelope.metadata.handler).toBe("audio");
    expect(envelope.text.length).toBeGreaterThan(10);
  }, 60_000);

  test("unknown input falls through to echo", async () => {
    const { stdout } = await run(["random-nonexistent-input", "--json"]);
    const envelope = JSON.parse(stdout);
    expect(envelope.type).toBe("unknown");
    expect(envelope.metadata.handler).toBe("echo");
  });
});
