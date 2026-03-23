# Architecture Research

**Domain:** CLI automation toolkit (single-binary, multi-modal input routing)
**Researched:** 2026-03-22
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Entry Layer                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  cli.ts (shebang entry) — arg parse → input router      │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                        Routing Layer                             │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  InputRouter — detects type (URL/file/video) and       │     │
│  │  dispatches to registered handler in HandlerRegistry   │     │
│  └────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│                        Handler Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Web     │ │  File    │ │  Video   │ │  GitHub          │   │
│  │ Scraper  │ │ Parser   │ │ Processor│ │  Summarizer      │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
├───────┴────────────┴────────────┴────────────────┴─────────────┤
│                        Service Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  OCR     │ │  ASR     │ │  LLM     │ │  FFmpeg          │   │
│  │ Engine   │ │ Engine   │ │ Client   │ │  Wrapper         │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        Infrastructure Layer                      │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  Config Manager  │  │  Output Formatter│                     │
│  │  (API keys/prefs)│  │  (stdout/file)   │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `cli.ts` | Parse raw args, load config, call router, print output | InputRouter, ConfigManager, OutputFormatter |
| `InputRouter` | Detect input type (URL, file extension, GitHub URL pattern) and dispatch to the correct handler | HandlerRegistry |
| `HandlerRegistry` | Map of input type keys to handler instances; lookup and invoke | All handlers |
| `WebScraper` | Fetch URL, extract readable text content | LLMClient (optional summarize) |
| `GitHubSummarizer` | Crawl README + file tree from GitHub URL, LLM summarize | WebScraper (fetch), LLMClient |
| `FileParser` | Extract text from PDF, DOCX, TXT, and other document formats | — |
| `VideoProcessor` | FFmpeg subprocess orchestration: metadata, keyframes, audio extraction, format conversion | FFmpegWrapper, ASREngine |
| `OCREngine` | Image-to-text; routes to cloud API or local Tesseract based on config | ConfigManager |
| `ASREngine` | Audio-to-text; routes to cloud API or local Whisper based on config | ConfigManager |
| `LLMClient` | OpenRouter HTTP client for summarization requests | ConfigManager |
| `FFmpegWrapper` | Spawn `Bun.spawn` subprocess, build argument arrays, stream stderr for progress | — |
| `ConfigManager` | Load `~/.bun-kit/config.json` or `$BUN_KIT_CONFIG`; expose typed config object | — |
| `OutputFormatter` | Write to stdout or `--output` file path; handle plain text vs JSON mode | — |

## Recommended Project Structure

```
src/
├── cli.ts                  # Shebang entry: arg parse, config load, router invocation
├── router/
│   ├── InputRouter.ts      # Type detection logic (URL, extension, GitHub pattern)
│   └── HandlerRegistry.ts  # Map<string, Handler>, register/lookup
├── handlers/
│   ├── types.ts            # Handler interface: handle(input, options) → string
│   ├── WebHandler.ts       # URL scraping
│   ├── GitHubHandler.ts    # GitHub repo summarization
│   ├── FileHandler.ts      # Document parsing (delegates to parsers/)
│   ├── ImageHandler.ts     # OCR dispatch
│   ├── AudioHandler.ts     # ASR dispatch
│   └── VideoHandler.ts     # FFmpeg pipeline orchestration
├── services/
│   ├── ocr/
│   │   ├── OCREngine.ts    # Interface + factory (cloud vs local)
│   │   ├── CloudOCR.ts     # Cloud API implementation
│   │   └── TesseractOCR.ts # Local Tesseract implementation
│   ├── asr/
│   │   ├── ASREngine.ts    # Interface + factory (cloud vs local)
│   │   ├── CloudASR.ts     # Cloud API implementation
│   │   └── WhisperASR.ts   # Local Whisper implementation
│   ├── llm/
│   │   └── OpenRouterClient.ts  # OpenRouter HTTP client
│   └── ffmpeg/
│       └── FFmpegWrapper.ts     # Bun.spawn subprocess builder
├── parsers/
│   ├── PdfParser.ts        # PDF text extraction
│   ├── DocxParser.ts       # DOCX text extraction
│   └── PlainTextParser.ts  # TXT, MD, CSV, etc.
├── config/
│   ├── ConfigManager.ts    # Load, validate, expose typed config
│   └── types.ts            # Config schema types
└── output/
    └── OutputFormatter.ts  # stdout vs file, plain vs JSON
```

### Structure Rationale

- **`router/`:** Isolates input detection from handler logic. The router knows nothing about _how_ handlers work, only which one to call. This means adding a new input type requires only registering a new handler.
- **`handlers/`:** Each handler is a thin orchestrator — it calls services but contains no low-level I/O itself. This makes handlers testable with mocked services.
- **`services/`:** Grouped by concern (ocr, asr, llm, ffmpeg). Each service has an interface + factory function that picks implementation based on config. Handlers depend on the interface, not the implementation.
- **`parsers/`:** Kept separate from handlers because file parsing is pure transformation (no config, no external calls), making them easily unit-testable.
- **`config/`:** Centralized. All components receive a config object at construction time — no global state, no `process.env` scattered throughout.
- **`output/`:** Single responsibility: format and write results. Handlers return strings; the entry point decides how to emit them.

## Architectural Patterns

### Pattern 1: Handler Registry (Command Dispatcher)

**What:** A `Map<string, Handler>` where each key is an input-type discriminant (e.g., `"url"`, `"github"`, `"pdf"`, `"image"`, `"video"`). The router detects the discriminant and looks up the handler.

**When to use:** When you have a fixed set of input types known at build time and want clean extension points without if/else chains.

**Trade-offs:** Simple lookup, easy to test, no magic. Slightly more setup than a switch statement but enforces consistent handler interface.

```typescript
interface Handler {
  handle(input: string, options: Options): Promise<string>;
}

const registry = new Map<string, Handler>();
registry.set("url", new WebHandler(config));
registry.set("github", new GitHubHandler(config));
registry.set("pdf", new FileHandler(config));
registry.set("image", new ImageHandler(config));
registry.set("video", new VideoHandler(config));

// Router usage:
const type = router.detect(input);   // returns discriminant string
const handler = registry.get(type);
const result = await handler.handle(input, options);
```

### Pattern 2: Strategy Pattern for Cloud vs Local Engines

**What:** OCR and ASR each have an interface with two implementations. A factory function selects the implementation based on config at startup — not at call time.

**When to use:** When you have interchangeable implementations with identical contracts and the selection criterion is a config value.

**Trade-offs:** Handlers never branch on "cloud or local" — they call `engine.transcribe(path)` and get text. Swap the engine by changing config, not code.

```typescript
interface ASREngine {
  transcribe(filePath: string): Promise<string>;
}

function createASREngine(config: Config): ASREngine {
  if (config.asr.provider === "local") return new WhisperASR(config.asr.localModelPath);
  return new CloudASR(config.asr.apiKey, config.asr.provider);
}
```

### Pattern 3: Pipeline for Video Processing

**What:** VideoHandler composes a sequence of FFmpegWrapper calls where each stage produces an intermediate artifact consumed by the next stage: `video → audio.mp3 → transcript.txt`.

**When to use:** When a handler requires multiple subprocess calls with ordered dependencies and temp-file management.

**Trade-offs:** Easy to reason about, each stage is independently testable. Temp files must be cleaned up; use `try/finally`.

```typescript
async function extractTranscript(videoPath: string): Promise<string> {
  const audioPath = await ffmpeg.extractAudio(videoPath);   // stage 1
  try {
    const transcript = await asr.transcribe(audioPath);    // stage 2
    return transcript;
  } finally {
    await Bun.file(audioPath).remove?.();                  // cleanup
  }
}
```

### Pattern 4: Dependency Injection via Constructor

**What:** All components receive their dependencies (config, engines, clients) via constructor parameters, not by importing singletons.

**When to use:** Always — this is the correct approach for a Bun single-binary tool because `bun build --compile` bundles everything statically and global singletons survive across test invocations.

**Trade-offs:** Slightly more verbose construction at the entry point. Major benefit: every component is independently unit-testable with mocks.

## Data Flow

### Request Flow

```
CLI args (argv)
    ↓
ConfigManager.load()    ← ~/.bun-kit/config.json
    ↓
InputRouter.detect(rawInput)
    → returns discriminant: "url" | "github" | "pdf" | "image" | "audio" | "video"
    ↓
HandlerRegistry.get(discriminant).handle(input, options)
    ↓ (handler orchestrates services)
  WebScraper.fetch(url)              → raw HTML → extracted text
  FileParser.extract(path)           → raw bytes → text
  OCREngine.recognize(imagePath)     → image bytes → text
  ASREngine.transcribe(audioPath)    → audio bytes → text
  VideoProcessor.process(videoPath)  → FFmpeg stages → text/metadata
  LLMClient.complete(prompt, text)   → optional summarization pass
    ↓
OutputFormatter.write(result, options)
    → stdout (default) or --output file
```

### Key Data Flows

1. **URL flow:** `argv URL` → `InputRouter` detects `https://` prefix → `WebHandler` → fetches HTML, extracts text (optionally via Readability-style parsing) → optional LLM summarize → stdout.

2. **GitHub URL flow:** Same URL detection but `github.com/` pattern → `GitHubHandler` → fetches `README.md` + `git ls-files` tree via GitHub API or scrape → builds prompt → `LLMClient.complete()` → stdout.

3. **Video flow:** `argv video.mp4` → extension `.mp4/.mkv/.mov` → `VideoHandler` → `FFmpegWrapper.extractAudio()` → temp `audio.mp3` → `ASREngine.transcribe()` → text → cleanup temp → stdout.

4. **Image flow:** `argv image.png` → extension `.png/.jpg/.webp` → `ImageHandler` → `OCREngine.recognize()` → text → stdout.

5. **Config flow:** At startup only, before any routing. Config object passed down to all components that need API keys or provider preferences. Never re-read mid-execution.

## Scaling Considerations

This is a personal local tool — scaling means "works well for the author". No server scaling applies.

| Concern | Approach |
|---------|----------|
| Large video files | FFmpeg processes as a stream; temp audio file size is the constraint. Accept this. |
| Slow cloud OCR/ASR | Show progress indicator during subprocess/HTTP wait. Not a scale problem. |
| Adding a new input type | Register one new Handler in the registry. Zero changes to router logic. |
| Adding a new service provider | Add an implementation of the Engine interface. Factory function picks it. |
| Binary size growth | `bun build --compile` bundles everything. Keep heavy parsers lazy or accept size. |

## Anti-Patterns

### Anti-Pattern 1: Global Singleton Config

**What people do:** `export const config = loadConfig()` at module level, imported everywhere.

**Why it's wrong:** `bun build --compile` bundles statically — global state at module initialization runs once and is frozen into the binary. Config loaded at module init cannot pick up env vars or flag overrides at runtime. Also breaks unit tests.

**Do this instead:** `ConfigManager.load()` at the entry point, pass the config object into constructors. All components receive config as a constructor argument.

### Anti-Pattern 2: if/else Input Type Detection

**What people do:** A single `main()` with `if (isURL(input)) { ... } else if (isPDF(input)) { ... }` chains.

**Why it's wrong:** Grows unboundedly as handlers are added. Testing requires exercising the whole `main()`. Logic for routing and handling is interleaved.

**Do this instead:** `InputRouter` produces a discriminant string; `HandlerRegistry` maps discriminant to handler. Each is independently testable. Adding a handler = one `registry.set()` call.

### Anti-Pattern 3: Spawning FFmpeg with Shell String Concatenation

**What people do:** `` exec(`ffmpeg -i ${inputPath} -vn ${outputPath}`) `` with template literals.

**Why it's wrong:** Path injection if input paths contain spaces or special characters. Shell escaping is fragile and platform-dependent.

**Do this instead:** `Bun.spawn(["ffmpeg", "-i", inputPath, "-vn", outputPath])` with an explicit argv array. No shell involved, no injection risk.

### Anti-Pattern 4: Mixing Handler Logic with Service Calls

**What people do:** `VideoHandler` directly calls `fetch()`, spawns subprocess, calls OpenRouter all in one function.

**Why it's wrong:** Untestable without network, filesystem, and FFmpeg present. Changes to any service require changing the handler.

**Do this instead:** `VideoHandler` receives `FFmpegWrapper` and `ASREngine` as constructor dependencies. Call their methods. Mock them in tests.

### Anti-Pattern 5: Dynamic Imports in `bun build --compile` Entry Point

**What people do:** `const handler = await import(`./handlers/${type}`)` with runtime-computed paths.

**Why it's wrong:** `bun build --compile` performs static analysis at build time. Dynamically-computed import paths are not bundled — the binary ships without those modules and fails at runtime.

**Do this instead:** Static imports for all handlers at the top of the entry file. Use the registry pattern to select at runtime, not `import()`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenRouter | `fetch()` POST to `https://openrouter.ai/api/v1/chat/completions` | Standard OpenAI-compatible API; use `Authorization: Bearer` header |
| Cloud OCR (e.g., Google Vision, AWS Textract) | `fetch()` POST with base64 image payload | Provider-specific; wrap behind `OCREngine` interface |
| Cloud ASR (e.g., OpenAI Whisper API, Deepgram) | Multipart form `fetch()` POST with audio file | Provider-specific; wrap behind `ASREngine` interface |
| FFmpeg | `Bun.spawn(["ffmpeg", ...args])` — external process, not npm package | Must be installed on the system; check `which ffmpeg` at startup |
| Tesseract (local OCR) | `Bun.spawn(["tesseract", ...])` or via `tesseract.js` npm package | `tesseract.js` is pure JS — embeds into binary without system dep |
| Whisper (local ASR) | `Bun.spawn(["whisper", ...])` — OpenAI Whisper CLI or `whisper.cpp` | System dependency; document as optional |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| cli.ts ↔ InputRouter | Direct function call, returns discriminant string | No async needed |
| InputRouter ↔ HandlerRegistry | Direct registry `.get()` lookup | Registry populated at startup |
| Handler ↔ Service | Constructor-injected dependency, direct method call | Always async |
| VideoHandler ↔ FFmpegWrapper | Direct method calls returning `Promise<string>` (output path) | Temp files managed by VideoHandler |
| VideoHandler ↔ ASREngine | Direct method call after FFmpeg stage completes | Sequential, not parallel |
| Handler ↔ LLMClient | Optional call — handlers receive `LLMClient | null` | Summarization is opt-in |

## Build Order Implications

Dependencies flow from infrastructure up to entry point. Build and test in this order:

1. **ConfigManager + types** — No dependencies. Every other component needs this.
2. **OutputFormatter** — No dependencies. Entry point needs this immediately.
3. **FFmpegWrapper** — No dependencies beyond Bun stdlib. Required by VideoHandler.
4. **Parsers** (PDF, DOCX, plain text) — No external service deps. Required by FileHandler.
5. **LLMClient** — Depends on ConfigManager. Required by GitHubHandler and optional elsewhere.
6. **OCREngine + ASREngine** (interfaces + implementations) — Depend on ConfigManager and system tools.
7. **Handlers** — Depend on services above. Can be built and tested independently once services exist.
8. **InputRouter + HandlerRegistry** — Depends on Handler interface (not implementations).
9. **cli.ts entry point** — Wires everything together. Built last.

This ordering means phases can track directly: infrastructure first, services second, handlers third, integration (entry point) last.

## Sources

- [Bun single-file executables docs](https://bun.com/docs/bundler/executables) — HIGH confidence
- [How to Build CLI Applications with Bun](https://oneuptime.com/blog/post/2026-01-31-bun-cli-applications/view) — MEDIUM confidence
- [Command Dispatcher Pattern](https://hillside.net/plop/plop2001/accepted_submissions/PLoP2001/bdupireandebfernandez0/PLoP2001_bdupireandebfernandez0_1.pdf) — HIGH confidence (academic pattern)
- [Pipeline Pattern in TypeScript](https://dev.to/wallacefreitas/the-pipeline-pattern-streamlining-data-processing-in-software-architecture-44hn) — MEDIUM confidence
- [Bun.Subprocess API reference](https://bun.com/reference/bun/Subprocess) — HIGH confidence
- [bun-ffmpeg library](https://github.com/KenjiGinjo/bun-ffmpeg) — LOW confidence (reference only)
- [Building CLI apps with TypeScript in 2026](https://dev.to/hongminhee/building-cli-apps-with-typescript-in-2026-5c9d) — MEDIUM confidence

---
*Architecture research for: Bun CLI automation toolkit (bun-kit)*
*Researched: 2026-03-22*
