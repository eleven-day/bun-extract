#!/usr/bin/env bun
import { Command } from "commander";
import { loadConfig } from "./config";
import { route } from "./router";
import { writeOutput, setVerbose, logError } from "./output";
import { BunKitError } from "./errors";

const VERSION = "0.1.0";

const program = new Command()
  .name("bun-kit")
  .description("Auto-route input to the right handler — give it a URL, file, or video and it figures out what to do")
  .version(VERSION, "-v, --version")
  .argument("[input]", "URL, file path, or - for stdin")
  .option("--json", "Output structured JSON envelope")
  .option("--output <path>", "Write output to file instead of stdout")
  .option("--verbose", "Enable verbose logging on stderr")
  .option("--model <name>", "LLM model for summarization (OpenRouter model ID)");

program.action(async (input: string | undefined, options: Record<string, unknown>) => {
  try {
    setVerbose(!!options.verbose);

    if (!input) {
      program.help();
      return;
    }

    const config = await loadConfig();
    if (options.model) config.default_model = options.model as string;
    const envelope = await route(input, config);
    await writeOutput(envelope, {
      json: !!options.json,
      output: options.output as string | undefined,
      verbose: !!options.verbose,
    });
  } catch (err) {
    if (err instanceof BunKitError) {
      logError(err.message);
      process.exit(err.exitCode);
    }
    logError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
});

program.parse();
