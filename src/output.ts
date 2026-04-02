import type { OutputEnvelope } from "./types";

export interface OutputOptions {
  json?: boolean;
  output?: string;
  verbose?: boolean;
}

export async function writeOutput(
  envelope: OutputEnvelope,
  options: OutputOptions,
): Promise<void> {
  const content = options.json
    ? JSON.stringify(envelope, null, 2)
    : envelope.text;

  if (options.output) {
    await Bun.write(options.output, content + "\n");
  } else {
    process.stdout.write(content + "\n");
  }
}

let verboseEnabled = false;

export function setVerbose(enabled: boolean): void {
  verboseEnabled = enabled;
}

export function log(message: string): void {
  if (verboseEnabled) {
    process.stderr.write(`[bun-kit] ${message}\n`);
  }
}

export function logError(message: string): void {
  process.stderr.write(`[bun-kit] error: ${message}\n`);
}
