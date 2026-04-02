import { InputError } from "./errors";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  bitrate: number;
  size: number;
  hasAudio: boolean;
}

function commandExists(cmd: string): boolean {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    return Bun.spawnSync([which, cmd]).exitCode === 0;
  } catch {
    return false;
  }
}

export function hasFFmpeg(): boolean {
  return commandExists("ffmpeg");
}

export function hasFFprobe(): boolean {
  return commandExists("ffprobe");
}

export function checkFFmpeg(): void {
  if (!hasFFmpeg() || !hasFFprobe()) {
    throw new InputError("FFmpeg not found. Install with:\n  brew install ffmpeg");
  }
}

export async function extractMetadata(videoPath: string): Promise<VideoMetadata> {
  const proc = Bun.spawn(
    ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", videoPath],
    { stdout: "pipe", stderr: "pipe" },
  );

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new InputError(`ffprobe failed for "${videoPath}"`);
  }

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
  const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");
  const format = data.format ?? {};

  return {
    duration: parseFloat(format.duration ?? "0"),
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    videoCodec: videoStream?.codec_name ?? "unknown",
    audioCodec: audioStream?.codec_name ?? null,
    bitrate: parseInt(format.bit_rate ?? "0", 10),
    size: parseInt(format.size ?? "0", 10),
    hasAudio: !!audioStream,
  };
}

export async function extractAudio(videoPath: string, outputPath: string): Promise<void> {
  const proc = Bun.spawn(
    ["ffmpeg", "-y", "-i", videoPath, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", outputPath],
    { stdout: "pipe", stderr: "pipe" },
  );

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const lastLine = stderr.trim().split("\n").pop() ?? "";
    throw new InputError(`FFmpeg audio extraction failed: ${lastLine}`);
  }
}
