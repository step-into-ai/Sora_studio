import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import App from "./App";
import { useAppStore } from "./state/useAppStore";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
});

const Root = () => {
  const mode = useAppStore((state) => state.theme);

  return (
    <MantineProvider
      theme={{
        colorScheme: mode,
        primaryColor: "grape",
        defaultRadius: "md",
        fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"
      }}
      forceColorScheme={mode}
      withGlobalStyles
      withNormalizeCSS
    >
      <Notifications position="top-right" limit={3} />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MantineProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
