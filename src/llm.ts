import { OpenRouter } from "@openrouter/sdk";
import { AuthError, NetworkError } from "./errors";

const DEFAULT_MODEL = "anthropic/claude-3-haiku";

export interface CompletionOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
}

export interface CompletionResult {
  text: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number };
}

const DEFAULT_VISION_MODEL = "qwen/qwen-2.5-vl-72b-instruct";

export interface VisionCompletionOptions {
  apiKey: string;
  model?: string;
  imageBase64: string;
  imageMimeType: string;
  userPrompt: string;
}

export async function completeWithVision(opts: VisionCompletionOptions): Promise<CompletionResult> {
  if (!opts.apiKey) {
    throw new AuthError(
      "OpenRouter API key not configured.\nSet OPENROUTER_API_KEY env var or add openrouter_api_key to ~/.config/bun-kit/config.json",
    );
  }

  const model = opts.model || DEFAULT_VISION_MODEL;
  const client = new OpenRouter({ apiKey: opts.apiKey });

  try {
    const response = await client.chat.send({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${opts.imageMimeType};base64,${opts.imageBase64}` } },
            { type: "text", text: opts.userPrompt },
          ] as any,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content ?? "";
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      text,
      model,
      usage: {
        prompt_tokens: usage.prompt_tokens ?? 0,
        completion_tokens: usage.completion_tokens ?? 0,
      },
    };
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? 0;
    const message = err?.message ?? String(err);
    if (status === 401) throw new AuthError("Invalid OpenRouter API key");
    if (status === 429) throw new NetworkError("OpenRouter rate limit exceeded. Try again later.");
    throw new NetworkError(`OpenRouter vision API error: ${message}`);
  }
}

export async function complete(opts: CompletionOptions): Promise<CompletionResult> {
  if (!opts.apiKey) {
    throw new AuthError(
      "OpenRouter API key not configured.\nSet OPENROUTER_API_KEY env var or add openrouter_api_key to ~/.config/bun-kit/config.json",
    );
  }

  const model = opts.model || DEFAULT_MODEL;
  const client = new OpenRouter({ apiKey: opts.apiKey });

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: opts.userPrompt });

  try {
    const response = await client.chat.send({
      model,
      messages,
    });

    const text = response.choices?.[0]?.message?.content ?? "";
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      text,
      model,
      usage: {
        prompt_tokens: usage.prompt_tokens ?? 0,
        completion_tokens: usage.completion_tokens ?? 0,
      },
    };
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? 0;
    const message = err?.message ?? String(err);

    if (status === 401) {
      throw new AuthError("Invalid OpenRouter API key");
    }
    if (status === 429) {
      throw new NetworkError("OpenRouter rate limit exceeded. Try again later.");
    }
    throw new NetworkError(`OpenRouter API error: ${message}`);
  }
}
