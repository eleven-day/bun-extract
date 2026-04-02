import type { Config } from "./config";
import { InputError } from "./errors";
import { completeWithVision } from "./llm";
import { log } from "./output";

export interface OcrResult {
  text: string;
  mode: "cloud" | "local";
  confidence?: number;
}

function loadTesseract(): any | null {
  const name = "tesseract.js";
  try {
    return require(name);
  } catch {
    return null;
  }
}

async function ocrCloud(imagePath: string, config: Config): Promise<OcrResult> {
  log("OCR via cloud (OpenRouter vision)...");
  const imageData = await Bun.file(imagePath).arrayBuffer();
  const base64 = Buffer.from(imageData).toString("base64");
  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "png";
  const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;

  const result = await completeWithVision({
    apiKey: config.openrouter_api_key!,
    model: config.default_model,
    imageBase64: base64,
    imageMimeType: mimeType,
    userPrompt: "Extract all text from this image. Return only the extracted text, no explanations.",
  });

  return { text: result.text, mode: "cloud" };
}

async function ocrLocal(imagePath: string, language: string): Promise<OcrResult> {
  const Tesseract = loadTesseract();
  if (!Tesseract) return null as any; // caller checks

  log(`OCR via local tesseract.js (language: ${language})...`);
  const result = await Tesseract.recognize(imagePath, language);
  return {
    text: result.data.text.trim(),
    mode: "local",
    confidence: result.data.confidence,
  };
}

export async function extractText(imagePath: string, config: Config): Promise<OcrResult> {
  // Cloud preferred when API key available (higher quality)
  if (config.openrouter_api_key) {
    try {
      return await ocrCloud(imagePath, config);
    } catch (err) {
      log(`Cloud OCR failed, falling back to local: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Local tesseract.js (may not be available in compiled binary)
  const Tesseract = loadTesseract();
  if (Tesseract) {
    return ocrLocal(imagePath, config.ocr_language ?? "eng");
  }

  // Nothing available
  throw new InputError(
    "No OCR backend available. Either:\n  1. Set OPENROUTER_API_KEY for cloud OCR\n  2. Install tesseract.js: bun add tesseract.js",
  );
}
