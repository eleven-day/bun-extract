# Stack Research

**Domain:** Bun-based CLI automation toolkit (web scraping, file parsing, OCR, ASR, LLM, video processing)
**Researched:** 2026-03-22
**Confidence:** MEDIUM — core Bun/TS choices HIGH, OCR/ASR library picks MEDIUM due to Bun compatibility gaps

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bun | 1.3.x | Runtime, bundler, package manager, single-binary compiler | `bun build --compile` produces a self-contained executable. Bun 1.3 (Oct 2025) improved Node.js compatibility to >90%, improved worker_threads, and reduced memory usage. Eliminates virtualenv/pip pain that motivated this project. |
| TypeScript | 5.x (bundled with Bun) | Language | Bun natively transpiles TypeScript. No `tsc` step needed. Static types prevent the class of bugs that surface when routing inputs across many handler branches. |
| Commander.js | ^12.x | CLI argument parsing | 500M+ weekly downloads. Battle-tested flag/subcommand parsing. TypeScript types are solid. Lighter than oclif for a single-binary tool. citty (from unjs) is an alternative but smaller community. Commander wins on ecosystem maturity. |
| Zod | ^3.x (or v4 when stable) | Config file + input validation | Validates `~/.bun-kit.json` keys (OpenRouter key, API URLs) at startup. Also validates handler outputs before piping to LLM. Zod v4 is 6.5x faster than v3 for object parsing and has improved TypeScript compilation speed — pin to v3 until v4 is declared stable in your target Bun version. |

### Supporting Libraries by Feature Area

#### Web Scraping

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cheerio` | ^1.0.0 | HTML parsing for static pages | Any URL where content is server-rendered. Parses the fetched HTML with a jQuery-like API. Zero browser overhead — just DOM querying. Use with Bun's native `fetch()`. |
| `playwright` | ^1.x | Headless browser for JS-rendered pages | When target page requires JavaScript execution (SPAs, React frontends, login-walled content). NOTE: Playwright bundles Chromium/Firefox — do NOT include in single-binary compilation path; it must be installed separately on the user's machine. |
| `@mozilla/readability` | ^0.5.x | Article content extraction | Use alongside cheerio to strip nav/footer/ads and extract the main article body from news, blog, and doc pages. Direct replacement for the "readable content" need. |

#### File Parsing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unpdf` | ^0.13.x | PDF text extraction | Built for serverless and cross-runtime (Node, Bun, Deno, browser). Modern ESM-only alternative to the unmaintained `pdf-parse`. Wraps Mozilla's PDF.js internally. Use for all PDF inputs. |
| `mammoth` | ^1.x | DOCX to plain text | Microsoft Word document extraction. Stable, no native bindings, works in Bun. |
| `xlsx` | ^0.18.x | Excel/CSV parsing | SheetJS for spreadsheet extraction. Pure JS, no native deps. |

#### OCR

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tesseract.js` | ^5.x | Local OCR for images | Pure WebAssembly port of Tesseract — no native bindings, so it compiles into the binary cleanly. Supports 100+ languages. **WARNING**: There is a documented Bun bug (#7984) where Tesseract.js crashes on language data download in some Bun versions. Test against your target Bun version before release. |
| OpenAI Vision API (via `openai` SDK) | cloud | Cloud OCR alternative | Use when local Tesseract quality is insufficient (handwriting, complex layouts). Route through the same OpenRouter key if the model is exposed there, or use the OpenAI SDK directly. |

#### ASR (Audio/Video Transcription)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `openai` (npm) | ^4.x | Cloud ASR via Whisper API | Call `audio.transcriptions.create()` with a file stream. OpenAI's Whisper API supports `whisper-1`, `gpt-4o-transcribe`, and `gpt-4o-mini-transcribe` models. Use for cloud-quality transcription when the user has an OpenAI key. |
| `nodejs-whisper` | ^0.2.x | Local Whisper via whisper.cpp | Node.js bindings for ggerganov's whisper.cpp. Provides offline transcription with no API call. Auto-converts audio to 16kHz WAV. **WARNING**: This is a native binding — it will NOT embed cleanly into a `bun build --compile` binary. See single-binary note below. |

#### LLM Integration

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@openrouter/sdk` | latest beta (pin to semver) | LLM calls via OpenRouter | Official SDK from the OpenRouter team. ESM-only. Supports streaming. Gives access to 300+ models (GPT-4o, Claude, Llama, Gemini) via one API key. **The SDK is in beta — pin to an exact version** (`@openrouter/sdk@x.y.z`) and test upgrades explicitly. |
| `@openrouter/ai-sdk-provider` | ^0.x | Vercel AI SDK adapter | Alternative if you want to use the Vercel AI SDK's unified streaming/tool interface. Adds a dependency on `ai` package. Only worth it if you plan to use AI SDK's streaming helpers in a future web UI. Skip for CLI-only v1. |

#### Video Processing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Bun.spawn()` (built-in) | — | FFmpeg subprocess wrapper | Bun's native `spawn` is the correct way to call the FFmpeg CLI. Exposes `stdin`, `stdout`, `stderr`. **Do not use** `fluent-ffmpeg` (archived by owner May 2025). **Do not use** `ffmpeg.wasm` (original author dropped Node support; WASM performance is 10-20x slower than native FFmpeg for video work). |
| `ffprobe-static` | ^3.x | Bundled ffprobe binary path | Resolves the path to a static ffprobe build. Useful when the user may not have ffprobe in PATH separately from ffmpeg. But note: static binaries can balloon binary size. Prefer requiring FFmpeg system installation. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Bun built-in test runner | Unit and integration tests | `bun test` — no Jest needed. Familiar `describe`/`it` API. Significantly faster than Jest/Vitest for a CLI project. |
| Bun built-in formatter | Code formatting | `bun fmt` in Bun 1.3 — wraps Biome. Eliminates Prettier dependency. |
| TypeScript strict mode | Type safety | Enable `strict: true` in `tsconfig.json`. Bun respects tsconfig. Critical for correct handler-dispatch logic. |
| `dotenv` or `Bun.env` | Config/key loading | Bun exposes `process.env` natively. For a config file (`~/.bun-kit.json`), use `Bun.file()` + `JSON.parse` + Zod schema. No dotenv needed. |

## Installation

```bash
# Init project
bun init -y

# CLI
bun add commander

# Validation
bun add zod

# Web scraping (static)
bun add cheerio @mozilla/readability

# Web scraping (dynamic — separate install, not in binary)
bun add playwright

# File parsing
bun add unpdf mammoth xlsx

# OCR (local WASM)
bun add tesseract.js

# LLM
bun add @openrouter/sdk

# ASR cloud
bun add openai

# ASR local (native — separate concern from binary)
bun add nodejs-whisper

# Dev
bun add -D @types/node typescript
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `commander` | `yargs` | When you need heavy argument coercion logic or already have a yargs codebase |
| `commander` | `citty` (unjs) | If the project grows to a plugin-based CLI with dynamic commands — citty handles that pattern well |
| `unpdf` | `pdf-parse` (npm) | `pdf-parse` is widely known but its npm publish is unmaintained. Only use it if `unpdf` has a specific gap |
| `unpdf` | `pdfjs-dist` (Mozilla) | When you need full rendering fidelity (page layout, fonts) rather than just text extraction |
| `@openrouter/sdk` | `openai` SDK pointed at OpenRouter | The openai package works against OpenRouter's OpenAI-compatible endpoint — acceptable if you want one fewer dependency, but you lose OpenRouter-specific features (model routing, cost headers) |
| `Bun.spawn()` for FFmpeg | `execa` | If Bun's spawn API proves too low-level for complex multi-pipe FFmpeg commands, execa provides a cleaner async/promise API. Compatible with Bun. |
| `tesseract.js` | `node-tesseract-ocr` CLI wrapper | `node-tesseract-ocr` last published 5 years ago. Avoid. |
| Cloud ASR (OpenAI SDK) | `whisper-node` | `whisper-node` also wraps whisper.cpp — similar to `nodejs-whisper`. Both require native compilation and won't embed in a Bun single binary. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fluent-ffmpeg` | Archived by maintainer on May 22, 2025. Read-only, no bug fixes. | `Bun.spawn()` directly, or `execa` for a cleaner API |
| `ffmpeg.wasm` | Original author dropped Node.js support; WASM is 10-20x slower than native for video; adds huge binary size | Require system FFmpeg, invoke via `Bun.spawn()` |
| `pdf-parse` (original) | Unmaintained npm publish. The mehmet-kozan fork has more recent activity but is not the canonical package. | `unpdf` (unjs, actively maintained, ESM, cross-runtime) |
| `node-tesseract-ocr` | Last published 5 years ago. Relies on spawning system Tesseract CLI, which adds an external dep with no quality control. | `tesseract.js` (WASM, self-contained, actively maintained) |
| `puppeteer` | Playwright superseded it for dynamic scraping. Puppeteer is Chromium-only; Playwright supports Chromium + Firefox + WebKit. | `playwright` |
| Jest / Vitest | No reason to add a test runner dependency — Bun ships one built-in. | `bun test` |
| `dotenv` package | Bun natively loads `.env` files at startup via `Bun.env`. The package is redundant. | `Bun.env` / `process.env` |
| Native Node.js addons (`.node` files) in the compiled binary | `bun build --compile` cannot embed native `.node` addons. They will cause module-not-found errors at runtime if you try to include them in the binary. | Ship these features as "requires system install" (e.g., nodejs-whisper, Playwright) with graceful error messages |

## Stack Patterns by Variant

**If user has no API keys (offline mode):**
- OCR: use `tesseract.js` (local WASM)
- ASR: use `nodejs-whisper` (local whisper.cpp, native binary — must be pre-installed)
- LLM: gracefully skip summarization step, output raw extracted text only
- Web: static-only via `cheerio`, skip JS-rendered pages

**If user has OpenRouter + OpenAI keys (full cloud mode):**
- OCR: route complex images to OpenAI Vision API via `openai` SDK
- ASR: call `openai.audio.transcriptions.create()` with `whisper-1` or `gpt-4o-transcribe`
- LLM: full summarization via `@openrouter/sdk`

**If packaging as a true zero-dep single binary:**
- Exclude `playwright` (headless browser), `nodejs-whisper` (native addon), `ffprobe-static` (binary blob)
- Bundle `tesseract.js` (WASM) and `unpdf` (WASM/JS) — these embed cleanly
- Require FFmpeg + ffprobe as system prerequisites; emit clear error messages when absent
- Binary size will be ~60-80MB (Bun runtime alone is ~57MB on darwin-arm64)

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `tesseract.js@5.x` | Bun 1.3.x | Worker-thread-based. Known crash in Bun 1.0.19 (#7984); verify against current Bun version. WASM workers improved in Bun 1.3. |
| `@openrouter/sdk` | Bun 1.3.x (ESM) | ESM-only. Bun handles ESM natively. Pin to a specific semver — SDK is in beta, breaking changes between minor versions. |
| `unpdf@0.13.x` | Bun 1.3.x | ESM-only; depends on PDF.js internally. |
| `playwright@1.x` | Not in binary | Playwright manages its own browser installs; do not attempt to bundle. Gate behind a runtime check that warns when Playwright is not installed. |
| `nodejs-whisper` | Not in binary | Native `.node` addon. Ship as optional feature with install docs. |
| `commander@12.x` | Bun 1.3.x | CommonJS + ESM dual package. Works in Bun. |
| `cheerio@1.0.x` | Bun 1.3.x | ESM. Wraps `parse5` — no native bindings. |

## Sources

- [Bun 1.3 Blog Post](https://bun.com/blog/bun-v1.3) — Version, features, worker_threads improvements (MEDIUM — page body not fully loaded, based on search results)
- [Bun single binary limitations (GitHub Issues)](https://github.com/oven-sh/bun/issues/14676) — Native module embedding, worker file limitations (HIGH — primary source)
- [fluent-ffmpeg archived](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/735) — Archived May 2025 (HIGH — GitHub record)
- [unjs/unpdf GitHub](https://github.com/unjs/unpdf) — Cross-runtime PDF extraction (HIGH — official repo)
- [OpenRouter TypeScript SDK](https://openrouter.ai/docs/sdks/typescript) — Official SDK, beta status (HIGH — official docs)
- [tesseract.js Bun issue #7984](https://github.com/oven-sh/bun/issues/7984) — Crash on language data download (MEDIUM — issue may be resolved in 1.3)
- [cheerio npm](https://www.npmjs.com/package/cheerio) — v1.0.0 current, stable (HIGH)
- [Bun spawn docs](https://bun.com/docs/runtime/child-process) — Native subprocess API (HIGH — official docs)
- [nodejs-whisper npm](https://www.npmjs.com/package/nodejs-whisper) — Local whisper.cpp bindings (MEDIUM)
- WebSearch: "bun build compile single binary limitations 2025" — binary size ~57MB for hello world, worker file limitation confirmed (LOW — community reports)

---
*Stack research for: Bun CLI automation toolkit (web scraping, OCR, ASR, LLM, video)*
*Researched: 2026-03-22*
