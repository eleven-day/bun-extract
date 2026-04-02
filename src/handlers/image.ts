import type { Handler } from "../types";
import { extractText } from "../ocr";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|tiff?|bmp)$/i;

export const imageHandler: Handler = {
  name: "image",
  canHandle: (_input, inputType) => {
    if (inputType !== "file") return false;
    return IMAGE_RE.test(_input);
  },
  handle: async (input, config) => {
    const result = await extractText(input, config);
    return {
      text: result.text,
      metadata: {
        handler: "image",
        mode: result.mode,
        ...(result.confidence != null ? { confidence: result.confidence } : {}),
      },
    };
  },
};
