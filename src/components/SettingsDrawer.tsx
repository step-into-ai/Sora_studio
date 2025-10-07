import { useEffect } from "react";
import {
  Button,
  Drawer,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { Settings as IconSettings } from "lucide-react";
import { useAppStore } from "../state/useAppStore";

interface SettingsDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export const SettingsDrawer = ({ opened, onClose }: SettingsDrawerProps) => {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const promptWebhook = useAppStore((state) => state.promptWebhook);
  const videoWebhook = useAppStore((state) => state.videoWebhook);
  const setPromptWebhook = useAppStore((state) => state.setPromptWebhook);
  const setVideoWebhook = useAppStore((state) => state.setVideoWebhook);

  const form = useForm({
    initialValues: {
      promptWebhook,
      videoWebhook
    },
    validate: {
      promptWebhook: (value) =>
        value && !value.startsWith("http") ? "Bitte gib eine gültige URL ein." : null,
      videoWebhook: (value) =>
        value && !value.startsWith("http") ? "Bitte gib eine gültige URL ein." : null
    }
  });

  useEffect(() => {
    form.setValues({ promptWebhook, videoWebhook });
  }, [promptWebhook, videoWebhook, opened]);

  const handleSubmit = form.onSubmit((values) => {
    setPromptWebhook(values.promptWebhook);
    setVideoWebhook(values.videoWebhook);
    notifications.show({
      title: "Einstellungen gespeichert",
      message: "Die Webhook-URLs wurden im Local Storage aktualisiert.",
      color: "teal"
    });
    onClose();
  });

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group gap="sm">
          <IconSettings size={18} />
          <Title order={4} style={{ margin: 0 }}>
            Einstellungen
          </Title>
        </Group>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Stack gap={4}>
            <TextInput
              label="Prompt Webhook"
              description="Dieser Webhook erhält deine Beschreibung und liefert einen optimierten Prompt zurück."
              placeholder="https://meine-automation.de/prompt"
              {...form.getInputProps("promptWebhook")}
            />
            <TextInput
              label="Video Webhook"
              description="Diesen Endpoint nutzt die App, um Prompt + Bild für den Video-Job zu senden."
              placeholder="https://meine-automation.de/video"
              {...form.getInputProps("videoWebhook")}
            />
          </Stack>

          <Switch
            label="Dark Mode aktivieren"
            checked={theme === "dark"}
            onChange={(event) => setTheme(event.currentTarget.checked ? "dark" : "light")}
          />

          <Text size="xs" c="dimmed">
            Alle Einstellungen sowie die letzten Prompts und Videos werden im Local Storage deines
            Browsers gesichert, sodass du sie schnell wiederfindest.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="light" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">Speichern</Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
};
