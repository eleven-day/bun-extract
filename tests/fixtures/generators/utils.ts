import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

export const FIXTURES_DIR = join(import.meta.dirname, "..");

export const DIRS = {
  web: join(FIXTURES_DIR, "web"),
  docs: join(FIXTURES_DIR, "docs"),
  images: join(FIXTURES_DIR, "images"),
  media: join(FIXTURES_DIR, "media"),
  edgeCases: join(FIXTURES_DIR, "edge-cases"),
};

export function ensureDirs() {
  for (const dir of Object.values(DIRS)) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function checkPrerequisites(): { pandoc: boolean; ffmpeg: boolean; geminiKey: boolean } {
  const status = {
    pandoc: hasCommand("pandoc"),
    ffmpeg: hasCommand("ffmpeg"),
    geminiKey: !!process.env.GEMINI_API_KEY,
  };

  console.log("\n=== Prerequisites ===");
  console.log(`  pandoc:        ${status.pandoc ? "OK" : "MISSING — brew install pandoc"}`);
  console.log(`  ffmpeg:        ${status.ffmpeg ? "OK" : "MISSING — brew install ffmpeg"}`);
  console.log(`  GEMINI_API_KEY: ${status.geminiKey ? "OK" : "MISSING — export GEMINI_API_KEY=your-key"}`);
  console.log("");

  return status;
}

export function log(category: string, msg: string) {
  console.log(`  [${category}] ${msg}`);
}

export function runCmd(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}
