import { describe, expect, test } from "bun:test";
import { videoHandler } from "../../../src/handlers/video";
import { join } from "path";

const FIXTURES = join(import.meta.dir, "../../fixtures");

describe("videoHandler.canHandle", () => {
  test("matches video file extensions", () => {
    expect(videoHandler.canHandle("video.mp4", "file")).toBe(true);
    expect(videoHandler.canHandle("video.mkv", "file")).toBe(true);
    expect(videoHandler.canHandle("video.mov", "file")).toBe(true);
    expect(videoHandler.canHandle("video.avi", "file")).toBe(true);
    expect(videoHandler.canHandle("video.webm", "file")).toBe(true);
    expect(videoHandler.canHandle("video.m4v", "file")).toBe(true);
  });

  test("rejects audio files", () => {
    expect(videoHandler.canHandle("audio.mp3", "file")).toBe(false);
    expect(videoHandler.canHandle("audio.wav", "file")).toBe(false);
  });

  test("rejects non-video files", () => {
    expect(videoHandler.canHandle("doc.pdf", "file")).toBe(false);
    expect(videoHandler.canHandle("photo.png", "file")).toBe(false);
  });

  test("rejects non-file input types", () => {
    expect(videoHandler.canHandle("video.mp4", "url")).toBe(false);
  });
});

describe("videoHandler.handle", () => {
  test("extracts metadata and transcribes video with audio", async () => {
    const r = await videoHandler.handle(join(FIXTURES, "media/short-clip.mp4"), {});
    expect(r.metadata.handler).toBe("video");
    expect(r.metadata.hasAudio).toBe(true);
    expect(r.metadata.duration).toBeGreaterThan(0);
    expect(r.metadata.resolution).toBeTruthy();
    expect(r.metadata.videoCodec).toBeTruthy();
    expect(typeof r.text).toBe("string");
  }, 60_000);

  test("handles silent video (no audio track)", async () => {
    const r = await videoHandler.handle(join(FIXTURES, "media/silent-clip.mp4"), {});
    expect(r.metadata.handler).toBe("video");
    expect(r.metadata.hasAudio).toBe(false);
    expect(r.text).toBe("(No audio track)");
    expect(r.metadata.duration).toBeGreaterThan(0);
  }, 30_000);

  test("handles synthetic FFmpeg test video", async () => {
    const r = await videoHandler.handle(join(FIXTURES, "media/synthetic-video.mp4"), {});
    expect(r.metadata.handler).toBe("video");
    expect(r.metadata.duration).toBeGreaterThan(0);
  }, 60_000);
});
