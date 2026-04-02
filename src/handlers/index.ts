import type { Handler } from "../types";
import { githubHandler } from "./github";
import { webHandler } from "./web";
import { imageHandler } from "./image";
import { videoHandler } from "./video";
import { audioHandler } from "./audio";
import { fileHandler } from "./file";
import { echoHandler } from "./echo";

// Handlers checked in order — first match wins.
export const registry: Handler[] = [
  githubHandler,
  webHandler,
  imageHandler,
  videoHandler,
  audioHandler,
  fileHandler,
  echoHandler,
];
