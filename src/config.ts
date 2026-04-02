import { join } from "path";
import { homedir } from "os";
import { z } from "zod";
import { InputError } from "./errors";

export const ConfigSchema = z
  .object({
    openrouter_api_key: z.string().optional(),
    openai_api_key: z.string().optional(),
    default_model: z.string().optional(),
    web_timeout: z.number().positive().optional(),
    web_headless: z.boolean().optional(),
    ocr_language: z.string().optional(),
    whisper_model: z.string().optional(),
  })
  .strict();

export type Config = z.infer<typeof ConfigSchema>;

function getConfigPath(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(xdgConfig, "bun-kit", "config.json");
}

export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();
  const file = Bun.file(configPath);

  let config: Config = {};

  if (await file.exists()) {
    try {
      const raw = await file.json();
      config = ConfigSchema.parse(raw);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
        throw new InputError(`Invalid config file ${configPath}:\n${issues}`);
      }
      throw new InputError(`Failed to read config file ${configPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Env vars override file values
  if (process.env.OPENROUTER_API_KEY) {
    config.openrouter_api_key = process.env.OPENROUTER_API_KEY;
  }
  if (process.env.OPENAI_API_KEY) {
    config.openai_api_key = process.env.OPENAI_API_KEY;
  }
  if (process.env.BUN_KIT_MODEL) {
    config.default_model = process.env.BUN_KIT_MODEL;
  }
  if (process.env.BUN_KIT_WEB_TIMEOUT) {
    config.web_timeout = Number(process.env.BUN_KIT_WEB_TIMEOUT);
  }
  if (process.env.BUN_KIT_OCR_LANGUAGE) {
    config.ocr_language = process.env.BUN_KIT_OCR_LANGUAGE;
  }
  if (process.env.BUN_KIT_WHISPER_MODEL) {
    config.whisper_model = process.env.BUN_KIT_WHISPER_MODEL;
  }

  return config;
}
