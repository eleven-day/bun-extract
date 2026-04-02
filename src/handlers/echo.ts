import type { Handler } from "../types";

export const echoHandler: Handler = {
  name: "echo",
  canHandle: () => true,
  handle: async (input) => ({
    text: `[echo] Received input: ${input}`,
    metadata: { handler: "echo" },
  }),
};
