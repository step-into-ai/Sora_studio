import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  FileInput,
  Group,
  Image,
  Menu,
  Stack,
  Text,
  Title,
  Tooltip
} from "@mantine/core";
import {
  AlertTriangle as IconAlertTriangle,
  Check as IconCheck,
  Copy as IconCopy,
  History as IconHistory,
  Loader2 as IconLoader2,
  Image as IconImage,
  Play as IconPlayerPlay,
  Upload as IconUpload
} from "lucide-react";
import { notifications } from "@mantine/notifications";
import { pollVideoStatus, sendVideoWebhook } from "../hooks/useWebhookClient";
import { useAppStore } from "../state/useAppStore";
import { SnakeGame } from "./SnakeGame";
import { VideoLibrary } from "./VideoLibrary";

type Status = "idle" | "uploading" | "waiting" | "completed" | "failed";

type VideoSectionProps = {
  prompt?: string;
  onPromptChange?: (prompt: string) => void;
};

export const VideoSection = ({ prompt, onPromptChange }: VideoSectionProps) => {
  const videoWebhook = useAppStore((state) => state.videoWebhook);
  const saveVideo = useAppStore((state) => state.saveVideo);
  const recentPrompts = useAppStore((state) => state.recentPrompts);
  const setActivePrompt = useAppStore((state) => state.setActivePrompt);
  const activePromptId = useAppStore((state) => state.activePromptId);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVideoInfo, setCurrentVideoInfo] = useState<{ fileName?: string; mimeType?: string } | null>(
    null
  );
  const [controller, setController] = useState<AbortController | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const isBusy = status === "uploading" || status === "waiting";
  const previousPrompts = useMemo(() => recentPrompts.slice(0, 7), [recentPrompts]);

  const handleCopyPrompt = useCallback(async () => {
    if (!prompt) {
      notifications.show({
        title: "Kein Prompt",
        message: "Es gibt gerade keinen Prompt zum Kopieren.",
        color: "yellow"
      });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      notifications.show({
        title: "Zwischenablage nicht verfügbar",
        message: "Das Kopieren wird in deiner Umgebung nicht unterstützt.",
        color: "red"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      notifications.show({
        title: "Prompt kopiert",
        message: "Der Prompt liegt jetzt in deiner Zwischenablage.",
        color: "teal"
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Kopieren fehlgeschlagen",
        message: "Der Prompt konnte nicht kopiert werden. Bitte kopiere ihn manuell.",
        color: "red"
      });
    }
  }, [prompt]);

  const handleReusePrompt = useCallback(
    (id: string) => {
      const record = previousPrompts.find((item) => item.id === id);
      if (!record) {
        return;
      }

      const value = record.optimizedPrompt ?? record.originalPrompt;
      setActivePrompt(id);
      onPromptChange?.(value);
      notifications.show({
        title: "Prompt geladen",
        message: "Der gespeicherte Prompt wurde übernommen.",
        color: "teal"
      });
    },
    [previousPrompts, setActivePrompt, onPromptChange]
  );

  const handleSubmit = async () => {
    if (!prompt) {
      notifications.show({
        title: "Prompt fehlt",
        message: "Bitte wähle oder erstelle zuerst einen Prompt.",
        color: "yellow"
      });
      return;
    }

    if (!file) {
      notifications.show({
        title: "Bild fehlt",
        message: "Lade ein Referenzbild hoch, damit das Video erstellt werden kann.",
        color: "yellow"
      });
      return;
    }

    if (!videoWebhook) {
      notifications.show({
        title: "Webhook fehlt",
        message: "Hinterlege zuerst den Video-Webhook in den Einstellungen.",
        color: "yellow"
      });
      return;
    }

    const abortController = new AbortController();
    setController(abortController);
    setStatus("uploading");
    setStatusMessage("Upload läuft...");
    setCurrentVideoInfo(null);
    setCurrentVideoUrl(null);

    try {
      const initial = await sendVideoWebhook(videoWebhook, {
        prompt,
        file,
        signal: abortController.signal
      });

      let videoUrl = initial.videoUrl ?? null;
      let meta = initial.meta;
      let videoFileName = initial.videoFileName;
      let videoMimeType = initial.videoMimeType;

      if (!videoUrl && initial.statusUrl) {
        setStatus("waiting");
        setStatusMessage("Video wird gerendert – das dauert manchmal ein paar Minuten.");
        const result = await pollVideoStatus(initial.statusUrl, {
          signal: abortController.signal,
          intervalMs: 5000,
          timeoutMs: 8 * 60 * 1000
        });

        meta = result.meta ?? meta;
        videoFileName = result.videoFileName ?? videoFileName;
        videoMimeType = result.videoMimeType ?? videoMimeType;

        if (result.status === "failed") {
          throw new Error("Der Video-Job wurde vom Backend als fehlgeschlagen gemeldet.");
        }

        videoUrl = result.videoUrl ?? null;
      }

      if (!videoUrl) {
        throw new Error("Die Antwort enthielt keinen Link zum Video.");
      }

      const recordMeta = (() => {
        const base: Record<string, unknown> = meta ? { ...meta } : {};
        if (videoFileName) {
          base.videoFileName = videoFileName;
        }
        if (videoMimeType) {
          base.videoMimeType = videoMimeType;
        }
        return Object.keys(base).length > 0 ? base : undefined;
      })();

      const record = {
        id: crypto.randomUUID(),
        prompt,
        imageName: file.name,
        videoUrl,
        createdAt: new Date().toISOString(),
        meta: recordMeta
      };

      saveVideo(record);
      setCurrentVideoUrl(videoUrl);
      setCurrentVideoInfo({ fileName: videoFileName, mimeType: videoMimeType });
      setStatus("completed");
      setStatusMessage("Video ist fertig! Du kannst es jetzt ansehen und herunterladen.");
      notifications.show({
        title: "Video bereit",
        message: "Das gerenderte Video wurde gespeichert.",
        color: "teal"
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unerwarteter Fehler beim Video-Webhook.";
      if (abortController.signal.aborted) {
        notifications.show({
          title: "Abgebrochen",
          message: "Die Video-Erstellung wurde gestoppt.",
          color: "yellow"
        });
      } else {
        notifications.show({
          title: "Video fehlgeschlagen",
          message,
          color: "red"
        });
        setStatus("failed");
        setStatusMessage(message);
      }
    } finally {
      setController(null);
    setStatus((current) => {
      if (abortController.signal.aborted) {
        return "idle";
      }
      if (current === "failed" || current === "completed") {
        return current;
      }
      return "idle";
    });
    }
  };

  const handleAbort = () => {
    controller?.abort();
    setStatus("idle");
    setStatusMessage("Upload abgebrochen");
  };

  const displayStatus = useMemo(() => {
    if (!statusMessage) return null;
    const color =
      status === "failed"
        ? "red"
        : status === "waiting"
          ? "violet"
          : status === "completed"
            ? "green"
            : "blue";

    const icon =
      status === "failed" ? (
        <IconAlertTriangle size={18} />
      ) : status === "completed" ? (
        <IconPlayerPlay size={18} />
      ) : (
        <IconLoader2 size={18} />
      );

    return (
      <Alert color={color} title="Status" variant="light" icon={icon}>
        {statusMessage}
      </Alert>
    );
  }, [status, statusMessage]);

  return (
    <Stack gap="lg">
      <Box>
        <Group justify="space-between" align="flex-end">
          <Title order={3}>Video Generator</Title>
          <Badge color="grape" variant="light">
            Webhook Workflow
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Verwende den fertigen Prompt, lade ein Referenzbild hoch und starte den Render-Job.
        </Text>
      </Box>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Group gap="xs" align="center">
            <Tooltip label="Prompt kopieren" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="md"
                aria-label="Prompt kopieren"
                onClick={handleCopyPrompt}
              >
                <IconCopy size={16} />
              </ActionIcon>
            </Tooltip>
            <Menu width={320} withinPortal>
              <Menu.Target>
                <Tooltip
                  label={
                    previousPrompts.length === 0
                      ? "Noch keine Prompts gespeichert"
                      : "Gespeicherte Prompts anzeigen"
                  }
                  withArrow
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    radius="md"
                    aria-label="Gespeicherte Prompts anzeigen"
                  >
                    <IconHistory size={16} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Letzte Prompts</Menu.Label>
                {previousPrompts.length === 0 ? (
                  <Menu.Item disabled>
                    <Text size="sm" c="dimmed">
                      Noch keine Prompts gespeichert
                    </Text>
                  </Menu.Item>
                ) : (
                  previousPrompts.map((item) => (
                    <Menu.Item
                      key={item.id}
                      onClick={() => handleReusePrompt(item.id)}
                      rightSection={activePromptId === item.id ? <IconCheck size={14} /> : undefined}
                    >
                      <Text size="sm" fw={500} lineClamp={2}>
                        {item.optimizedPrompt ?? item.originalPrompt}
                      </Text>
                    </Menu.Item>
                  ))
                )}
              </Menu.Dropdown>
            </Menu>
            <Text size="sm" fw={600}>
              Aktueller Prompt
            </Text>
          </Group>
          <Text size="sm" c={prompt ? undefined : "dimmed"}>
            {prompt || "Noch kein Prompt ausgewählt."}
          </Text>
          <FileInput
            label="Referenzbild"
            placeholder="PNG oder JPG hochladen"
            accept="image/png,image/jpeg,image/webp"
            icon={<IconImage size={18} />}
            value={file}
            onChange={setFile}
            clearable
          />

          {previewUrl && (
            <Image
              src={previewUrl}
              alt="Prompt Referenz"
              radius="md"
              height={180}
              fit="cover"
              withPlaceholder
            />
          )}

          <Group gap="sm">
            <Button
              onClick={handleSubmit}
              leftSection={<IconUpload size={18} />}
              loading={isBusy}
              disabled={!prompt || !file || isBusy}
            >
              Video erstellen
            </Button>
            {isBusy && (
              <Button variant="light" color="red" onClick={handleAbort}>
                Abbrechen
              </Button>
            )}
          </Group>

          {displayStatus}

          {isBusy && <SnakeGame visible />}

          {currentVideoUrl && (
            <Stack>
              <Text fw={600}>Vorschau</Text>
              <video
                src={currentVideoUrl}
                controls
                style={{ width: "100%", borderRadius: 12, background: "black" }}
              />
              <Group>
                <Button
                  component="a"
                  href={currentVideoUrl}
                  download={currentVideoInfo?.fileName || undefined}
                  target="_blank"
                  leftSection={<IconPlayerPlay size={18} />}
                >
                  Video herunterladen
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Card>

      <VideoLibrary />
    </Stack>
  );
};
