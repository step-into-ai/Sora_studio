export interface PromptWebhookPayload {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface PromptWebhookResponse {
  prompt: string;
  meta?: Record<string, unknown>;
}

export interface VideoWebhookResponse {
  jobId?: string;
  statusUrl?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoMimeType?: string;
  meta?: Record<string, unknown>;
}

export interface VideoStatus {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  videoFileName?: string;
  videoMimeType?: string;
  meta?: Record<string, unknown>;
}

// Webhook payloads may return either a direct URL or the video encoded in Base64.
// We accept a set of commonly used field names so n8n or other workflow tools
// can respond with flexible naming.
const VIDEO_URL_KEYS = ["videoUrl", "video_url", "url", "sora_video_result", "result"];
const VIDEO_BASE64_KEYS = [
  "videoBase64",
  "video_base64",
  "base64",
  "videoData",
  "video_data",
  "binary",
  "binaryData",
  "data"
];
const MIME_TYPE_KEYS = ["mimeType", "mimetype", "contentType", "content_type", "type"];
const FILE_NAME_KEYS = ["fileName", "filename", "name"];
const EXCLUDED_META_KEYS = new Set([
  ...VIDEO_BASE64_KEYS,
  ...VIDEO_URL_KEYS,
  "videoBinary",
  "video_binary",
  "rawVideo",
  "raw_video"
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pickString = (source: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return undefined;
};

const createDataUrlFromBase64 = (value: string, fallbackMime: string): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/\s/g, "");
  const mimeType = fallbackMime || "video/mp4";

  try {
    if (typeof globalThis.atob === "function") {
      globalThis.atob(cleaned);
    }
  } catch {
    console.warn("Konnte Base64-Video nicht validieren. Antwort wird verworfen.");
    return undefined;
  }

  return `data:${mimeType};base64,${cleaned}`;
};

const sanitizeMeta = (source: Record<string, unknown>): Record<string, unknown> | undefined => {
  const entries = Object.entries(source).filter(([key, value]) => {
    if (typeof value === "string" && EXCLUDED_META_KEYS.has(key)) {
      return false;
    }
    return true;
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

const normalizeVideoPayload = (
  source: Record<string, unknown>
): {
  videoUrl?: string;
  videoFileName?: string;
  videoMimeType?: string;
} => {
  let videoUrl = pickString(source, VIDEO_URL_KEYS);
  const videoMimeType = pickString(source, MIME_TYPE_KEYS);
  const videoFileName = pickString(source, FILE_NAME_KEYS);

  if (!videoUrl) {
    const base64 = pickString(source, VIDEO_BASE64_KEYS);
    if (base64) {
      videoUrl = createDataUrlFromBase64(base64, videoMimeType ?? "video/mp4");
    }
  }

  return {
    videoUrl,
    videoFileName,
    videoMimeType: videoMimeType ?? (videoUrl?.startsWith("data:") ? "video/mp4" : undefined)
  };
};

export async function callPromptWebhook(
  url: string,
  payload: PromptWebhookPayload,
  signal?: AbortSignal
): Promise<PromptWebhookResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  const data = await response.json();

  const extractPrompt = (value: unknown): string | undefined => {
    if (typeof value === "string") {
      return value;
    }

    if (value && typeof value === "object") {
      const source = value as Record<string, unknown>;
      if (typeof source.prompt === "string") return source.prompt;
      if (typeof source.output === "string") return source.output;
      if (typeof source.text === "string") return source.text;
      if (typeof source.message === "string") return source.message;
    }

    return undefined;
  };

  let promptText: string | undefined;

  if (Array.isArray(data)) {
    for (const entry of data) {
      promptText = extractPrompt(entry);
      if (promptText) break;
    }
  } else {
    promptText = extractPrompt(data);
  }

  if (!promptText) {
    throw new Error("Webhook-Antwort enthielt keinen Prompt-Text.");
  }

  return {
    prompt: promptText.trim(),
    meta:
      typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined
  };
}

export async function sendVideoWebhook(
  url: string,
  {
    prompt,
    file,
    signal
  }: {
    prompt: string;
    file: File;
    signal?: AbortSignal;
  }
): Promise<VideoWebhookResponse> {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("image", file, file.name);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  const data = await response.json();
  if (!isRecord(data)) {
    throw new Error("Ungueltige Antwort vom Video-Webhook");
  }

  const { videoUrl, videoFileName, videoMimeType } = normalizeVideoPayload(data);
  const baseMeta = sanitizeMeta(data);
  const nestedMeta = data.meta && isRecord(data.meta) ? sanitizeMeta(data.meta) : undefined;
  const combinedMeta =
    baseMeta || nestedMeta ? { ...(baseMeta ?? {}), ...(nestedMeta ?? {}) } : undefined;

  return {
    jobId: data.jobId ?? data.id,
    statusUrl: data.statusUrl ?? data.status_url ?? data.statusURI,
    videoUrl: videoUrl ?? data.videoUrl ?? data.video_url ?? data.url,
    videoFileName,
    videoMimeType,
    meta: combinedMeta
  };
}

export async function pollVideoStatus(
  statusUrl: string,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<VideoStatus> {
  const interval = options.intervalMs ?? 5000;
  const timeout = options.timeoutMs ?? 6 * 60 * 1000;
  const start = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new Error("Abgebrochen");
    }

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }

    const data = await response.json();

    if (!isRecord(data)) {
      throw new Error("Ungueltige Status-Antwort vom Video-Webhook");
    }

    const status =
      data.status ?? data.state ?? (data.videoUrl || data.url ? "completed" : "processing");

    if (status === "completed") {
      const { videoUrl, videoFileName, videoMimeType } = normalizeVideoPayload(data);
      const baseMeta = sanitizeMeta(data);
      const nestedMeta = data.meta && isRecord(data.meta) ? sanitizeMeta(data.meta) : undefined;
      const combinedMeta =
        baseMeta || nestedMeta ? { ...(baseMeta ?? {}), ...(nestedMeta ?? {}) } : undefined;
      return {
        status: "completed",
        videoUrl: videoUrl ?? data.videoUrl ?? data.url,
        videoFileName,
        videoMimeType,
        meta: combinedMeta
      };
    }

    if (status === "failed") {
      return { status: "failed", meta: data };
    }

    if (Date.now() - start > timeout) {
      throw new Error("Timeout beim Abfragen des Video-Status");
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
