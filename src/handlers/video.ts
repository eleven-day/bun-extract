import { join } from "path";
import { tmpdir } from "os";
import { unlinkSync, existsSync } from "fs";
import type { Handler } from "../types";
import { checkFFmpeg, extractMetadata, extractAudio } from "../ffmpeg";
import { transcribe } from "../asr";
import { log } from "../output";

const VIDEO_RE = /\.(mp4|mkv|mov|avi|webm|flv|wmv|m4v)$/i;

export const videoHandler: Handler = {
  name: "video",
  canHandle: (_input, inputType) => {
    if (inputType !== "file") return false;
    return VIDEO_RE.test(_input);
  },
  handle: async (input, config) => {
    checkFFmpeg();

    log(`Extracting metadata from ${input}...`);
    const meta = await extractMetadata(input);

    let transcription = "";
    let asrMode: string | undefined;

    if (meta.hasAudio) {
      const tmpWav = join(tmpdir(), `bun-kit-audio-${Date.now()}.wav`);
      try {
        log("Extracting audio track...");
        await extractAudio(input, tmpWav);

        log("Transcribing audio...");
        const result = await transcribe(tmpWav, config);
        transcription = result.text;
        asrMode = result.mode;
      } finally {
        if (existsSync(tmpWav)) unlinkSync(tmpWav);
      }
    } else {
      log("No audio track found, skipping transcription.");
    }

    return {
      text: transcription || "(No audio track)",
      metadata: {
        handler: "video",
        duration: meta.duration,
        resolution: meta.width && meta.height ? `${meta.width}x${meta.height}` : null,
        videoCodec: meta.videoCodec,
        audioCodec: meta.audioCodec,
        hasAudio: meta.hasAudio,
        ...(asrMode ? { asrMode } : {}),
      },
    };
  },
};
