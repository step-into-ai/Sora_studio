import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Group, Stack, Text, useComputedColorScheme } from "@mantine/core";

const BOARD_SIZE = 18;
const TILE_SIZE = 16;
const SPEED_MS = 120;

type Direction = "up" | "down" | "left" | "right";

interface Coords {
  x: number;
  y: number;
}

const directionVectors: Record<Direction, Coords> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const oppositeDirection: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

const randomPosition = (occupied: Coords[] = []) => {
  let position: Coords;
  do {
    position = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE)
    };
  } while (occupied.some((segment) => segment.x === position.x && segment.y === position.y));
  return position;
};

export const SnakeGame = ({ visible }: { visible: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highscore, setHighscore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.localStorage.getItem("snake-highscore");
    return stored ? Number(stored) : 0;
  });
  const [isGameOver, setGameOver] = useState(false);
  const colorScheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });

  const stateRef = useRef<{
    direction: Direction;
    pendingDirection?: Direction;
    snake: Coords[];
    apple: Coords;
  }>();

  const resetGame = () => {
    const start: Coords = { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) };
    stateRef.current = {
      direction: "right",
      snake: [start, { x: start.x - 1, y: start.y }, { x: start.x - 2, y: start.y }],
      apple: randomPosition([
        start,
        { x: start.x - 1, y: start.y },
        { x: start.x - 2, y: start.y }
      ])
    };
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    if (!visible) return;
    resetGame();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const mapping: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right"
      };

      const direction = mapping[event.key];
      if (!direction) return;

      const current = stateRef.current;
      if (!current) return;

      if (direction === oppositeDirection[current.direction]) {
        return;
      }

      current.pendingDirection = direction;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      const current = stateRef.current;

      if (!canvas || !context || !current) {
        return;
      }

      if (isGameOver) {
        return;
      }

      if (current.pendingDirection) {
        current.direction = current.pendingDirection;
        delete current.pendingDirection;
      }

      const head = current.snake[0];
      const vector = directionVectors[current.direction];
      const newHead = { x: head.x + vector.x, y: head.y + vector.y };

      const isOutside =
        newHead.x < 0 || newHead.x >= BOARD_SIZE || newHead.y < 0 || newHead.y >= BOARD_SIZE;
      const hitsBody = current.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y);

      if (isOutside || hitsBody) {
        setGameOver(true);
        if (score > highscore) {
          setHighscore(score);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("snake-highscore", String(score));
          }
        }
        return;
      }

      current.snake = [newHead, ...current.snake];

      if (newHead.x === current.apple.x && newHead.y === current.apple.y) {
        setScore((value) => value + 1);
        current.apple = randomPosition(current.snake);
      } else {
        current.snake.pop();
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
        "--mantine-color-grape-6"
      );
      current.snake.forEach((segment) => {
        context.fillRect(segment.x * TILE_SIZE, segment.y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
      });

      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
        "--mantine-color-yellow-5"
      );
      context.fillRect(
        current.apple.x * TILE_SIZE,
        current.apple.y * TILE_SIZE,
        TILE_SIZE - 1,
        TILE_SIZE - 1
      );
    }, SPEED_MS);

    return () => clearInterval(interval);
  }, [visible, highscore, isGameOver, score]);

  const boardSizePx = useMemo(() => BOARD_SIZE * TILE_SIZE, []);
  const canvasStyle = useMemo(
    () => ({
      borderRadius: 12,
      background:
        colorScheme === "dark"
          ? "var(--mantine-color-dark-7)"
          : "var(--mantine-color-gray-0)",
      border:
        colorScheme === "dark"
          ? "1px solid var(--mantine-color-gray-5)"
          : "1px solid var(--mantine-color-gray-3)",
      boxShadow:
        colorScheme === "dark"
          ? "0 0 0 1px rgba(255, 255, 255, 0.08)"
          : "0 0 0 1px rgba(0, 0, 0, 0.06)"
    }),
    [colorScheme]
  );

  if (!visible) {
    return null;
  }

  return (
    <Stack gap="xs" align="center">
      <Group gap="sm">
        <Badge color="grape" variant="light">
          Snake Spiel
        </Badge>
        <Text size="sm">Wartee dir die Zeit – Steuerung mit den Pfeiltasten oder WASD.</Text>
      </Group>
      <canvas ref={canvasRef} width={boardSizePx} height={boardSizePx} style={canvasStyle} />
      <Group gap="xl">
        <Text>Score: {score}</Text>
        <Text>Bestzeit: {highscore}</Text>
      </Group>
      {isGameOver && (
        <Box
          style={{
            padding: "8px 16px",
            background: "rgba(0,0,0,0.45)",
            borderRadius: 12
          }}
          onClick={() => resetGame()}
        >
          <Text fw={600} style={{ cursor: "pointer" }}>
            Game Over – zum Neustart klicken!
          </Text>
        </Box>
      )}
    </Stack>
  );
};
