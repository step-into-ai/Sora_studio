import {
  ActionIcon,
  Anchor,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Tooltip
} from "@mantine/core";
import { ExternalLink as IconExternalLink, Trash2 as IconTrash2 } from "lucide-react";
import dayjs from "dayjs";
import { useAppStore } from "../state/useAppStore";

const pickMetaString = (meta: Record<string, unknown> | undefined, key: string) => {
  if (!meta) return undefined;
  const value = meta[key];
  return typeof value === "string" ? value : undefined;
};

export const VideoLibrary = () => {
  const videos = useAppStore((state) => state.videoLibrary);
  const removeVideo = useAppStore((state) => state.removeVideo);

  if (videos.length === 0) {
    return (
      <Card withBorder radius="md">
        <Title order={4}>Video Bibliothek</Title>
        <Text size="sm" c="dimmed">
          Sobald Videos generiert wurden, erscheinen sie hier zum erneuten Download.
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      <Title order={4}>Video Bibliothek</Title>
      <Stack gap="sm">
        {videos.map((video) => (
          <Card key={video.id} withBorder radius="md">
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text fw={500}>{video.imageName}</Text>
                <Group gap="xs">
                  <Tooltip label="Video öffnen">
                    <ActionIcon
                      component="a"
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="subtle"
                      color="grape"
                    >
                      <IconExternalLink size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Aus der Bibliothek entfernen">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeVideo(video.id)}
                    >
                      <IconTrash2 size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
              <Text size="sm">{video.prompt}</Text>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {dayjs(video.createdAt).format("DD.MM.YYYY HH:mm")}
                </Text>
                <Anchor
                  href={video.videoUrl}
                  download={pickMetaString(video.meta, "videoFileName")}
                  target="_blank"
                >
                  Download
                </Anchor>
              </Group>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};
