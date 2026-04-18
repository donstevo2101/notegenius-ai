import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export type ConvertFormat = "mp4" | "avi" | "mov" | "webm" | "mp3" | "wav" | "ogg" | "m4a" | "aac" | "flac";
export type CompressQuality = "low" | "medium" | "high";

export async function convertFile(
  file: File,
  targetFormat: ConvertFormat,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(Math.round(progress * 100)));
  }

  const inputName = `input.${file.name.split(".").pop() || "mp4"}`;
  const outputName = `output.${targetFormat}`;

  await ff.writeFile(inputName, await fetchFile(file));
  await ff.exec(["-i", inputName, outputName]);

  const data = await ff.readFile(outputName);
  const bytes = (data instanceof Uint8Array ? data.slice() : new TextEncoder().encode(data as string)) as BlobPart;
  const blob = new Blob([bytes], { type: getMimeType(targetFormat) });

  // Cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return blob;
}

export async function compressFile(
  file: File,
  type: "video" | "audio",
  quality: CompressQuality,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; originalSize: number; compressedSize: number; savings: number }> {
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(Math.round(progress * 100)));
  }

  const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "mp3");
  const inputName = `input.${ext}`;
  const outputName = `output.${ext}`;

  const videoArgs: Record<CompressQuality, string[]> = {
    low: ["-crf", "35", "-preset", "fast"],
    medium: ["-crf", "28", "-preset", "medium"],
    high: ["-crf", "23", "-preset", "slow"],
  };

  const audioArgs: Record<CompressQuality, string[]> = {
    low: ["-b:a", "64k"],
    medium: ["-b:a", "128k"],
    high: ["-b:a", "192k"],
  };

  await ff.writeFile(inputName, await fetchFile(file));

  const args = type === "video"
    ? ["-i", inputName, ...videoArgs[quality], "-c:a", "aac", outputName]
    : ["-i", inputName, ...audioArgs[quality], outputName];

  await ff.exec(args);

  const data = await ff.readFile(outputName);
  const bytes = (data instanceof Uint8Array ? data.slice() : new TextEncoder().encode(data as string)) as BlobPart;
  const blob = new Blob([bytes], { type: file.type });

  const originalSize = file.size;
  const compressedSize = blob.size;
  const savings = Math.round((1 - compressedSize / originalSize) * 100);

  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return { blob, originalSize, compressedSize, savings };
}

function getMimeType(format: string): string {
  const map: Record<string, string> = {
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
  };
  return map[format] || "application/octet-stream";
}
