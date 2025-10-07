export type ThemeMode = "light" | "dark";

export interface PromptRecord {
  id: string;
  originalPrompt: string;
  optimizedPrompt?: string;
  createdAt: string;
}

export interface VideoRecord {
  id: string;
  prompt: string;
  imageName: string;
  videoUrl: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}
