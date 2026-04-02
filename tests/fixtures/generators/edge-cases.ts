/**
 * Edge case fixture generator.
 *
 * Creates synthetic files for boundary/error testing.
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { DIRS, log } from "./utils.js";

export async function generateEdgeCases() {
  console.log("\n=== Edge Cases ===");

  // Empty files
  writeFileSync(join(DIRS.edgeCases, "empty.pdf"), "");
  log("edge", "empty.pdf (0 bytes)");

  writeFileSync(join(DIRS.edgeCases, "empty.txt"), "");
  log("edge", "empty.txt (0 bytes)");

  writeFileSync(join(DIRS.edgeCases, "empty.mp4"), "");
  log("edge", "empty.mp4 (0 bytes)");

  // Unsupported formats
  writeFileSync(join(DIRS.edgeCases, "unknown.psd"), "not-a-real-psd-file");
  log("edge", "unknown.psd (fake PSD)");

  writeFileSync(join(DIRS.edgeCases, "unknown.sketch"), "not-a-real-sketch-file");
  log("edge", "unknown.sketch (fake Sketch)");

  // No file extension
  writeFileSync(join(DIRS.edgeCases, "no-extension"), "This file has no extension. The handler should detect content type.");
  log("edge", "no-extension (no file extension)");

  // Binary garbage (not a valid file of any type)
  const randomBytes = Buffer.alloc(1024);
  for (let i = 0; i < randomBytes.length; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }
  writeFileSync(join(DIRS.edgeCases, "garbage.bin"), randomBytes);
  log("edge", "garbage.bin (1KB random bytes)");

  // Extremely long filename
  const longName = "a".repeat(200) + ".txt";
  writeFileSync(join(DIRS.edgeCases, longName), "Testing long filename handling");
  log("edge", `${"a".repeat(20)}...txt (200-char filename)`);

  // File with special characters in content
  writeFileSync(
    join(DIRS.edgeCases, "special-chars.txt"),
    [
      "Null byte: [\x00]",
      "Tab: [\t]",
      "Unicode emoji: [🚀🎉🔥]",
      "RTL text: [مرحبا]",
      "CJK: [你好世界]",
      "Math: [∑∏∫√∞]",
      "Control: [\x01\x02\x03]",
    ].join("\n") + "\n",
    "utf-8"
  );
  log("edge", "special-chars.txt (unicode + control chars)");

  // Fake PDF (has PDF magic bytes but invalid content)
  writeFileSync(join(DIRS.edgeCases, "corrupt.pdf"), "%PDF-1.4\nThis is not a valid PDF body.\n%%EOF\n");
  log("edge", "corrupt.pdf (valid header, invalid body)");

  // Large file generation hint
  writeFileSync(
    join(DIRS.edgeCases, "GENERATE-LARGE.sh"),
    `#!/bin/bash
# Generate large test files for boundary testing
set -e
cd "$(dirname "$0")"

echo "Generating 100MB random file..."
dd if=/dev/urandom of=large-100mb.bin bs=1048576 count=100 2>/dev/null
echo "OK: large-100mb.bin"

echo "Generating 1GB sparse file..."
dd if=/dev/zero of=large-1gb-sparse.bin bs=1 count=0 seek=1073741824 2>/dev/null
echo "OK: large-1gb-sparse.bin (sparse, actual disk usage ~0)"
`,
    "utf-8"
  );
  log("edge", "GENERATE-LARGE.sh (script for large file generation)");
}
