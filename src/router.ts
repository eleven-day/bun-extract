import { existsSync } from "fs";
import type { InputType, OutputEnvelope } from "./types";
import type { Config } from "./config";
import { registry } from "./handlers/index";
import { InputError } from "./errors";

export function detectInputType(input: string): InputType {
  if (/^https?:\/\//i.test(input)) return "url";
  if (input === "-") return "stdin";
  if (existsSync(input)) return "file";
  return "unknown";
}

export async function route(
  input: string,
  config: Config,
): Promise<OutputEnvelope> {
  const inputType = detectInputType(input);
  const handler = registry.find((h) => h.canHandle(input, inputType));

  if (!handler) {
    throw new InputError(
      `No handler found for input: ${input} (detected type: ${inputType})`,
    );
  }

  const result = await handler.handle(input, config);

  return {
    input,
    type: inputType,
    text: result.text,
    metadata: result.metadata,
  };
}
