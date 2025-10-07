## Sora Video Studio

Interaktive React/Vite App zum Erstellen und Verwalten von Video-Jobs über Webhooks. Die Oberfläche kombiniert ein Prompt-Studio mit einem Video-Workflow, lokal gespeicherten Einstellungen sowie einer kleinen Snake-Minispiel-Wartezone.

### Schnellstart

```bash
npm install
npm run dev
```

Die Entwicklungsumgebung läuft standardmäßig auf http://localhost:5173. Alle Einstellungen, Prompts und generierten Videos werden im `localStorage` des Browsers gespeichert.

### Build & GitHub Pages

Das Vite-Build gibt automatisch in den Ordner `docs/` aus, damit die App direkt über GitHub Pages veröffentlicht werden kann.

```bash
npm run build
```

Committe anschließend den `docs/` Ordner und aktiviere GitHub Pages (Branch `main`, Ordner `/docs`).

### Workflow

- **Prompt Studio**: Beschreibe deine Szene, lasse sie automatisch vom Prompt-Webhook verfeinern und wähle den gewünschten Prompt aus der Historie.
- **Video Generator**: Lade ein Referenzbild hoch. Prompt + Bild werden an den Video-Webhook gesendet. Bei längeren Renderzeiten informiert dich der Statusbereich und das Snake-Minispiel verkürzt die Wartezeit.
- **Bibliothek**: Fertige Videos werden mit Prompt, Timestamp und Download-Link im lokalen Videoregister abgelegt.
- **Einstellungen**: Prompt-Webhook, Video-Webhook sowie Dark-/Lightmode werden persistent im Browser gespeichert.

### Anpassungen

- Passen Sie bei Bedarf den `base` Pfad in `vite.config.ts` an (`base: "./"` ist für die meisten GitHub-Pages-Deployments ausreichend).
- Ergänzen Sie bei Bedarf zusätzliche Felder für die Prompt- oder Video-Workflows in `src/hooks/useWebhookClient.ts`.
- Das Snake-Spiel befindet sich in `src/components/SnakeGame.tsx` und kann leicht modifiziert oder ersetzt werden.

