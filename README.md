# bun-extract

A single-binary CLI tool that auto-routes input to the right handler — give it a URL, file, or video and it figures out what to do.

## Install

Download from [Releases](https://github.com/eleven-day/bun-extract/releases):

| Platform | File |
|----------|------|
| macOS ARM64 | `bun-kit` |
| Linux x64 | `bun-kit-linux-x64` |
| Windows x64 | `bun-kit-win-x64.exe` |

```bash
chmod +x bun-kit
./bun-kit --help
```

Or build from source:

```bash
bun install
bun run build        # macOS ARM64
bun run build:linux  # Linux x64
bun run build:windows # Windows x64
```

## Usage

```bash
# Web scraping (Playwright)
bun-kit https://example.com

# File parsing (PDF, DOCX, XLSX, 91+ formats)
bun-kit document.pdf

# OCR (local tesseract.js or cloud vision)
bun-kit screenshot.png

# Audio transcription (local whisper.cpp or cloud Whisper API)
bun-kit recording.wav

# Video processing (FFmpeg + transcription)
bun-kit video.mp4

# GitHub repo summary
bun-kit https://github.com/owner/repo

# Structured JSON output
bun-kit input --json

# Write to file
bun-kit input --output result.txt

# Specify LLM model
bun-kit https://github.com/owner/repo --model anthropic/claude-3-haiku
```

## How It Works

```
input → detect type → route to handler → output

URL (github.com)  →  GitHub handler  →  README + tree + LLM summary
URL (other)       →  Web handler     →  Playwright page text
File (.pdf/.docx) →  File handler    →  kreuzberg text extraction
File (.png/.jpg)  →  Image handler   →  OCR (tesseract / cloud vision)
File (.mp3/.wav)  →  Audio handler   →  ASR (whisper.cpp / Whisper API)
File (.mp4/.mkv)  →  Video handler   →  FFmpeg + ASR transcription
Other             →  Echo handler    →  passthrough
```

## Configuration

Config file: `~/.config/bun-kit/config.json`

```json
{
  "openrouter_api_key": "sk-or-...",
  "openai_api_key": "sk-...",
  "default_model": "anthropic/claude-3-haiku",
  "ocr_language": "eng",
  "whisper_model": "base"
}
```

All fields are optional. Environment variables override config file:

| Env Var | Overrides |
|---------|-----------|
| `OPENROUTER_API_KEY` | `openrouter_api_key` |
| `OPENAI_API_KEY` | `openai_api_key` |
| `BUN_KIT_MODEL` | `default_model` |
| `BUN_KIT_OCR_LANGUAGE` | `ocr_language` |
| `BUN_KIT_WHISPER_MODEL` | `whisper_model` |

## Optional Dependencies

The tool works progressively — features activate based on what's installed:

| Tool | Purpose | Install |
|------|---------|---------|
| [FFmpeg](https://ffmpeg.org/) | Video/audio processing | `brew install ffmpeg` |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Local speech transcription | `brew install whisper-cpp` |
| [Playwright](https://playwright.dev/) | Web scraping | `bun add playwright && npx playwright install chromium` |

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) 1.3+ (single-binary compilation)
- **CLI**: [Commander.js](https://github.com/tj/commander.js)
- **Validation**: [Zod](https://zod.dev/)
- **File Parsing**: [@kreuzberg/wasm](https://kreuzberg.dev/) (91+ formats, Rust/WASM)
- **OCR**: [tesseract.js](https://github.com/naptha/tesseract.js) (Google Tesseract, WASM)
- **ASR**: [whisper.cpp](https://github.com/ggml-org/whisper.cpp) (OpenAI Whisper, C++)
- **LLM**: [@openrouter/sdk](https://openrouter.ai/) (300+ models)
- **Web**: [Playwright](https://playwright.dev/) (Chromium)

## License

MIT
