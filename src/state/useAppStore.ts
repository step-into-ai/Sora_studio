import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PromptRecord, ThemeMode, VideoRecord } from "./types";

interface AppState {
  theme: ThemeMode;
  promptWebhook: string;
  videoWebhook: string;
  recentPrompts: PromptRecord[];
  activePromptId?: string;
  videoLibrary: VideoRecord[];
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setPromptWebhook: (url: string) => void;
  setVideoWebhook: (url: string) => void;
  savePrompt: (record: PromptRecord) => void;
  removePrompt: (id: string) => void;
  setActivePrompt: (id?: string) => void;
  saveVideo: (record: VideoRecord) => void;
  removeVideo: (id: string) => void;
  clearVideoLibrary: () => void;
}

const storageAvailable = typeof window !== "undefined";

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      promptWebhook: "",
      videoWebhook: "",
      recentPrompts: [],
      activePromptId: undefined,
      videoLibrary: [],
      setTheme: (mode) => set({ theme: mode }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setPromptWebhook: (url) => set({ promptWebhook: url.trim() }),
      setVideoWebhook: (url) => set({ videoWebhook: url.trim() }),
      savePrompt: (record) =>
        set((state) => {
          const filtered = state.recentPrompts.filter(
            (item) => item.id !== record.id
          );
          const next = [record, ...filtered].slice(0, 10);
          return { recentPrompts: next, activePromptId: record.id };
        }),
      removePrompt: (id) =>
        set((state) => ({
          recentPrompts: state.recentPrompts.filter((item) => item.id !== id),
          activePromptId:
            state.activePromptId === id ? undefined : state.activePromptId
        })),
      setActivePrompt: (id) => set({ activePromptId: id }),
      saveVideo: (record) =>
        set((state) => {
          const filtered = state.videoLibrary.filter(
            (item) => item.id !== record.id
          );
          const next = [record, ...filtered].slice(0, 20);
          return { videoLibrary: next };
        }),
      removeVideo: (id) =>
        set((state) => ({
          videoLibrary: state.videoLibrary.filter((item) => item.id !== id)
        })),
      clearVideoLibrary: () => set({ videoLibrary: [] })
    }),
    {
      name: "sora-video-studio",
      storage: storageAvailable
        ? createJSONStorage(() => window.localStorage)
        : undefined
    }
  )
);
