import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Config } from "./config";
import { InputError, NetworkError } from "./errors";
import { log } from "./output";

export interface AsrResult {
  text: string;
  mode: "cloud" | "local";
}

function hasCommand(cmd: string): boolean {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    return Bun.spawnSync([which, cmd]).exitCode === 0;
  } catch {
    return false;
  }
}

async function asrCloud(audioPath: string, config: Config): Promise<AsrResult> {
  log("ASR via cloud (OpenAI Whisper API)...");

  // Dynamic import to avoid bundling issues
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: config.openai_api_key });

  try {
    const file = Bun.file(audioPath);
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });
    return { text: result.text, mode: "cloud" };
  } catch (err: any) {
    const status = err?.status ?? 0;
    if (status === 401) throw new InputError("Invalid OpenAI API key");
    throw new NetworkError(`OpenAI Whisper API error: ${err?.message ?? err}`);
  }
}

function findWhisperModel(modelName: string): string | null {
  const filename = `ggml-${modelName}.bin`;
  const home = homedir();
  const searchPaths = [
    join(home, ".local", "share", "whisper", filename),
    join(home, ".cache", "whisper", filename),
    `/usr/local/share/whisper/${filename}`,
    `/opt/homebrew/share/whisper/${filename}`,
    join(home, "Library", "Caches", "whisper", filename),
    // Windows paths
    join(home, "AppData", "Local", "whisper", filename),
    join(home, ".whisper", filename),
  ];

  for (const p of searchPaths) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function asrLocal(audioPath: string, config: Config): Promise<AsrResult> {
  const modelName = config.whisper_model ?? "base";
  log(`ASR via local whisper.cpp (model: ${modelName})...`);

  // Find the whisper CLI command
  const cmd = hasCommand("whisper-cli") ? "whisper-cli" : hasCommand("whisper") ? "whisper" : null;
  if (!cmd) {
    throw new InputError(
      "whisper.cpp not installed. Install with:\n  brew install whisper-cpp\nOr set OPENAI_API_KEY for cloud ASR.",
    );
  }

  const modelPath = findWhisperModel(modelName);
  if (!modelPath) {
    throw new InputError(
      `Whisper model "${modelName}" not found. Download it:\n  mkdir -p ~/.local/share/whisper && curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin" -o ~/.local/share/whisper/ggml-${modelName}.bin`,
    );
  }

  // Run whisper.cpp
  const proc = Bun.spawn([cmd, "-m", modelPath, "-f", audioPath, "-np", "-nt"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new InputError(`whisper.cpp failed (exit ${exitCode}): ${stderr.trim().split("\n").pop()}`);
  }

  return { text: stdout.trim(), mode: "local" };
}

export async function transcribe(audioPath: string, config: Config): Promise<AsrResult> {
  // Cloud preferred when API key available
  if (config.openai_api_key) {
    try {
      return await asrCloud(audioPath, config);
    } catch (err) {
      if (hasCommand("whisper-cli") || hasCommand("whisper")) {
        log(`Cloud ASR failed, falling back to local: ${err instanceof Error ? err.message : err}`);
      } else {
        throw err;
      }
    }
  }

  // Local fallback
  if (hasCommand("whisper-cli") || hasCommand("whisper")) {
    return asrLocal(audioPath, config);
  }

  throw new InputError(
    "No ASR backend available. Either:\n  1. Set OPENAI_API_KEY for cloud transcription\n  2. Install whisper.cpp: brew install whisper-cpp",
  );
}
