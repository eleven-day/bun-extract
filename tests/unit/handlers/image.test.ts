import { describe, expect, test } from "bun:test";
import { imageHandler } from "../../../src/handlers/image";
import { join } from "path";

const FIXTURES = join(import.meta.dir, "../../fixtures");

describe("imageHandler.canHandle", () => {
  test("matches image file extensions", () => {
    expect(imageHandler.canHandle("photo.png", "file")).toBe(true);
    expect(imageHandler.canHandle("photo.jpg", "file")).toBe(true);
    expect(imageHandler.canHandle("photo.jpeg", "file")).toBe(true);
    expect(imageHandler.canHandle("photo.webp", "file")).toBe(true);
    expect(imageHandler.canHandle("photo.gif", "file")).toBe(true);
    expect(imageHandler.canHandle("photo.tiff", "file")).toBe(true);
    expect(imageHandler.canHandle("photo.bmp", "file")).toBe(true);
  });

  test("rejects non-image files", () => {
    expect(imageHandler.canHandle("doc.pdf", "file")).toBe(false);
    expect(imageHandler.canHandle("audio.mp3", "file")).toBe(false);
    expect(imageHandler.canHandle("video.mp4", "file")).toBe(false);
  });

  test("rejects non-file input types", () => {
    expect(imageHandler.canHandle("photo.png", "url")).toBe(false);
  });
});

describe("imageHandler.handle", () => {
  test("extracts text from screenshot via local OCR", async () => {
    const r = await imageHandler.handle(join(FIXTURES, "images/screenshot-text.png"), {});
    expect(r.metadata.handler).toBe("image");
    expect(r.metadata.mode).toBe("local");
    expect(r.text.length).toBeGreaterThan(10);
    expect(typeof r.metadata.confidence).toBe("number");
  }, 30_000);

  test("extracts text from document photo", async () => {
    const r = await imageHandler.handle(join(FIXTURES, "images/document-photo.jpg"), {});
    expect(r.metadata.handler).toBe("image");
    expect(r.text.length).toBeGreaterThan(10);
  }, 30_000);
});
