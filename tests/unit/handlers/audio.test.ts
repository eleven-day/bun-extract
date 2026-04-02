import { describe, expect, test } from "bun:test";
import { audioHandler } from "../../../src/handlers/audio";
import { join } from "path";

const FIXTURES = join(import.meta.dir, "../../fixtures");

describe("audioHandler.canHandle", () => {
  test("matches audio file extensions", () => {
    expect(audioHandler.canHandle("speech.mp3", "file")).toBe(true);
    expect(audioHandler.canHandle("speech.wav", "file")).toBe(true);
    expect(audioHandler.canHandle("speech.m4a", "file")).toBe(true);
    expect(audioHandler.canHandle("speech.ogg", "file")).toBe(true);
    expect(audioHandler.canHandle("speech.flac", "file")).toBe(true);
    expect(audioHandler.canHandle("speech.aac", "file")).toBe(true);
  });

  test("rejects non-audio files", () => {
    expect(audioHandler.canHandle("doc.pdf", "file")).toBe(false);
    expect(audioHandler.canHandle("photo.png", "file")).toBe(false);
    expect(audioHandler.canHandle("video.mp4", "file")).toBe(false);
  });

  test("rejects non-file input types", () => {
    expect(audioHandler.canHandle("speech.mp3", "url")).toBe(false);
  });
});

describe("audioHandler.handle", () => {
  test("transcribes English speech via local whisper", async () => {
    const r = await audioHandler.handle(join(FIXTURES, "media/speech-en.wav"), {});
    expect(r.metadata.handler).toBe("audio");
    expect(r.metadata.mode).toBe("local");
    expect(r.text.length).toBeGreaterThan(10);
    expect(r.text.toLowerCase()).toContain("bun");
  }, 60_000);

  test("transcribes MP3 format", async () => {
    const r = await audioHandler.handle(join(FIXTURES, "media/speech-en.mp3"), {});
    expect(r.metadata.handler).toBe("audio");
    expect(r.text.length).toBeGreaterThan(10);
  }, 60_000);
});
