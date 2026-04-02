import type { Handler } from "../types";
import { InputError, NetworkError } from "../errors";
import { log } from "../output";

// Use indirect require to prevent Bun bundler from statically analyzing playwright
async function loadPlaywright(): Promise<any> {
  const name = "playwright";
  try {
    return require(name);
  } catch {
    throw new InputError(
      "Playwright is not installed. Run:\n  bun add playwright && npx playwright install chromium",
    );
  }
}

export const webHandler: Handler = {
  name: "web",
  canHandle: (_input, inputType) => inputType === "url",
  handle: async (input, config) => {
    const pw = await loadPlaywright();

    const timeout = config.web_timeout ?? 30_000;
    let browser: any;

    try {
      log(`Launching browser for ${input}`);
      browser = await pw.chromium.launch({
        headless: config.web_headless ?? true,
      });
      const page = await browser.newPage();

      const response = await page.goto(input, {
        timeout,
        waitUntil: "domcontentloaded",
      });

      const status = response?.status() ?? 0;
      if (status >= 400) {
        throw new NetworkError(`HTTP ${status} for ${input}`);
      }

      const title = await page.title();
      const text = await page.innerText("body");

      return {
        text,
        metadata: {
          handler: "web",
          title,
          url: input,
          status,
        },
      };
    } catch (err) {
      if (err instanceof NetworkError || err instanceof InputError) throw err;
      if (err instanceof Error && err.message.includes("Timeout")) {
        throw new NetworkError(`Timeout after ${timeout}ms loading ${input}`);
      }
      throw new NetworkError(
        `Failed to scrape ${input}: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      await browser?.close();
    }
  },
};
