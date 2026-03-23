# Roadmap: bun-kit

## Overview

Six phases build bun-kit from a validated binary scaffold to a fully distributed multi-modal CLI tool. Phase 1 locks in the single-binary constraint and infrastructure that every subsequent handler depends on. Phases 2-5 add handlers in order of increasing complexity and dependency depth — web/file first (no external processes), then LLM (pure HTTP), then OCR/ASR (WASM + subprocesses), then video (composes FFmpeg and ASR together). Phase 6 completes cross-platform distribution once all handlers are stable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - CLI scaffold, config, output formatting, and single-binary validation
- [ ] **Phase 2: Web and File Handlers** - Auto-routing engine with web scraping and PDF/file parsing
- [ ] **Phase 3: LLM and GitHub** - OpenRouter integration and GitHub repo summarization
- [ ] **Phase 4: OCR and ASR** - Image text extraction and audio transcription, cloud and local paths
- [ ] **Phase 5: Video Pipeline** - FFmpeg-based video processing, metadata, and transcription
- [ ] **Phase 6: Distribution** - Multi-platform binary compilation and release artifacts

## Phase Details

### Phase 1: Foundation
**Goal**: The project compiles to a working single binary that users can run from a clean directory with zero dependencies
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-04, CORE-05, CORE-06, CORE-07, CORE-08, DIST-04
**Success Criteria** (what must be TRUE):
  1. User can run `bun-kit --help` and `bun-kit --version` from a directory with no node_modules present
  2. User can set API keys in `~/.config/bun-kit/config.json` or environment variables and the tool reads them correctly
  3. User running `bun-kit someInput --json` receives a structured `{ input, type, text, metadata }` envelope on stdout; errors appear on stderr
  4. User running `bun-kit someInput --output result.txt` finds output written to that file with nothing on stdout
  5. Non-zero exit codes (1/2/3) are returned for input error, auth error, and network error respectively
**Plans**: TBD

### Phase 2: Web and File Handlers
**Goal**: Users can pass any HTTP URL or local file path and get extracted text without any manual setup
**Depends on**: Phase 1
**Requirements**: CORE-02, CORE-03, WEB-01, WEB-02, WEB-03, FILE-01, FILE-02, FILE-03, FILE-04
**Success Criteria** (what must be TRUE):
  1. User can run `bun-kit https://example.com` and receive extracted article text on stdout
  2. User can run `bun-kit document.pdf` and receive the PDF's text content
  3. User can run `bun-kit notes.txt` or `bun-kit README.md` and receive the file contents passed through
  4. Passing an unreachable URL or unsupported file type produces a clear error message on stderr and a non-zero exit code
  5. Adding a new input handler requires only registering it in the handler registry — no changes to router logic
**Plans**: TBD

### Phase 3: LLM and GitHub
**Goal**: Users can get an LLM-generated summary of any GitHub repo or web page with a single command
**Depends on**: Phase 2
**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04, GH-01, GH-02, GH-03, GH-04
**Success Criteria** (what must be TRUE):
  1. User can run `bun-kit https://github.com/owner/repo` and receive a coherent project summary without a GitHub token
  2. User can pass `--model claude-3-haiku` (or any OpenRouter model slug) and the tool uses that model
  3. User with no API key configured sees a clear error message explaining how to configure one, not a raw HTTP 401
  4. Rate limit and API errors produce actionable error messages on stderr, not stack traces
**Plans**: TBD

### Phase 4: OCR and ASR
**Goal**: Users can extract text from images and transcribe audio files using either cloud APIs or local tools depending on what is configured
**Depends on**: Phase 3
**Requirements**: OCR-01, OCR-02, OCR-03, OCR-04, ASR-01, ASR-02, ASR-03, ASR-04
**Success Criteria** (what must be TRUE):
  1. User can run `bun-kit photo.png` and receive extracted text (cloud path when API key is configured)
  2. User with no cloud API key can run `bun-kit photo.png` and get text via local Tesseract fallback
  3. User can run `bun-kit recording.mp3` and receive a text transcription (cloud path via Whisper API)
  4. User with no cloud key and whisper.cpp installed can run `bun-kit recording.mp3` and get a local transcription
**Plans**: TBD

### Phase 5: Video Pipeline
**Goal**: Users can pass a video file and get audio transcription, metadata, keyframes, or a converted file using FFmpeg
**Depends on**: Phase 4
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, VID-06, VID-07
**Success Criteria** (what must be TRUE):
  1. User can run `bun-kit video.mp4` and receive a text transcription of the video's audio track
  2. User can run `bun-kit video.mp4 --json` and see metadata (duration, resolution, codec) in the output envelope
  3. Passing a video file when FFmpeg is not installed produces a clear "FFmpeg not found" error, not a crash
  4. Processing a video longer than 5 minutes completes without hanging (FFmpeg stderr drained correctly)
**Plans**: TBD

### Phase 6: Distribution
**Goal**: Anyone on macOS ARM64 or Linux x64 can download and run a single binary with no install steps
**Depends on**: Phase 5
**Requirements**: DIST-01, DIST-02, DIST-03
**Success Criteria** (what must be TRUE):
  1. A user on macOS ARM64 can download the binary, make it executable, and run `bun-kit --version` with no Bun or Node installed
  2. A user on Linux x64 (glibc) can do the same with the Linux build artifact
  3. The binary runs correctly from any directory — not just the directory it was compiled from
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | - |
| 2. Web and File Handlers | 0/? | Not started | - |
| 3. LLM and GitHub | 0/? | Not started | - |
| 4. OCR and ASR | 0/? | Not started | - |
| 5. Video Pipeline | 0/? | Not started | - |
| 6. Distribution | 0/? | Not started | - |
