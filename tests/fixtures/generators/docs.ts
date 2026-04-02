/**
 * Document fixture generator.
 *
 * Writes rich Markdown content, then converts via pandoc to PDF, DOCX, etc.
 * Also generates CSV and plain text directly.
 */

import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { DIRS, hasCommand, log } from "./utils.js";

// --- Markdown source content ---

const ARTICLE_MD = `---
title: "Building CLI Tools with Modern JavaScript Runtimes"
author: "bun-kit Test Generator"
date: "2026-04-01"
---

# Building CLI Tools with Modern JavaScript Runtimes

## Introduction

The landscape of JavaScript runtimes has evolved significantly. Tools like Bun
offer single-binary compilation, making it feasible to ship CLI tools without
requiring users to install Node.js or manage dependencies.

## Key Features

### Input Routing

A well-designed CLI tool should detect the type of input automatically:

- **URLs**: Fetch and extract content from web pages
- **Documents**: Parse PDF, DOCX, XLSX files
- **Media**: Process video and audio with FFmpeg
- **Images**: OCR with Tesseract.js or cloud APIs

### Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Bun 1.3 | Single-binary compilation |
| CLI Framework | Commander.js | Argument parsing |
| Validation | Zod | Input/config validation |
| Web Scraping | Cheerio | HTML parsing |
| PDF | unpdf | Text extraction |

## Code Example

\`\`\`typescript
import { Command } from "commander";

const program = new Command();

program
  .name("bun-kit")
  .argument("<input>", "URL, file path, or text")
  .action(async (input: string) => {
    const handler = detectHandler(input);
    const result = await handler.process(input);
    console.log(result);
  });
\`\`\`

## Conclusion

Single-binary CLIs reduce friction for end users. The combination of Bun's
compilation and a robust handler-dispatch pattern makes this practical today.

> This document was auto-generated for testing bun-kit's document parsing pipeline.
`;

const REPORT_MD = `---
title: "Q1 2026 Performance Report"
author: "Analytics Team"
date: "2026-04-01"
---

# Q1 2026 Performance Report

## Summary

This report covers key metrics for Q1 2026. All numbers are synthetic test data.

## Metrics

| Metric | January | February | March | Q1 Total |
|--------|---------|----------|-------|----------|
| Active Users | 12,450 | 13,200 | 14,100 | 14,100 |
| API Calls (M) | 45.2 | 48.7 | 52.1 | 146.0 |
| Avg Latency (ms) | 124 | 118 | 112 | 118 |
| Error Rate (%) | 0.32 | 0.28 | 0.21 | 0.27 |
| Revenue ($K) | 890 | 945 | 1,020 | 2,855 |

## Analysis

1. **User Growth**: +13.3% quarter-over-quarter
2. **Performance**: Latency improved by 9.7% due to caching layer deployment
3. **Reliability**: Error rate decreased from 0.32% to 0.21%

## Recommendations

- Scale API infrastructure to handle projected 60M calls/month in Q2
- Investigate latency spikes on February 14th (Valentine's Day traffic)
- Deploy canary releases for the new auth middleware

> This document was auto-generated for testing bun-kit's document parsing pipeline.
`;

const CSV_DATA = `id,name,type,size_kb,handler,expected_output
1,blog-post.html,web,64,cheerio,"Article text extracted"
2,react-app.html,web,128,playwright,"JS-rendered content captured"
3,report.pdf,document,1024,unpdf,"PDF text extracted"
4,resume.docx,document,256,mammoth,"DOCX text extracted"
5,data.xlsx,spreadsheet,512,xlsx,"Table data parsed to JSON"
6,screenshot.png,image,2048,tesseract,"OCR text recognized"
7,lecture.mp4,video,51200,ffmpeg+whisper,"Audio transcribed to text"
8,podcast.mp3,audio,8192,whisper,"Audio transcribed to text"
9,empty.pdf,edge-case,0,error,"Empty file error message"
10,unknown.psd,edge-case,4096,error,"Unsupported format error"
`;

export async function generateDocs(hasPandoc: boolean) {
  console.log("\n=== Documents ===");

  // Always write Markdown sources
  const articleMdPath = join(DIRS.docs, "article.md");
  const reportMdPath = join(DIRS.docs, "report.md");

  writeFileSync(articleMdPath, ARTICLE_MD, "utf-8");
  log("docs", "Written docs/article.md");

  writeFileSync(reportMdPath, REPORT_MD, "utf-8");
  log("docs", "Written docs/report.md");

  // CSV
  writeFileSync(join(DIRS.docs, "test-cases.csv"), CSV_DATA, "utf-8");
  log("docs", "Written docs/test-cases.csv");

  // Plain text
  writeFileSync(
    join(DIRS.docs, "sample.txt"),
    [
      "This is a plain text document for testing the file handler routing.",
      "It contains multiple lines of text that should be extracted as-is.",
      "",
      "Line 3: bun-kit should detect .txt and return contents directly.",
      "Line 4: 中文测试 — CJK character support validation.",
      "Line 5: Special chars: é à ü ñ ß — Unicode handling.",
    ].join("\n") + "\n",
    "utf-8"
  );
  log("docs", "Written docs/sample.txt");

  // Pandoc conversions
  if (!hasPandoc) {
    log("docs", "SKIP pandoc conversions (pandoc not installed)");
    log("docs", "Install: brew install pandoc");
    log("docs", "Then re-run to generate PDF and DOCX files");
    return;
  }

  // MD → DOCX
  try {
    execSync(`pandoc "${articleMdPath}" -o "${join(DIRS.docs, "article.docx")}"`, { stdio: "pipe" });
    log("docs", "Generated docs/article.docx (via pandoc)");
  } catch (e: any) {
    log("docs", `FAIL article.docx: ${e.message}`);
  }

  try {
    execSync(`pandoc "${reportMdPath}" -o "${join(DIRS.docs, "report.docx")}"`, { stdio: "pipe" });
    log("docs", "Generated docs/report.docx (via pandoc)");
  } catch (e: any) {
    log("docs", `FAIL report.docx: ${e.message}`);
  }

  // MD → PDF (requires a LaTeX engine or use --pdf-engine=wkhtmltopdf)
  // Try with default engine first, fall back to HTML-based
  const pdfEngines = ["pdflatex", "wkhtmltopdf", "weasyprint"];
  let pdfEngine: string | null = null;
  for (const engine of pdfEngines) {
    if (hasCommand(engine)) {
      pdfEngine = engine;
      break;
    }
  }

  if (pdfEngine) {
    try {
      const engineFlag = pdfEngine === "pdflatex" ? "" : `--pdf-engine=${pdfEngine}`;
      execSync(`pandoc ${engineFlag} "${articleMdPath}" -o "${join(DIRS.docs, "article.pdf")}"`, { stdio: "pipe" });
      log("docs", `Generated docs/article.pdf (via pandoc + ${pdfEngine})`);
    } catch (e: any) {
      log("docs", `FAIL article.pdf: ${e.message}`);
    }

    try {
      const engineFlag = pdfEngine === "pdflatex" ? "" : `--pdf-engine=${pdfEngine}`;
      execSync(`pandoc ${engineFlag} "${reportMdPath}" -o "${join(DIRS.docs, "report.pdf")}"`, { stdio: "pipe" });
      log("docs", `Generated docs/report.pdf (via pandoc + ${pdfEngine})`);
    } catch (e: any) {
      log("docs", `FAIL report.pdf: ${e.message}`);
    }
  } else {
    log("docs", "SKIP PDF generation (no PDF engine: install pdflatex, wkhtmltopdf, or weasyprint)");
    log("docs", "For LaTeX: brew install --cask mactex-no-gui");
    log("docs", "For HTML-based: brew install weasyprint");
  }
}
