# Test Fixtures

Test input files for bun-kit CLI routing and handler validation.
All fixtures are AI-generated or programmatically created — no manual sourcing needed.

## Directory Structure

```
fixtures/
├── generate.ts           # Main entry point
├── generators/
│   ├── utils.ts          # Shared helpers, prerequisite checks
│   ├── urls.ts           # Fetch + validate real URLs, save HTML snapshots
│   ├── docs.ts           # Markdown → PDF/DOCX via pandoc
│   ├── media.ts          # Gemini API (image/TTS/video) + FFmpeg
│   └── edge-cases.ts     # Synthetic boundary/error files
├── urls.txt              # Curated test URLs with type annotations
├── web/                  # HTML snapshots for offline testing
├── docs/                 # PDF, DOCX, CSV, TXT (from Markdown via pandoc)
├── images/               # AI-generated images for OCR testing
├── media/                # AI-generated audio/video + FFmpeg synthetics
└── edge-cases/           # Empty files, corrupt files, unsupported formats
```

## Quick Start

```bash
# Install dependencies (from project root)
npm install

# Generate all fixtures
npm run generate-fixtures

# With AI media generation (images, TTS audio, video)
GEMINI_API_KEY=your-key npm run generate-fixtures
```

## Prerequisites

| Tool | Required? | Purpose | Install |
|------|-----------|---------|---------|
| Node.js / Bun | Yes | Runtime | — |
| pandoc | Optional | MD → PDF/DOCX conversion | `brew install pandoc` |
| PDF engine | Optional | PDF generation | `brew install weasyprint` or `brew install --cask mactex-no-gui` |
| ffmpeg | Optional | Audio/video processing | `brew install ffmpeg` |
| GEMINI_API_KEY | Optional | AI image/audio/video generation | [Google AI Studio](https://aistudio.google.com/) |

The generator works progressively — it produces what it can with available tools
and skips the rest with clear messages about what's missing.

## What Gets Generated

### Without any optional tools
- `urls.txt` — curated test URLs
- `web/*.html` — fetched HTML snapshots
- `docs/article.md`, `docs/report.md` — Markdown source content
- `docs/test-cases.csv`, `docs/sample.txt` — text/CSV
- `edge-cases/*` — synthetic boundary files

### With pandoc
- `docs/article.docx`, `docs/report.docx` — Word documents
- `docs/article.pdf`, `docs/report.pdf` — PDF documents (needs PDF engine)

### With ffmpeg (no API key)
- `media/synthetic-video.mp4` — test pattern video with tone
- `media/synthetic-audio.wav/mp3` — sine wave audio
- `media/silent-video.mp4` — video without audio track

### With GEMINI_API_KEY + ffmpeg
- `images/screenshot-text.png` — terminal screenshot (OCR test)
- `images/document-photo.jpg` — printed document photo (OCR test)
- `images/handwritten-note.jpg` — handwriting (OCR test)
- `media/speech-en.wav` — English TTS
- `media/speech-zh.wav` — Chinese TTS
- `media/podcast-sample.wav` — podcast-style speech
- `media/short-clip.mp4` — AI-generated video (Veo)
- `media/silent-clip.mp4` — AI video with audio stripped
