import { useState } from "react";
import {
  ActionIcon,
  AppShell,
  Box,
  Container,
  Group,
  SimpleGrid,
  Text,
  Title
} from "@mantine/core";
import { Moon as IconMoon, Settings2 as IconSettings2, Sun as IconSun } from "lucide-react";
import { PromptSection } from "./components/PromptSection";
import { VideoSection } from "./components/VideoSection";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { useAppStore } from "./state/useAppStore";

const HeaderBar = ({
  onSettingsClick
}: {
  onSettingsClick: () => void;
}) => {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <AppShell.Header>
      <Container size="lg" h="100%">
        <Group justify="space-between" align="center" h="100%">
          <Box>
            <Title order={2}>Sora Video Studio</Title>
            <Text size="sm" c="dimmed">
              Moderne Agenten-Pipeline für Video-Prompts, Webhooks und Rendering.
            </Text>
          </Box>
          <Group gap="xs">
            <ActionIcon
              size="lg"
              variant="subtle"
              aria-label="Theme wechseln"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <ActionIcon
              size="lg"
              variant="filled"
              color="grape"
              aria-label="Einstellungen öffnen"
              onClick={onSettingsClick}
            >
              <IconSettings2 size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Container>
    </AppShell.Header>
  );
};

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>();

  return (
    <>
      <AppShell header={{ height: 80 }} padding="xl">
        <HeaderBar onSettingsClick={() => setSettingsOpen(true)} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <SimpleGrid spacing="xl" cols={{ base: 1, md: 2 }}>
              <PromptSection onPromptSelected={setSelectedPrompt} />
              <VideoSection prompt={selectedPrompt} onPromptChange={setSelectedPrompt} />
            </SimpleGrid>
          </Container>
        </AppShell.Main>
      </AppShell>
      <SettingsDrawer opened={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export default App;
