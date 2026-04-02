import type { Handler } from "../types";
import { InputError } from "../errors";

let kreuzberg: any = null;

async function loadKreuzberg(): Promise<any> {
  if (kreuzberg) return kreuzberg;
  const name = "@kreuzberg/wasm";
  try {
    const mod = require(name);
    await mod.initWasm();
    kreuzberg = mod;
    return mod;
  } catch {
    throw new InputError(
      "File extraction requires @kreuzberg/wasm.\nInstall: bun add @kreuzberg/wasm",
    );
  }
}

export const fileHandler: Handler = {
  name: "file",
  canHandle: (_input, inputType) => inputType === "file",
  handle: async (input) => {
    const kb = await loadKreuzberg();

    try {
      const result = await kb.extractFile(input);
      return {
        text: result.content,
        metadata: {
          handler: "file",
          mimeType: result.mimeType,
          ...result.metadata,
        },
      };
    } catch (err) {
      throw new InputError(
        `Failed to extract file "${input}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
};
