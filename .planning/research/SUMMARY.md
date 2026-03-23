# Project Research Summary

**Project:** bun-kit
**Domain:** CLI automation toolkit — single-binary, multi-modal input routing (web, files, OCR, ASR, video, LLM)
**Researched:** 2026-03-22
**Confidence:** HIGH (architecture and pitfalls), MEDIUM (OCR/ASR library compatibility)

## Executive Summary

bun-kit is a personal-tool-grade CLI automation toolkit whose core value proposition is zero-friction input routing: pass it a URL, a GitHub repo link, a PDF, an image, an audio file, or a video, and it does the right thing — extracting and optionally summarizing the content through LLM — without the user remembering subcommands or managing Python virtualenvs. The entire tool ships as a self-contained binary built via `bun build --compile`, eliminating install pain. No comparable tool covers all these input types in a single binary; the closest competitors (repomix, Simon Willison's `llm`, OpenAI's whisper CLI) each cover one modality. The auto-routing engine across all input types is the genuine market gap.

The recommended approach is Bun 1.3.x as both runtime and compiler, TypeScript with strict mode, Commander.js for argument parsing, and Zod for config validation. For web scraping: cheerio for static pages with Playwright as an opt-in fallback for JS-rendered pages. For files: unpdf (ESM, cross-runtime) for PDFs. For OCR: tesseract.js (pure WASM, embeds cleanly into the binary). For ASR: OpenAI Whisper API for cloud, whisper.cpp CLI invocation for local. For LLM: the official `@openrouter/sdk` (beta — pin to exact semver). FFmpeg is invoked as a system binary via `Bun.spawn()`. The architecture follows four clean layers: entry/CLI, routing (InputRouter + HandlerRegistry), handlers (thin orchestrators), and services (OCR, ASR, LLM, FFmpeg engines).

The primary risk is the single-binary constraint: native `.node` addons (node-tesseract-ocr, nodejs-whisper, sharp) silently fail in compiled binaries. This must be treated as a first-class constraint from day one — every dependency audited for `.node` files before adoption. A secondary risk is FFmpeg subprocess misuse: unread stderr causes deadlocks on large videos, and Bun does not support `pipe:3+` file descriptors. Both risks are mitigatable with upfront architectural decisions (WASM or shell-out for OCR/ASR; file-based FFmpeg intermediates instead of pipes) but expensive to fix retroactively.

## Key Findings

### Recommended Stack

The stack is anchored on Bun 1.3.x, which provides the runtime, compiler, test runner, and formatter in a single tool. `bun build --compile` produces a 60-80 MB self-contained binary (Bun runtime alone is ~57 MB); `--bytecode` flag gives 2x faster cold start at no code cost. The critical dependency constraint is that native Node.js addons (`.node` files) cannot be embedded — all libraries must be pure JS/TS or WASM. Libraries that meet this bar: tesseract.js (WASM OCR), unpdf (WASM/JS PDF), cheerio, mammoth, xlsx, Commander.js, Zod, and the OpenRouter SDK.

**Core technologies:**
- **Bun 1.3.x**: Runtime + compiler + test runner — eliminates Node/npm toolchain and produces the single-binary artifact
- **TypeScript (strict)**: Native Bun transpilation, no tsc step; strict mode prevents routing dispatch bugs
- **Commander.js 12.x**: Arg parsing — 500M weekly downloads, solid TS types, lighter than oclif
- **Zod 3.x**: Config and input validation at startup; pin v3 until v4 is stable in Bun
- **cheerio + @mozilla/readability**: Static HTML parsing and article extraction; pair with Playwright as opt-in browser fallback
- **unpdf 0.13.x**: PDF extraction — ESM-only, cross-runtime, actively maintained (replaces abandoned pdf-parse)
- **tesseract.js 5.x**: Local OCR via WASM — embeds into binary cleanly; verify against Bun 1.3 (issue #7984 may be resolved)
- **@openrouter/sdk (beta, pinned)**: LLM integration — 300+ models via one API key; pin exact semver
- **Bun.spawn()**: FFmpeg subprocess — do not use fluent-ffmpeg (archived May 2025) or ffmpeg.wasm (10-20x slower)

### Expected Features

Research confirms no existing tool covers the full input-type matrix in one binary. The auto-routing engine is both the core UX differentiator and the architectural foundation everything else depends on. It must be built before any handler.

**Must have (table stakes):**
- stdin/stdout/stderr separation and exit code contract — without this the tool cannot be piped
- `--help` and `--version` — signals maturity
- Config file (`~/.bun-kit/config.json`) + env var override for API keys — secrets must not live in shell history
- Actionable error messages on stderr, structured JSON (`{ input, type, text, metadata }`) on stdout with `--json`
- Web scraping (static HTML) — highest-frequency use case
- PDF text extraction — second most common file type
- Single binary distribution (macOS ARM64 + Linux x64 for v1)
- Auto-routing engine by input type — the core UX; without it the tool is a collection of subcommands

**Should have (competitive differentiators):**
- GitHub repo summarization (README + file tree + LLM) — repomix's 20k stars validate the demand
- LLM via OpenRouter with `--model` flag — model-agnostic, single API key
- OCR (cloud first via OpenAI Vision, Tesseract local fallback)
- ASR (cloud first via Whisper API, whisper.cpp local fallback)
- Video pipeline (FFmpeg → audio extraction → ASR transcription)
- `--bytecode` compile flag for 2x faster startup
- Windows x64 binary (cross-compile flag change only)

**Defer (v2+):**
- VLM-based OCR (DeepSeek-OCR) — requires GPU, doesn't fit personal-tool profile
- Run history / SQLite logging — only if users request it
- Streaming ASR — different architecture entirely
- Plugin/extension system — breaks single-binary guarantee
- GUI/web interface — contradicts CLI-native value proposition

### Architecture Approach

The architecture follows a strict four-layer dependency flow: Infrastructure (ConfigManager, OutputFormatter) → Services (OCREngine, ASREngine, LLMClient, FFmpegWrapper) → Handlers (WebHandler, GitHubHandler, FileHandler, ImageHandler, AudioHandler, VideoHandler) → Entry (cli.ts with InputRouter and HandlerRegistry). Each layer depends only on layers below it. All components receive dependencies via constructor injection — no global singletons, no module-level config initialization, which is critical because `bun build --compile` freezes module-level state at bundle time.

**Major components:**
1. **InputRouter + HandlerRegistry** — detects input discriminant (URL, github URL, file extension) and dispatches to the matching handler; clean extension point (add handler = one registry.set() call)
2. **Handler Layer (6 handlers)** — thin orchestrators that call services; contain no direct I/O; testable with mocked services
3. **Service Layer (OCR, ASR, LLM, FFmpeg)** — each uses Strategy pattern: an interface + factory function selects cloud vs local implementation from config at startup
4. **ConfigManager** — loaded once at entry point, passed into constructors; resolves config from `~/.bun-kit/config.json` using `process.execPath`-relative paths (not `import.meta.dir`, which resolves to the virtual bundled filesystem)
5. **OutputFormatter** — single responsibility: emit plain text or JSON envelope to stdout or `--output` file

Three key patterns: Handler Registry (Map-based dispatch, replaces if/else chains), Strategy Pattern (cloud vs local engine selection), and Pipeline Pattern (video: FFmpeg extract audio → temp file → ASR transcribe → cleanup in try/finally).

### Critical Pitfalls

1. **Native .node addons break single-binary** — `bun build --compile` cannot reliably embed `.node` files; the binary compiles but fails at runtime. Audit every dependency with `find node_modules -name "*.node"` before adopting it. Choose tesseract.js (WASM) over node-tesseract-ocr; shell out to whisper.cpp binary instead of nodejs-whisper. Establish this as a no-exceptions policy in Phase 1.

2. **Dynamic imports not bundled** — `import(variable)` paths are not statically analyzable and are excluded from the compiled binary silently. The binary works in dev (`bun run`) but crashes for end users. Mitigation: static imports for all handlers at the top of the entry file; test the compiled binary in a clean directory (no `node_modules`) at the end of every feature, not just at release.

3. **FFmpeg subprocess deadlock on large files** — unread stderr fills the OS pipe buffer (~16 KB on macOS), causing both FFmpeg and the parent to block indefinitely on files longer than ~5 minutes. Always drain stderr concurrently with `proc.exited`; pass `-loglevel error` to reduce FFmpeg verbosity. Bun also does not implement `pipe:3+` file descriptors — use file-based intermediates for multi-step FFmpeg pipelines.

4. **Config path resolution differs in compiled binary** — `import.meta.dir` and `__dirname` resolve to the virtual `$bunfs/root/...` path in a compiled binary, not the directory where the binary lives. User config files placed next to the binary are not found. Always resolve user-facing config paths using `process.execPath` or XDG config dirs (`~/.config/bun-kit/`).

5. **Web scraping silently returns empty on SPAs** — `fetch` + cheerio only sees server-rendered HTML; React/Vue SPAs return an empty root div with no content and no error. Implement a content-length heuristic to detect failed extractions and fall back to Playwright (`--browser` flag). Playwright cannot be embedded in the binary and requires separate install — document this as a system dependency.

## Implications for Roadmap

Based on research, the build order is dictated by two forces: (1) the single-binary constraint must be validated from the very first phase, and (2) the auto-routing engine is the architectural keystone that all handlers depend on. Suggested phases:

### Phase 1: Foundation and Binary Scaffold
**Rationale:** The single-binary constraint is the existential risk for this project. Every library choice and architectural decision must be validated against it before any handler is written. Config path resolution, the no-native-addons policy, and the CI binary test must be in place before features are built. Building features first and "fixing binary later" is the most expensive failure mode the research identifies.
**Delivers:** Working Bun project with Commander.js CLI entry, Zod-validated ConfigManager (with correct `process.execPath`-relative path resolution), OutputFormatter (plain + JSON modes), compiled binary that runs `--version` and `--help` in a clean directory, CI step that builds and smoke-tests the binary.
**Addresses:** Table stakes flags (`--help`, `--version`, `--json`, `--output`), config file + env var API key management, exit code contract.
**Avoids:** Native addon pitfall (policy established), config path resolution pitfall, dynamic import pitfall (CI binary test established).

### Phase 2: Auto-Routing Engine and Core Handlers (Web + File)
**Rationale:** The InputRouter and HandlerRegistry are the architectural backbone. Nothing else can be wired up without them. Web scraping and PDF parsing are the two highest-frequency use cases and the simplest to implement without external process management — they validate the routing pipeline end-to-end.
**Delivers:** InputRouter (URL/GitHub/file-extension detection), HandlerRegistry, WebHandler (fetch + cheerio + readability), FileHandler (unpdf PDF, mammoth DOCX, plain text), single binary that handles URLs and local files.
**Uses:** cheerio, @mozilla/readability, unpdf — all pure JS/WASM, embed cleanly.
**Implements:** Handler Registry pattern, dependency injection via constructors.
**Avoids:** SPA scraping pitfall (fetch mode only; document the limitation; Playwright fallback deferred to v1.x).

### Phase 3: LLM Integration and GitHub Summarizer
**Rationale:** LLM via OpenRouter unlocks the summarization step that transforms raw extracted text into valuable output. GitHub summarization is the highest-value single demo case and validates LLM + web scraping working together. GitHub handler depends on the web handler (for fetching raw files) and the LLM client.
**Delivers:** OpenRouterClient, LLM summarization step wired into WebHandler and GitHubHandler, `--model` flag for model selection, graceful error handling for 429 and mid-stream SSE errors.
**Uses:** @openrouter/sdk (pin exact semver — it is in beta).
**Implements:** LLMClient as injected dependency (optional — handlers receive `LLMClient | null`).
**Avoids:** OpenRouter streaming error pitfall (parse SSE error events, do not assume HTTP 200 = full success), free-tier rate limit pitfall (document 50 req/day limit).

### Phase 4: OCR and ASR (Cloud then Local)
**Rationale:** OCR and ASR follow the same cloud-first, local-fallback strategy. Cloud paths (OpenAI Vision API for OCR, Whisper API for ASR) are simpler to implement and validate first. Local paths (tesseract.js WASM, whisper.cpp binary) are added once cloud paths are stable. Both use the Strategy pattern — handlers call an engine interface and don't branch on cloud/local.
**Delivers:** OCREngine interface + CloudOCR + TesseractOCR implementations; ASREngine interface + CloudASR + WhisperASR implementations; ImageHandler and AudioHandler wired up.
**Uses:** tesseract.js (verify Bun 1.3 compatibility before committing; issue #7984); openai SDK for Whisper API; Bun.spawn for whisper.cpp CLI.
**Implements:** Strategy pattern (factory functions pick implementation from config at startup).
**Avoids:** tesseract.js Bun crash (test against Bun 1.3.x explicitly); nodejs-whisper native addon (shell out to whisper.cpp CLI instead).

### Phase 5: Video Processing Pipeline
**Rationale:** Video is the most complex handler because it composes FFmpeg subprocess management with the ASR engine. It must come after ASR is stable since it depends on the same transcription code path. FFmpeg pitfalls (deadlock on unread stderr, no pipe:3+ support) require deliberate design choices that must be in place before video is considered working.
**Delivers:** FFmpegWrapper (Bun.spawn with array argv, concurrent stderr drain), VideoHandler pipeline (metadata → audio extraction → ASR transcription → cleanup), file-based intermediate approach (no pipe:3+), progress indication on stderr.
**Uses:** Bun.spawn() directly (fluent-ffmpeg archived; ffmpeg.wasm rejected for performance).
**Implements:** Pipeline pattern with try/finally cleanup for temp audio files.
**Avoids:** FFmpeg deadlock pitfall (always drain stderr concurrently), Bun extra stdio pitfall (file intermediates only), shell string concatenation pitfall (argv array, never template literals).

### Phase 6: Cross-Platform Binary and Distribution
**Rationale:** Once all handlers are stable on macOS ARM64, cross-compiling to Linux x64 is a single flag change. This phase adds Windows x64, validates the binary in a clean Linux VM (no Bun installed), and produces GitHub Releases artifacts with an install script.
**Delivers:** Multi-platform binaries (macOS ARM64, Linux x64, Windows x64), install script, GitHub Releases workflow.
**Avoids:** Linux musl binary pitfall (issue #14292 — test on glibc Linux, not musl/Alpine, for v1).

### Phase Ordering Rationale

- Foundation must come first because the binary constraint affects every subsequent library choice. Discovering a native addon late is HIGH recovery cost per the pitfalls research.
- Auto-routing and core handlers (web + file) come second because all other handlers depend on the routing infrastructure and neither requires external process management — lowest risk for validating the full pipeline.
- LLM integration comes before OCR/ASR because the GitHub summarizer (highest-value demo) depends on it, and LLM is a pure HTTP call with no new subprocess or WASM complexity.
- OCR and ASR come before video because the video pipeline depends on ASR. Keeping them separate ensures the Strategy pattern is proven before composing it into the pipeline.
- Video comes last among handlers because it has the highest pitfall density (FFmpeg deadlock, extra stdio, temp file management) and the most external dependencies (system FFmpeg required).
- Distribution comes last — cross-compilation is a flag change, not a feature build.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (OCR/ASR):** tesseract.js Bun 1.3 compatibility (issue #7984 may or may not be resolved — must verify against exact Bun version before committing). whisper.cpp CLI interface and model download may have changed since research.
- **Phase 5 (Video):** FFmpeg argument arrays for audio extraction, keyframe extraction, and subtitle extraction are complex and version-sensitive. Research the exact ffmpeg invocation patterns during phase planning.
- **Phase 6 (Distribution):** Bun musl/Alpine Linux binary support (issue #14292) — research current status; if unresolved, document glibc-only support for v1.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation):** Bun CLI scaffolding, Commander.js, Zod config — all standard and well-documented.
- **Phase 2 (Web + File):** cheerio, unpdf, readability — mature libraries with clear APIs.
- **Phase 3 (LLM):** OpenRouter API is OpenAI-compatible; standard HTTP fetch pattern. Only complexity is SSE error handling.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core Bun/TS/Commander/Zod choices are HIGH. tesseract.js Bun 1.3 compat is MEDIUM (known issue, fix status unclear). @openrouter/sdk is MEDIUM (beta, pin semver). |
| Features | HIGH | Feature landscape is clear. Competitor analysis confirms the auto-routing gap. MVP scope is well-reasoned and conservative. |
| Architecture | HIGH | Layer separation, Handler Registry, Strategy, and Pipeline patterns are well-established. Bun-specific constraints (static imports, constructor injection) are verified against official docs. |
| Pitfalls | HIGH (critical), MEDIUM (integration) | Native addon and dynamic import pitfalls are verified against Bun GitHub issues. FFmpeg deadlock and pipe:3+ are verified. Integration gotchas (OpenRouter streaming, GitHub rate limiting) are MEDIUM — community-sourced. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **tesseract.js Bun 1.3 compatibility**: Issue #7984 was filed against Bun 1.0.19; Bun 1.3 improved worker_threads. Must test against the exact Bun version used before Phase 4 begins. If still broken, fall back to shelling out to system `tesseract` binary (same pattern as FFmpeg).
- **@openrouter/sdk breaking changes**: SDK is in beta. Research notes say to pin to exact semver. Before Phase 3, review the changelog between the pinned version and latest to understand the migration surface.
- **Binary size budget**: Estimated at 60-80 MB. If tesseract.js WASM adds significantly to this, evaluate whether to defer it to a separate "heavy" binary variant or gate it behind a feature flag.
- **GitHub API rate limiting at 60 req/hour unauthenticated**: Phase 3 should implement `GITHUB_TOKEN` env var support from the start, not as an afterthought.
- **Playwright browser-mode fallback**: Research defers this to v1.x but the SPA scraping pitfall is a silent failure. Phase 2 should implement the content-length heuristic and print a clear "page appears to be JavaScript-rendered — rerun with --browser" message even before Playwright is wired up.

## Sources

### Primary (HIGH confidence)
- [Bun single-file executables docs](https://bun.com/docs/bundler/executables) — binary compilation, cross-platform targets, known limitations
- [Bun.spawn API reference](https://bun.sh/reference/bun/Subprocess) — subprocess API, stdio modes
- [unjs/unpdf GitHub](https://github.com/unjs/unpdf) — PDF extraction library
- [OpenRouter TypeScript SDK docs](https://openrouter.ai/docs/sdks/typescript) — official SDK, beta status
- [CLIG guide](https://clig.dev/) — CLI design best practices
- Bun GitHub Issues: #4670 (extra stdio), #7984 (tesseract.js), #11732 (dynamic imports), #14292 (ARM64 musl), #15374 (native binary embedding) — specific pitfall verification

### Secondary (MEDIUM confidence)
- [Bun 1.3 blog post](https://bun.com/blog/bun-v1.3) — version features, worker_threads improvements
- [Modal.com: Whisper variants comparison](https://modal.com/blog/choosing-whisper-variants) — ASR library selection
- [Modal.com: OCR models compared](https://modal.com/blog/8-top-open-source-ocr-models-compared) — OCR approach validation
- [Repomix GitHub (20k stars)](https://github.com/yamadashy/repomix) — demand validation for GitHub summarization
- [Simon Willison's llm CLI](https://github.com/simonw/llm) — competitor feature baseline

### Tertiary (LOW confidence)
- Community reports: binary size ~57 MB for hello world, worker file limitation behavior
- DEV Community posts on FFmpeg subprocess patterns and PDF library conflicts — corroborating evidence only

---
*Research completed: 2026-03-22*
*Ready for roadmap: yes*
