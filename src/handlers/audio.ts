import type { Handler } from "../types";
import { transcribe } from "../asr";

const AUDIO_RE = /\.(mp3|wav|m4a|ogg|flac|webm|wma|aac)$/i;

export const audioHandler: Handler = {
  name: "audio",
  canHandle: (_input, inputType) => {
    if (inputType !== "file") return false;
    return AUDIO_RE.test(_input);
  },
  handle: async (input, config) => {
    const result = await transcribe(input, config);
    return {
      text: result.text,
      metadata: {
        handler: "audio",
        mode: result.mode,
      },
    };
  },
};
