/**
 * URL fixture generator.
 *
 * Fetches real URLs, validates accessibility, saves HTML snapshots
 * for offline/deterministic testing.
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { DIRS, log } from "./utils.js";

interface TestUrl {
  url: string;
  type: "static" | "spa" | "error";
  description: string;
}

// Curated test URLs — stable, public, unlikely to change
const TEST_URLS: TestUrl[] = [
  // Static pages (cheerio + readability)
  { url: "https://blog.rust-lang.org/2024/02/08/Rust-1.76.0.html", type: "static", description: "Rust blog post, clean article structure" },
  { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions", type: "static", description: "MDN docs, semantic HTML with code blocks" },
  { url: "https://en.wikipedia.org/wiki/Command-line_interface", type: "static", description: "Wikipedia, complex structure with tables and refs" },
  { url: "https://www.paulgraham.com/greatwork.html", type: "static", description: "Paul Graham essay, minimal HTML, long-form text" },
  // SPA / JS-rendered (needs Playwright)
  { url: "https://react.dev/learn", type: "spa", description: "React docs, client-side rendered" },
  { url: "https://vuejs.org/guide/introduction.html", type: "spa", description: "Vue docs, SPA with hydration" },
  // Error cases
  { url: "https://httpstat.us/404", type: "error", description: "404 response" },
  { url: "https://httpstat.us/500", type: "error", description: "500 server error" },
  { url: "https://httpstat.us/200?sleep=15000", type: "error", description: "Slow response for timeout testing" },
  { url: "http://localhost:19999", type: "error", description: "Connection refused (unreachable)" },
];

async function fetchAndSave(url: string, filename: string): Promise<{ ok: boolean; status: number; size: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "bun-kit-fixture-generator/0.1" },
    });
    clearTimeout(timeout);

    const html = await res.text();
    writeFileSync(join(DIRS.web, filename), html, "utf-8");

    return { ok: res.ok, status: res.status, size: html.length };
  } catch (e: any) {
    return { ok: false, status: 0, size: 0 };
  }
}

export async function generateUrls() {
  console.log("\n=== URLs ===");

  // Write urls.txt
  const lines: string[] = [
    "# bun-kit Test URLs",
    "# Format: URL | type | description",
    "# Auto-generated — re-run `npm run generate-fixtures` to refresh",
    "",
  ];

  for (const group of ["static", "spa", "error"] as const) {
    lines.push(`# === ${group.toUpperCase()} ===`);
    for (const u of TEST_URLS.filter((t) => t.type === group)) {
      lines.push(`${u.url} | ${u.type} | ${u.description}`);
    }
    lines.push("");
  }

  writeFileSync(join(DIRS.web, "..", "urls.txt"), lines.join("\n"), "utf-8");
  log("urls", "Written urls.txt");

  // Fetch static pages and save HTML snapshots for offline testing
  const staticUrls = TEST_URLS.filter((u) => u.type === "static");
  log("urls", `Fetching ${staticUrls.length} static pages for offline snapshots...`);

  const results = await Promise.allSettled(
    staticUrls.map(async (u, i) => {
      const filename = `snapshot-${i + 1}.html`;
      const result = await fetchAndSave(u.url, filename);
      if (result.ok) {
        log("urls", `  OK ${filename} (${(result.size / 1024).toFixed(1)}KB) — ${u.url}`);
      } else {
        log("urls", `  FAIL ${u.url} — status ${result.status}`);
      }
      return result;
    })
  );

  const ok = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;
  log("urls", `Saved ${ok}/${staticUrls.length} HTML snapshots to web/`);
}
