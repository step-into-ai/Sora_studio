import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip
} from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  History as IconHistory,
  Send as IconSend,
  Sparkles as IconSparkles
} from "lucide-react";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { callPromptWebhook } from "../hooks/useWebhookClient";
import { useAppStore } from "../state/useAppStore";

const promptSchema = z.object({
  prompt: z.string().min(5, "Bitte beschreibe dein Video etwas genauer."),
  refinedPrompt: z.string().optional()
});

type PromptFormValues = z.infer<typeof promptSchema>;

export const PromptSection = ({
  onPromptSelected
}: {
  onPromptSelected: (prompt: string) => void;
}) => {
  const promptWebhook = useAppStore((state) => state.promptWebhook);
  const recentPrompts = useAppStore((state) => state.recentPrompts);
  const savePrompt = useAppStore((state) => state.savePrompt);
  const activePromptId = useAppStore((state) => state.activePromptId);
  const setActivePrompt = useAppStore((state) => state.setActivePrompt);
  const [isPromptDirty, setPromptDirty] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      prompt: "",
      refinedPrompt: ""
    }
  });

  const currentPrompt = watch("refinedPrompt")?.trim() || watch("prompt").trim();

  const mutation = useMutation({
    mutationKey: ["prompt-webhook"],
    mutationFn: async (values: PromptFormValues) => {
      if (!promptWebhook) {
        throw new Error("Bitte hinterlege zuerst den Prompt-Webhook in den Einstellungen.");
      }

      return callPromptWebhook(promptWebhook, {
        prompt: values.prompt,
        context: { refinedPrompt: values.refinedPrompt }
      });
    },
    onSuccess: (data, variables) => {
      const optimized = data.prompt?.trim() || variables.prompt.trim();
      const record = {
        id: crypto.randomUUID(),
        originalPrompt: variables.prompt.trim(),
        optimizedPrompt: optimized,
        createdAt: new Date().toISOString()
      };

      savePrompt(record);
      setValue("refinedPrompt", optimized);
      setPromptDirty(false);
      notifications.show({
        title: "Prompt erstellt",
        message: "Der KI-Agent hat deinen Prompt optimiert.",
        color: "teal"
      });
      onPromptSelected(optimized);
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Fehler beim Prompt",
        message: error.message,
        color: "red"
      });
    }
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  const sortedPrompts = useMemo(
    () =>
      [...recentPrompts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [recentPrompts]
  );

  useEffect(() => {
    if (!activePromptId) return;
    const record = recentPrompts.find((item) => item.id === activePromptId);
    if (!record) return;

    const optimized = record.optimizedPrompt ?? record.originalPrompt;
    setValue("refinedPrompt", optimized);
    setValue("prompt", record.originalPrompt);
    setPromptDirty(false);
  }, [activePromptId, recentPrompts, setValue]);

  return (
    <Stack gap="md">
      <Box>
        <Group justify="space-between" align="flex-end">
          <Title order={3}>Prompt Studio</Title>
          <Tooltip label="Der optimierte Prompt wird für das Video übernommen.">
            <Badge color="grape" variant="light">
              KI-Assistent
            </Badge>
          </Tooltip>
        </Group>
        <Text size="sm" c="dimmed">
          Beschreibe deine gewünschte Szene. Der KI-Agent verfeinert deinen Prompt automatisch.
        </Text>
      </Box>

      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Controller
            control={control}
            name="prompt"
            render={({ field }) => (
              <Textarea
                {...field}
                minRows={4}
                label="Deine Idee"
                placeholder="Beschreibe, was im Video passieren soll..."
                onChange={(event) => {
                  field.onChange(event);
                  setPromptDirty(true);
                }}
                error={errors.prompt?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="refinedPrompt"
            render={({ field }) => (
              <Textarea
                {...field}
                minRows={4}
                label="Optimierter Prompt"
                placeholder="Hier landet der verfeinerte Prompt – du kannst ihn weiter anpassen."
                onChange={(event) => {
                  field.onChange(event);
                  setPromptDirty(true);
                }}
              />
            )}
          />

          {!promptWebhook && (
            <Alert title="Webhook fehlt" color="yellow">
              Hinterlege zuerst einen Prompt-Webhook im Einstellungsbereich, damit der KI-Agent
              arbeiten kann.
            </Alert>
          )}

          <Group justify="space-between">
            <Button
              type="submit"
              leftSection={<IconSparkles size={18} />}
              loading={mutation.isPending}
              disabled={!promptWebhook}
            >
              Prompt optimieren
            </Button>

            <Button
              variant="light"
              leftSection={<IconSend size={18} />}
              disabled={!currentPrompt}
              onClick={() => onPromptSelected(currentPrompt)}
            >
              Prompt übernehmen
            </Button>
          </Group>
        </Stack>
      </form>

      <Card withBorder radius="md">
        <Group mb="xs">
          <IconHistory size={18} />
          <Text fw={600}>Letzte Prompts</Text>
        </Group>

        {sortedPrompts.length === 0 ? (
          <Text size="sm" c="dimmed">
            Noch keine Prompts gespeichert. Optimierte Prompts landen automatisch hier.
          </Text>
        ) : (
          <ScrollArea h={240} type="hover">
            <Stack gap="sm" pr="sm">
              {sortedPrompts.map((prompt) => (
                <Card
                  key={prompt.id}
                  radius="md"
                  withBorder
                  shadow={activePromptId === prompt.id ? "sm" : undefined}
                  style={{
                    borderColor:
                      activePromptId === prompt.id ? "var(--mantine-color-grape-5)" : undefined
                  }}
                >
                  <Stack gap={4}>
                    <Group justify="space-between" align="center">
                      <Text size="xs" c="dimmed">
                        {dayjs(prompt.createdAt).format("DD.MM.YYYY HH:mm")}
                      </Text>
                      <ActionIcon
                        variant={activePromptId === prompt.id ? "filled" : "subtle"}
                        color="grape"
                        aria-label="Prompt verwenden"
                        onClick={() => {
                          setValue("refinedPrompt", prompt.optimizedPrompt ?? prompt.originalPrompt);
                          setValue("prompt", prompt.originalPrompt);
                          setActivePrompt(prompt.id);
                          onPromptSelected(prompt.optimizedPrompt ?? prompt.originalPrompt);
                        }}
                      >
                        <IconSend size={16} />
                      </ActionIcon>
                    </Group>
                    <Text size="sm" fw={500}>
                      {prompt.optimizedPrompt ?? prompt.originalPrompt}
                    </Text>
                    {prompt.optimizedPrompt && (
                      <Text size="xs" c="dimmed">
                        Ursprünglich: {prompt.originalPrompt}
                      </Text>
                    )}
                  </Stack>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Card>
    </Stack>
  );
};
