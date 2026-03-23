# Requirements: bun-kit

**Defined:** 2026-03-22
**Core Value:** Zero-config input routing — give it anything and get useful text output, no environment setup needed.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Infrastructure

- [ ] **CORE-01**: CLI entry point with `--help`, `--version` flags via Commander.js
- [ ] **CORE-02**: Auto-routing engine that detects input type (HTTP URL, GitHub URL, local file by extension/MIME, stdin) and dispatches to correct handler
- [ ] **CORE-03**: Handler registry pattern — adding a new handler requires no changes to router code
- [ ] **CORE-04**: Config file support at `~/.config/bun-kit/config.json` (XDG) with env var overrides for API keys
- [ ] **CORE-05**: `--output <path>` flag to write results to file instead of stdout
- [ ] **CORE-06**: `--json` flag for structured output envelope `{ input, type, text, metadata }`
- [ ] **CORE-07**: Meaningful exit codes (0=success, 1=input error, 2=auth error, 3=network error)
- [ ] **CORE-08**: stderr for logs/errors, stdout for data output (Unix pipeline compatible)

### Web Scraping

- [ ] **WEB-01**: User can pass an HTTP/HTTPS URL and get extracted text content
- [ ] **WEB-02**: Static HTML extraction via cheerio (no headless browser dependency)
- [ ] **WEB-03**: Graceful error handling for unreachable URLs, timeouts, and non-HTML responses

### File Parsing

- [ ] **FILE-01**: User can pass a local PDF file path and get extracted text
- [ ] **FILE-02**: PDF extraction via unpdf (pure JS, no native bindings)
- [ ] **FILE-03**: User can pass plain text and markdown files for passthrough/extraction
- [ ] **FILE-04**: Clear error message for unsupported file types

### GitHub Summarization

- [ ] **GH-01**: User can pass a GitHub repo URL and get an LLM-generated project summary
- [ ] **GH-02**: Tool crawls README.md and file/directory structure from GitHub
- [ ] **GH-03**: Crawled content is sent to LLM (via OpenRouter) for summarization
- [ ] **GH-04**: Works without GitHub auth for public repos (with rate limit awareness)

### LLM Integration

- [ ] **LLM-01**: OpenRouter API client for chat completions
- [ ] **LLM-02**: API key configured via config file or `OPENROUTER_API_KEY` env var
- [ ] **LLM-03**: `--model` flag to override default model selection
- [ ] **LLM-04**: Graceful error handling for missing API key, rate limits, and API errors

### OCR

- [ ] **OCR-01**: User can pass an image file (.png, .jpg, .webp) and get extracted text
- [ ] **OCR-02**: Cloud OCR path via LLM vision API (OpenRouter multimodal)
- [ ] **OCR-03**: Local OCR path via Tesseract subprocess (no native bindings)
- [ ] **OCR-04**: Auto-select cloud or local based on config availability (cloud preferred, local fallback)

### ASR

- [ ] **ASR-01**: User can pass an audio file (.mp3, .wav, .m4a) and get transcribed text
- [ ] **ASR-02**: Cloud ASR path via OpenAI Whisper API
- [ ] **ASR-03**: Local ASR path via whisper.cpp subprocess
- [ ] **ASR-04**: Auto-select cloud or local based on config availability

### Video Processing

- [ ] **VID-01**: User can pass a video file (.mp4, .mkv, .mov) and get audio transcription
- [ ] **VID-02**: Extract audio track from video via FFmpeg subprocess
- [ ] **VID-03**: Extract video metadata (duration, resolution, codec) via ffprobe
- [ ] **VID-04**: Extract keyframes from video via FFmpeg
- [ ] **VID-05**: Extract subtitle streams from video via FFmpeg
- [ ] **VID-06**: Video format conversion and compression via FFmpeg
- [ ] **VID-07**: Graceful error when FFmpeg is not installed

### Distribution

- [ ] **DIST-01**: `bun build --compile` produces working single binary for macOS ARM64
- [ ] **DIST-02**: Cross-compile target for Linux x64
- [ ] **DIST-03**: Compiled binary works from clean directory (no node_modules needed)
- [ ] **DIST-04**: No native `.node` addons in dependency tree (enforced policy)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Scraping

- **WEB-10**: SPA/JavaScript-rendered page scraping via Playwright
- **WEB-11**: Batch URL processing from file list

### Enhanced Media

- **OCR-10**: VLM-based OCR (DeepSeek-OCR) for higher accuracy
- **ASR-10**: Streaming/real-time ASR

### Productivity

- **PROD-01**: `--watch` mode for file processing
- **PROD-02**: Run history / SQLite logging
- **PROD-03**: Windows x64 binary

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Plugin/extension system | Breaks single-binary guarantee; v1 ships all handlers built-in |
| GUI or web interface | Contradicts CLI-first, pipe-friendly core value |
| Interactive TUI/prompts | Breaks piping; conflicts with `--json` mode |
| Multi-user/server mode | Different product entirely; personal tool by design |
| Auto-update mechanism | Complexity vs value; distribute via GitHub Releases |
| Database/history | Adds SQLite dependency; use shell redirection for now |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 2 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 1 | Pending |
| CORE-06 | Phase 1 | Pending |
| CORE-07 | Phase 1 | Pending |
| CORE-08 | Phase 1 | Pending |
| WEB-01 | Phase 2 | Pending |
| WEB-02 | Phase 2 | Pending |
| WEB-03 | Phase 2 | Pending |
| FILE-01 | Phase 2 | Pending |
| FILE-02 | Phase 2 | Pending |
| FILE-03 | Phase 2 | Pending |
| FILE-04 | Phase 2 | Pending |
| GH-01 | Phase 3 | Pending |
| GH-02 | Phase 3 | Pending |
| GH-03 | Phase 3 | Pending |
| GH-04 | Phase 3 | Pending |
| LLM-01 | Phase 3 | Pending |
| LLM-02 | Phase 3 | Pending |
| LLM-03 | Phase 3 | Pending |
| LLM-04 | Phase 3 | Pending |
| OCR-01 | Phase 4 | Pending |
| OCR-02 | Phase 4 | Pending |
| OCR-03 | Phase 4 | Pending |
| OCR-04 | Phase 4 | Pending |
| ASR-01 | Phase 4 | Pending |
| ASR-02 | Phase 4 | Pending |
| ASR-03 | Phase 4 | Pending |
| ASR-04 | Phase 4 | Pending |
| VID-01 | Phase 5 | Pending |
| VID-02 | Phase 5 | Pending |
| VID-03 | Phase 5 | Pending |
| VID-04 | Phase 5 | Pending |
| VID-05 | Phase 5 | Pending |
| VID-06 | Phase 5 | Pending |
| VID-07 | Phase 5 | Pending |
| DIST-01 | Phase 6 | Pending |
| DIST-02 | Phase 6 | Pending |
| DIST-03 | Phase 6 | Pending |
| DIST-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after roadmap creation*
