#!/usr/bin/env npx tsx
/**
 * bun-kit Test Fixture Generator
 *
 * Generates all test fixtures using AI services and local tools.
 *
 * Usage:
 *   npm run generate-fixtures              # Generate all fixtures
 *   GEMINI_API_KEY=xxx npm run generate-fixtures  # With AI media generation
 *
 * Prerequisites:
 *   Required: node/bun
 *   Optional: pandoc (for PDF/DOCX), ffmpeg (for audio/video), GEMINI_API_KEY (for AI media)
 *
 * Compatible with both Bun and Node.js (via tsx).
 */

import { ensureDirs, checkPrerequisites } from "./generators/utils.js";
import { generateUrls } from "./generators/urls.js";
import { generateDocs } from "./generators/docs.js";
import { generateMedia } from "./generators/media.js";
import { generateEdgeCases } from "./generators/edge-cases.js";

async function main() {
  console.log("=== bun-kit Fixture Generator ===");

  // Setup
  ensureDirs();
  const prereqs = checkPrerequisites();

  const startTime = Date.now();

  // Run generators — URLs and edge cases can run in parallel with docs
  const [urlResult, edgeResult] = await Promise.allSettled([
    generateUrls(),
    generateEdgeCases(),
  ]);

  // Docs depend on pandoc check
  await generateDocs(prereqs.pandoc);

  // Media depends on both GEMINI_API_KEY and ffmpeg
  await generateMedia(prereqs.geminiKey, prereqs.ffmpeg);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);

  if (!prereqs.pandoc || !prereqs.ffmpeg || !prereqs.geminiKey) {
    console.log("\nTo generate all fixtures, install missing prerequisites:");
    if (!prereqs.pandoc) console.log("  brew install pandoc");
    if (!prereqs.ffmpeg) console.log("  brew install ffmpeg");
    if (!prereqs.geminiKey) console.log("  export GEMINI_API_KEY=your-google-ai-studio-key");
    console.log("\nThen re-run: npm run generate-fixtures");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
