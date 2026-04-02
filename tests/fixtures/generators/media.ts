/**
 * Media fixture generator.
 *
 * Uses Google AI Studio (Gemini) API to generate:
 * - Images via gemini-2.0-flash-exp (image generation)
 * - Audio via gemini-2.5-flash-preview-tts (TTS)
 * - Video via veo-3.1-generate-preview
 *
 * Uses FFmpeg for post-processing (PCM → WAV, etc.)
 */

import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { DIRS, log } from "./utils.js";

// --- Image Generation ---

async function generateImages(ai: any) {
  log("media", "Generating images via Gemini...");

  const imagePrompts = [
    {
      name: "screenshot-text.png",
      prompt:
        "Generate an image of a computer terminal screenshot showing code output. The terminal should display clear, readable English text including: 'Processing file: report.pdf', 'Extracted 2,847 words', 'Language: English', 'Output saved to: output.txt'. Dark background with light monospace font.",
    },
    {
      name: "document-photo.jpg",
      prompt:
        "Generate a photo of a printed document page on a desk. The document should contain a clearly readable paragraph in English about software engineering best practices. The text should be sharp enough for OCR testing. Natural lighting, slight angle.",
    },
    {
      name: "handwritten-note.jpg",
      prompt:
        "Generate an image of a handwritten note on lined paper. The note should contain clearly written English text: 'Meeting notes: 1. Deploy v2.1 by Friday 2. Fix auth timeout bug 3. Review PR #142'. Blue ink on white paper. This is for testing OCR on handwriting.",
    },
  ];

  for (const img of imagePrompts) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: img.prompt,
        config: {
          responseModalities: ["IMAGE", "TEXT"],
          imageGenerationConfig: {
            numberOfImages: 1,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          writeFileSync(join(DIRS.images, img.name), buffer);
          log("media", `  OK images/${img.name} (${(buffer.length / 1024).toFixed(1)}KB)`);
          break;
        }
      }
    } catch (e: any) {
      log("media", `  FAIL images/${img.name}: ${e.message}`);
    }
  }
}

// --- Audio Generation (TTS) ---

async function generateAudio(ai: any, hasFfmpeg: boolean) {
  log("media", "Generating audio via Gemini TTS...");

  const audioPrompts = [
    {
      name: "speech-en.pcm",
      finalName: "speech-en.wav",
      prompt:
        "Say clearly and at a moderate pace: 'Welcome to bun-kit, the universal CLI automation tool. Give it a URL, a file, or a video, and it will figure out what to do. No configuration needed.'",
      voice: "Kore",
    },
    {
      name: "speech-zh.pcm",
      finalName: "speech-zh.wav",
      prompt:
        "用中文清晰地说: '欢迎使用 bun-kit 命令行工具。它可以自动识别你的输入类型，无论是网址、文件还是视频，都能智能处理。'",
      voice: "Kore",
    },
    {
      name: "podcast-sample.pcm",
      finalName: "podcast-sample.wav",
      prompt:
        "Speak as a podcast host introducing a topic: 'Today we are going to talk about the evolution of command-line tools in the age of AI. From simple shell scripts to intelligent input routing, the CLI is making a comeback. Let me walk you through what has changed.'",
      voice: "Puck",
    },
  ];

  for (const audio of audioPrompts) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: audio.prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: audio.voice },
            },
          },
        },
      });

      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!data) {
        log("media", `  FAIL media/${audio.finalName}: No audio data in response`);
        continue;
      }

      const pcmBuffer = Buffer.from(data, "base64");
      const pcmPath = join(DIRS.media, audio.name);
      writeFileSync(pcmPath, pcmBuffer);
      log("media", `  OK media/${audio.name} (${(pcmBuffer.length / 1024).toFixed(1)}KB raw PCM)`);

      // Convert PCM → WAV via FFmpeg
      if (hasFfmpeg) {
        const wavPath = join(DIRS.media, audio.finalName);
        try {
          execSync(
            `ffmpeg -y -f s16le -ar 24000 -ac 1 -i "${pcmPath}" "${wavPath}"`,
            { stdio: "pipe" }
          );
          log("media", `  OK media/${audio.finalName} (converted from PCM)`);
          // Remove intermediate PCM
          execSync(`rm "${pcmPath}"`, { stdio: "pipe" });
        } catch (e: any) {
          log("media", `  FAIL PCM→WAV conversion: ${e.message}`);
        }
      } else {
        log("media", `  SKIP PCM→WAV (ffmpeg not available)`);
      }
    } catch (e: any) {
      log("media", `  FAIL media/${audio.finalName}: ${e.message}`);
    }
  }

  // Generate MP3 from WAV if ffmpeg available
  if (hasFfmpeg) {
    try {
      const wavPath = join(DIRS.media, "speech-en.wav");
      const mp3Path = join(DIRS.media, "speech-en.mp3");
      execSync(`ffmpeg -y -i "${wavPath}" -c:a libmp3lame -q:a 2 "${mp3Path}"`, { stdio: "pipe" });
      log("media", `  OK media/speech-en.mp3 (converted from WAV)`);
    } catch (e: any) {
      log("media", `  FAIL WAV→MP3: ${e.message}`);
    }
  }
}

// --- Video Generation (Veo) ---

async function generateVideo(ai: any, hasFfmpeg: boolean) {
  log("media", "Generating video via Veo...");

  const videoPrompts = [
    {
      name: "short-clip.mp4",
      prompt:
        "A close-up shot of hands typing on a mechanical keyboard in a dimly lit room. The screen shows scrolling code. Soft ambient lighting with a warm desk lamp. 5 seconds.",
    },
  ];

  for (const video of videoPrompts) {
    try {
      let operation = await ai.models.generateVideos({
        model: "veo-3.1-generate-preview",
        prompt: video.prompt,
        config: {
          aspectRatio: "16:9",
          durationSeconds: 4,
        },
      });

      log("media", `  Waiting for video generation (this may take 1-5 minutes)...`);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 10 minutes max
      while (!operation.done && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        operation = await ai.operations.getVideosOperation({ operation });
        attempts++;
        if (attempts % 3 === 0) {
          log("media", `  Still generating video... (${attempts * 10}s elapsed)`);
        }
      }

      if (!operation.done) {
        log("media", `  FAIL media/${video.name}: Timed out after ${maxAttempts * 10}s`);
        continue;
      }

      const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
      if (!generatedVideo) {
        log("media", `  FAIL media/${video.name}: No video in response`);
        continue;
      }

      // Download the video
      const downloadPath = join(DIRS.media, video.name);
      await ai.files.download({
        file: generatedVideo,
        downloadPath,
      });
      log("media", `  OK media/${video.name}`);

      // Generate a silent version via FFmpeg for testing no-audio-track handling
      if (hasFfmpeg) {
        const silentPath = join(DIRS.media, "silent-clip.mp4");
        try {
          execSync(`ffmpeg -y -i "${downloadPath}" -an -c:v copy "${silentPath}"`, { stdio: "pipe" });
          log("media", `  OK media/silent-clip.mp4 (audio stripped)`);
        } catch (e: any) {
          log("media", `  FAIL silent strip: ${e.message}`);
        }
      }
    } catch (e: any) {
      log("media", `  FAIL media/${video.name}: ${e.message}`);
    }
  }
}

// --- FFmpeg Synthetic Fallback (when no Gemini key) ---

function generateSyntheticMedia(hasFfmpeg: boolean) {
  if (!hasFfmpeg) {
    log("media", "SKIP synthetic media (ffmpeg not available)");
    return;
  }

  log("media", "Generating synthetic media via FFmpeg (no Gemini key)...");

  const commands: Array<{ name: string; cmd: string }> = [
    {
      name: "synthetic-video.mp4",
      cmd: `ffmpeg -y -f lavfi -i testsrc=duration=5:size=320x240:rate=25 -f lavfi -i sine=frequency=440:duration=5 -c:v libx264 -c:a aac -shortest "${join(DIRS.media, "synthetic-video.mp4")}"`,
    },
    {
      name: "synthetic-audio.wav",
      cmd: `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=3" "${join(DIRS.media, "synthetic-audio.wav")}"`,
    },
    {
      name: "synthetic-audio.mp3",
      cmd: `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=3" -c:a libmp3lame "${join(DIRS.media, "synthetic-audio.mp3")}"`,
    },
    {
      name: "silent-video.mp4",
      cmd: `ffmpeg -y -f lavfi -i testsrc=duration=3:size=320x240:rate=25 -an -c:v libx264 "${join(DIRS.media, "silent-video.mp4")}"`,
    },
  ];

  for (const { name, cmd } of commands) {
    try {
      execSync(cmd, { stdio: "pipe" });
      log("media", `  OK media/${name}`);
    } catch (e: any) {
      log("media", `  FAIL media/${name}: ${e.stderr?.toString().split("\n")[0] ?? e.message}`);
    }
  }
}

// --- Main Export ---

export async function generateMedia(hasGeminiKey: boolean, hasFfmpeg: boolean) {
  console.log("\n=== Media ===");

  if (!hasGeminiKey) {
    log("media", "No GEMINI_API_KEY — falling back to FFmpeg synthetic media");
    generateSyntheticMedia(hasFfmpeg);
    return;
  }

  // Dynamic import to avoid crash when package isn't used
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  await generateImages(ai);
  await generateAudio(ai, hasFfmpeg);
  await generateVideo(ai, hasFfmpeg);

  // Also generate synthetic media as additional test fixtures
  generateSyntheticMedia(hasFfmpeg);
}
