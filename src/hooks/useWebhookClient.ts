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
  meta?: Record<string, unknown>;
}

export interface VideoStatus {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  meta?: Record<string, unknown>;
}

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
  if (typeof data !== "object" || data === null) {
    throw new Error("Ungueltige Antwort vom Video-Webhook");
  }

  return {
    jobId: data.jobId ?? data.id,
    statusUrl: data.statusUrl ?? data.status_url ?? data.statusURI,
    videoUrl: data.videoUrl ?? data.video_url ?? data.url,
    meta: data.meta ?? data
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
    const status =
      data.status ?? data.state ?? (data.videoUrl || data.url ? "completed" : "processing");

    if (status === "completed") {
      return {
        status: "completed",
        videoUrl: data.videoUrl ?? data.url,
        meta: data
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
