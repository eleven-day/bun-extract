# Pitfalls Research

**Domain:** Bun CLI automation toolkit — single-binary, multi-handler, subprocess-heavy
**Researched:** 2026-03-22
**Confidence:** HIGH (critical pitfalls), MEDIUM (integration gotchas)

---

## Critical Pitfalls

### Pitfall 1: Native .node Addons Break the Single-Binary Goal

**What goes wrong:**
Libraries that rely on native C++ addons (`.node` files) — such as `node-tesseract-ocr`, `whisper-node`, `sharp`, `canvas` — cannot be fully embedded into a `bun build --compile` binary. The compiled executable attempts to load the native addon from a filesystem path that does not exist on the target machine, producing "Cannot find module" or `dlopen` failures at runtime.

**Why it happens:**
`bun build --compile` can embed `.node` files as assets, but the binary extraction path (`$bunfs/...`) must be known and the addon must be explicitly included via the `--include` flag. Most npm wrapper packages for native tools do not expose this cleanly. Developers assume "compiles cleanly" means "works as a single binary," but the bundle succeeds while the runtime fails.

**How to avoid:**
- Audit every dependency for `.node` files before committing to it: `find node_modules -name "*.node"`.
- For OCR: prefer `tesseract.js` (pure WASM/JS) over `node-tesseract-ocr` (native wrapper). Alternatively, shell out to the system `tesseract` binary via `Bun.spawn`, same as FFmpeg.
- For ASR: prefer shelling out to `whisper-cli` or `whisper.cpp` binary rather than using Node.js native bindings.
- Treat the single-binary constraint as a first-class requirement: validate every new dependency against it.

**Warning signs:**
- `npm install` downloads prebuilt `.node` binaries for your platform.
- `node_modules/some-package/build/Release/*.node` files appear after install.
- Package README mentions "requires libXXX installed" or "prebuilt binaries."

**Phase to address:** Foundation phase (project scaffolding) — establish a "no native bindings" policy before implementing any handler.

---

### Pitfall 2: Dynamic Imports Not Bundled Into the Executable

**What goes wrong:**
`bun build --compile` only bundles statically analyzable imports. Any `import(variable)`, `require(variable)`, or conditional dynamic import that uses a runtime expression is silently excluded from the bundle. The binary works in development (`bun run`) but crashes at runtime on end-user machines with "Cannot find package" errors.

**Why it happens:**
Developers test with `bun run ./index.ts` (which has access to `node_modules`) and never test the compiled binary before shipping. Many plugin-style libraries (e.g., `unified`, `remark`, `@pdf-lib`) use dynamic imports internally.

**How to avoid:**
- Always test the compiled binary in an isolated directory with no `node_modules` present before marking a feature complete.
- Add a CI/CD check: `bun build --compile ./src/index.ts --outfile ./dist/bun-kit && ./dist/bun-kit --version` in a clean environment.
- If a library uses dynamic imports, trace whether those code paths are exercised and consider replacing with static equivalents.

**Warning signs:**
- Library source code contains `import(...)` with template literals or variables.
- Works with `bun run` but fails with the compiled binary on a path it had never seen.
- Error message: "Failed to load bundled module" or "Cannot find package 'X'".

**Phase to address:** First handler phase — build and test as compiled binary from day one, not as a last step.

---

### Pitfall 3: FFmpeg Subprocess Hanging Due to Unread Stderr/Stdout

**What goes wrong:**
When FFmpeg writes more output to stderr or stdout than the OS pipe buffer can hold (~64 KB on Linux, ~16 KB on macOS) and the consuming code never reads it, the process deadlocks: FFmpeg blocks waiting for the buffer to drain, and the parent process blocks waiting for FFmpeg to exit. The tool appears to hang indefinitely on large video files.

**Why it happens:**
Code like `await proc.exited` without concurrently consuming `proc.stderr` fills the pipe buffer. FFmpeg in particular writes verbose progress output to stderr by default, which is large for long videos.

**How to avoid:**
- Always consume `stderr` concurrently with waiting for process exit. Use `proc.stderr.pipeTo(Writable.toWeb(process.stderr))` or drain it in a separate async task.
- Pass `-loglevel error` or `-nostats` to FFmpeg when verbose output is not needed.
- Use `Bun.spawn` with `stderr: "pipe"` and explicitly read it, or `stderr: "inherit"` to forward directly to the terminal.

**Warning signs:**
- Tool hangs on video files longer than ~5 minutes or larger than ~500 MB.
- FFmpeg PID remains alive but CPU usage is 0%.
- Works on short test files but hangs on real-world inputs.

**Phase to address:** Video processing phase — any phase that introduces FFmpeg subprocesses.

---

### Pitfall 4: Bun.spawn Extra stdio Streams Not Implemented

**What goes wrong:**
Bun does not implement extra file descriptors beyond stdin/stdout/stderr for child processes (issue #4670). FFmpeg advanced piping patterns that use `pipe:3`, `pipe:4`, etc. for multiple input/output streams fail silently or throw errors. Code that works in Node.js via `child_process.spawn` with custom `stdio` arrays will not work in Bun.

**Why it happens:**
The Node.js `child_process.spawn` API supports arbitrary `stdio` array configurations, but Bun's implementation only supports the first three. This is a known but long-standing gap.

**How to avoid:**
- Avoid multi-pipe FFmpeg patterns. Use intermediate temporary files instead of pipe-based multi-pass workflows.
- For frame extraction: write frames to a temp directory, process them, then clean up — do not try to pipe frames directly between FFmpeg invocations.
- Use `-f pipe:1` (stdout) for single output streams only.

**Warning signs:**
- FFmpeg command uses `pipe:3` or higher.
- Code passes `stdio: ['pipe', 'pipe', 'pipe', 'pipe']` to spawn.
- The feature works in Node.js but not Bun.

**Phase to address:** Video processing phase — design FFmpeg pipelines around file-based intermediate steps, not multi-pipe streams.

---

### Pitfall 5: Web Scraping Fails on JavaScript-Rendered Pages

**What goes wrong:**
`fetch` + `cheerio` only sees the server-rendered HTML. For pages that load content via JavaScript (React SPAs, lazy-loaded tables, infinite scroll), the scraper extracts empty or incomplete data. The tool appears to work on simple pages but silently returns garbage on modern SPAs.

**Why it happens:**
Developers test on Wikipedia-style pages (static HTML) but real targets often use client-side rendering. There is no error — cheerio parses the HTML shell and returns empty selectors.

**How to avoid:**
- Detect JavaScript-heavy pages: if extracted text is under a threshold or the body only contains `<div id="root"></div>`, fall back to a headless browser.
- Use Playwright as the fallback layer — it works with Bun but is a large dependency and cannot be embedded in the single binary (it requires Chromium externally).
- Design the URL handler with two modes: `fetch` mode (fast, default) and `browser` mode (opt-in via `--browser` flag or auto-detected).
- Accept that browser-mode scraping cannot be a zero-dependency experience.

**Warning signs:**
- Extracted text is very short or empty despite a visually rich page.
- Page HTML contains `<script>` tags loading JavaScript frameworks.
- Body tag has a single empty root div.

**Phase to address:** Web scraping phase — implement fetch mode first, add browser fallback as a separate sub-feature.

---

### Pitfall 6: Config/API Key Path Resolution Differs Between Dev and Compiled Binary

**What goes wrong:**
Code using `new URL('../config.json', import.meta.url)` or `path.resolve(__dirname, '../config.json')` works during development because `__dirname` resolves relative to the source file. In a compiled binary, `import.meta.dir` resolves to a virtual `$bunfs/root/...` path, not the directory where the binary is located. API key config files are not found at runtime.

**Why it happens:**
`bun build --compile` changes the resolution semantics of `import.meta.dir` and `__dirname`. Users place their config file next to the binary on disk, but the code looks inside the virtual bundled filesystem, not on the real filesystem.

**How to avoid:**
- For user-editable config (API keys), always resolve relative to `process.execPath` (the binary location) or a well-known XDG config path (`~/.config/bun-kit/config.json`).
- Never embed user config in the binary — it is read-only. Use `Bun.env` for environment variable overrides and a config file at `~/.config/bun-kit/` as the canonical location.
- Document the config file path clearly in `--help` output.

**Warning signs:**
- Config file found in development, "file not found" in compiled binary.
- `import.meta.dir` or `__dirname` used to resolve user-facing config paths.

**Phase to address:** Foundation phase — establish config file resolution conventions before any handler needs API keys.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip compiled binary testing during handler development | Faster iteration, test with `bun run` | Dynamic import / native addon failures surface late, expensive to refactor | Never — compile and test binary at end of every feature |
| Use node-tesseract-ocr native wrapper | Easier OCR API | Breaks single-binary goal, requires system tesseract anyway | Never for this project |
| Hardcode FFmpeg path as `ffmpeg` | Simple | Fails on systems where ffmpeg is not on PATH | Acceptable only if `--ffmpeg-path` override flag is also provided |
| Swallow subprocess stderr | Cleaner output | Silent failures, impossible to debug video processing errors | Never — always log stderr at `--verbose` level |
| Single `fetch()` for all URLs with no fallback | Simple implementation | SPAs, paywalled sites, and rate-limited domains silently fail | Acceptable for MVP if documented as a limitation |
| Inline API keys in config for quick testing | Fast setup | Accidental credential exposure in logs, process.env leaks to child processes | Never in committed code |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenRouter streaming | Not handling errors that occur after streaming has begun (they arrive as SSE error events, not HTTP error status codes) | Parse SSE events for `error` type; do not assume successful HTTP 200 means the full response succeeded |
| OpenRouter free-tier models | Assuming free models work reliably for automation | Free models have 50 req/day without credits; use paid credits or implement graceful "quota exhausted" messaging |
| FFmpeg on macOS | Assuming Homebrew FFmpeg path (`/opt/homebrew/bin/ffmpeg`) is always on PATH | Use `which ffmpeg` / `Bun.which("ffmpeg")` at startup; fail fast with a clear "FFmpeg not found" message |
| Tesseract local mode | Assuming tesseract language packs are installed | Check with `tesseract --list-langs` at startup; document required language pack installation |
| OpenRouter model IDs | Using `gpt-4` instead of `openai/gpt-4` | OpenRouter requires `provider/model` format; model IDs change over time — make the model configurable |
| GitHub API for repo summary | Unauthenticated GitHub API is rate-limited to 60 req/hour | Use authenticated requests with a `GITHUB_TOKEN` env var; unauthenticated is fine for occasional use but fails in automated/CI contexts |
| PDF parsing large files | Loading entire PDF into memory with `pdf-parse` | Stream pages when possible; set a `--max-pages` limit for very large PDFs; large scanned PDFs (image-only) return empty text |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Downloading entire video before processing | Memory exhaustion, long wait before any output | Use FFmpeg to process via URL directly (`ffmpeg -i https://...`) or pipe from partial download | Videos > 500 MB |
| Loading full PDF into memory | OOM crash on large scanned PDFs | Process page-by-page; warn and limit on files > 50 MB | PDFs > 100 MB |
| Sequential FFmpeg calls for multi-step video processing | Total processing time multiplies | Combine steps in a single FFmpeg pass when possible (e.g., extract audio + resize in one call) | Any video > 10 min |
| Calling OpenRouter with no timeout | Tool hangs indefinitely on API failures | Set explicit `AbortSignal` with timeout (30s for normal, 120s for long completions) | On any network degradation |
| Re-routing every call through auto-detect logic | Negligible for users, but adds complexity bugs | Keep routing logic stateless and fast; don't add network calls to the detection step | At initial request |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API keys in `~/.bun-kit/config.json` with 644 permissions | Other local users can read credentials | Set config file permissions to 600 on creation: `fs.chmodSync(configPath, 0o600)` |
| Passing API keys as CLI arguments | Keys appear in shell history and `ps aux` output | Accept keys only from config file or environment variables, never from `--api-key` argument |
| Forwarding full environment to spawned subprocesses | API keys in env bleed into FFmpeg/tesseract processes unnecessarily | Spawn subprocesses with a minimal env: `{ PATH: process.env.PATH }` only |
| Not sanitizing file paths passed to FFmpeg | Path traversal if the tool is ever used in a pipeline with untrusted input | Validate that input paths resolve within expected directories; reject `..` patterns |
| Logging full HTTP responses in verbose mode | API keys, tokens, or PII in responses logged to disk | Redact `Authorization` headers and response fields that may contain keys before logging |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent success with no output for empty results | User doesn't know if tool worked or input produced nothing | Print a clear message: "No text extracted — file may be image-only or empty" |
| No progress indicator for long operations (video, large PDF) | User assumes tool is hung, kills it | Print FFmpeg progress to stderr or show a spinner on terminal; use `--quiet` to suppress |
| Ambiguous routing: local path that looks like a URL | Tool routes to wrong handler silently | Validate routing decision explicitly; when ambiguous, prefer explicit `--type` flag and document behavior |
| Crashing with a stack trace on missing FFmpeg | Scary output for non-developer users | Catch at startup, print: "FFmpeg not found. Install with: brew install ffmpeg" |
| No `--dry-run` for destructive operations (format conversion) | User accidentally overwrites source file | Default output to stdout or a new file; require explicit `--overwrite` for in-place operations |

---

## "Looks Done But Isn't" Checklist

- [ ] **Single binary**: Test the compiled binary in a clean directory with NO `node_modules` present — not just with `bun run`.
- [ ] **FFmpeg handler**: Test with a video > 1 GB and duration > 30 minutes — not just a 10-second sample clip.
- [ ] **OCR handler**: Test with a multi-page scanned PDF (image-only pages) — not just a clean digital PDF.
- [ ] **Web scraping**: Test with a React SPA (e.g., a Vercel-deployed app) — not just static sites.
- [ ] **Config loading**: Copy the compiled binary to `/tmp` and run it there — config file resolution must still work.
- [ ] **OpenRouter**: Simulate a 429 response and an error mid-stream — error handling must not hang or print a stack trace.
- [ ] **Cross-platform**: Test the compiled Linux binary on a clean Linux VM with only system packages — no Bun, no Node.js installed.
- [ ] **Large file PDF**: Test a 100-page scanned PDF — must not OOM, must return meaningful output or a clear limitation message.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Native addon breaks single-binary | HIGH | Rewrite the handler to shell out to system binary (same as FFmpeg approach); may require API redesign |
| Dynamic imports not bundled | MEDIUM | Identify the missing modules via runtime error, add explicit static imports or `--include` flags, re-compile and re-test |
| FFmpeg hanging on large files | LOW | Add `stderr: "pipe"` + async drain to all spawn calls; is a targeted code change |
| Config path resolution wrong in binary | MEDIUM | Refactor config loader to use `process.execPath`-relative paths; affects any handler that already reads config |
| Web scraping returning empty results | LOW | Add the `--browser` Playwright fallback flag; existing fetch path unchanged |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Native addons break single-binary | Phase 1 (Foundation) | `find node_modules -name "*.node"` returns empty; compiled binary runs in clean dir |
| Dynamic imports not bundled | Phase 1 (Foundation) | CI builds and runs compiled binary with `--version` from clean dir |
| FFmpeg subprocess hanging | Phase: Video processing | Tests with 1GB video file pass without hanging; stderr always consumed |
| Bun extra stdio not implemented | Phase: Video processing | All FFmpeg pipelines use file intermediates, not pipe:3+ |
| Web scraping SPA failure | Phase: Web scraping | Tests against a known SPA; fallback mode documented or implemented |
| Config path resolution | Phase 1 (Foundation) | Config loading test runs with binary copied to /tmp |
| OpenRouter error mid-stream | Phase: LLM integration | Test fixture simulates 429 and mid-stream error; no hangs, no stack traces |
| API key security | Phase 1 (Foundation) | Config file created with 0o600; no `--api-key` CLI argument exists |

---

## Sources

- [Bun single-file executable docs — known limitations](https://bun.com/docs/bundler/executables)
- [bun build does not embed binaries from node_modules correctly — GitHub Issue #15374](https://github.com/oven-sh/bun/issues/15374)
- [bun build --compile: include non-statically analyzable dynamic imports — GitHub Issue #11732](https://github.com/oven-sh/bun/issues/11732)
- [spawn in Bun fails to handle FFmpeg custom pipes (pipe:3) — GitHub Issue #17989](https://github.com/oven-sh/bun/issues/17989)
- [Child process extra stdio streams not implemented — GitHub Issue #4670](https://github.com/oven-sh/bun/issues/4670)
- [Bun.spawn stops reading stdout/stderr after first chunk — GitHub Issue #1320](https://github.com/oven-sh/bun/issues/1320)
- [Bun Node.js compatibility](https://bun.com/docs/runtime/nodejs-compat)
- [OpenRouter API error handling documentation](https://openrouter.ai/docs/api/reference/errors-and-debugging)
- [OpenRouter streaming documentation](https://openrouter.ai/docs/api/reference/streaming)
- [Bun --compile ARM64 Linux musl issue — GitHub Issue #14292](https://github.com/oven-sh/bun/issues/14292)
- [When two npm packages fight over pdfjs-dist — DEV Community](https://dev.to/agent_paaru/when-two-npm-packages-fight-over-pdfjs-dist-drop-to-system-binaries-145a)
- [10 web scraping challenges in 2025 — DEV Community](https://dev.to/apify/10-web-scraping-challenges-solutions-in-2025-5bhd)

---

*Pitfalls research for: Bun CLI automation toolkit (single-binary, multi-handler)*
*Researched: 2026-03-22*
