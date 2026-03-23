# bun-kit

## What This Is

A single-binary CLI automation tool built with Bun that auto-routes input to the right handler — give it a URL, file, or video and it figures out what to do. Replaces scattered Python automation scripts that suffer from environment dependency hell and path portability issues.

## Core Value

Zero-config input routing: give it anything (URL, file, video) and get useful text output — no environment setup, no path fixing, no dependency installing.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Auto-route engine that detects input type (URL, local file by extension, GitHub URL) and dispatches to correct handler
- [ ] Web scraping: fetch and extract content from URLs
- [ ] GitHub repo summary: crawl README + file structure, LLM summarize the project
- [ ] File parsing: extract text from PDF, documents, and common file formats
- [ ] OCR: extract text from images, support both cloud APIs and local models (e.g., Tesseract)
- [ ] ASR: transcribe audio files, support both cloud APIs and local models (e.g., Whisper)
- [ ] Video processing via FFmpeg: extract audio track → ASR transcription
- [ ] Video processing: extract keyframes and subtitle information
- [ ] Video processing: read metadata (duration, resolution, codec)
- [ ] Video processing: format conversion and compression
- [ ] LLM integration via OpenRouter: flexible model switching for summarization tasks
- [ ] Text output to terminal (stdout) or file
- [ ] Single binary compilation via `bun build --compile` for zero-dependency distribution
- [ ] Configuration file for API keys (OpenRouter, cloud OCR/ASR providers)

### Out of Scope

- GUI or web interface — CLI-only, pipe-friendly
- Plugin/extension system — all handlers built-in for v1
- Multi-user / server mode — personal tool, runs locally
- Real-time streaming processing — batch processing only for v1

## Context

- Author currently maintains Python automation scripts for these tasks but hit pain points: virtualenv/pip dependency management, hardcoded paths, difficult to share or migrate between machines
- Bun chosen for: fast startup, built-in TypeScript, `bun build --compile` produces standalone binaries, good ecosystem for web scraping and file I/O
- FFmpeg is an external dependency but universally available and expected for video work
- OpenRouter chosen as LLM gateway for model flexibility without vendor lock-in
- OCR/ASR dual-mode (cloud + local) provides flexibility: cloud for quality, local for offline/privacy

## Constraints

- **Runtime**: Bun (not Node.js) — for single-binary compilation and performance
- **External deps**: FFmpeg required for video features (acceptable — commonly installed)
- **API keys**: OpenRouter and cloud OCR/ASR services need user-provided keys
- **Platform**: macOS primary (author's environment), Linux secondary

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bun over Node.js | Single binary compilation, fast startup, built-in TS | — Pending |
| Auto-route by input type | Eliminates need to remember subcommands, mirrors natural intent | — Pending |
| OpenRouter for LLM | Model-agnostic, single API key for multiple providers | — Pending |
| Built-in handlers over plugins | Simpler distribution, v1 scope control | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-22 after initialization*
