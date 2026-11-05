import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRealtimeConnection } from "@/providers/realtime-provider";
import { AppText } from "@/components/ui/app-text";

type Stroke = { id: string; color: string; width: number; points: number[] };
type SnapshotStroke = {
  id: string;
  color: string;
  width: number;
  points: number[];
};
type Snapshot = { strokes: SnapshotStroke[] };
type StrokeStart = {
  id: string;
  color: string;
  width: number;
  x: number;
  y: number;
};
type StrokeAppend = { id: string; points: number[] };
type Drawing = {
  id: string;
  x: number;
  y: number;
  lastSent: number;
  pending: number[];
};

const INK_COLORS = ["#ff5252", "#ffd166", "#6ee7b7", "#60a5fa"];
const INK_WIDTH = 0.004;
// One batch per frame-ish keeps a fast scribble from flooding the socket.
const APPEND_INTERVAL_MS = 60;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));
const roundPoints = (points: number[]) =>
  points.map((value) => Math.round(value * 10_000) / 10_000);

const newStrokeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const pathFor = (stroke: Stroke, width: number, height: number) => {
  const { points } = stroke;
  if (points.length < 2) return "";
  let path = `M${(points[0] * width).toFixed(2)} ${(points[1] * height).toFixed(2)}`;
  for (let index = 2; index + 1 < points.length; index += 2) {
    path += `L${(points[index] * width).toFixed(2)} ${(points[index + 1] * height).toFixed(2)}`;
  }
  return path;
};

/**
 * A synced ink layer above the Jitsi view. Points are normalized to the shared
 * view, so marks track the share only as closely as the two layouts match —
 * letterboxing and portrait phones can drift.
 */
export const LessonPenOverlay = ({
  lessonId,
  active,
  canDraw,
  onDone,
}: {
  lessonId: string;
  active: boolean;
  canDraw: boolean;
  onDone: () => void;
}) => {
  const { connection, revision } = useRealtimeConnection();
  const insets = useSafeAreaInsets();
  const [color, setColor] = useState(INK_COLORS[0]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Map<string, Stroke>>(new Map());
  const drawingRef = useRef<Drawing | null>(null);
  const frameRef = useRef<number | null>(null);
  // The server only accepts strokes after JoinLessonPen registers the drawer.
  const readyRef = useRef(false);

  const publish = useCallback(() => {
    setStrokes(
      Array.from(strokesRef.current.values(), (stroke) => ({
        id: stroke.id,
        color: stroke.color,
        width: stroke.width,
        points: [...stroke.points],
      }))
    );
  }, []);

  const requestRender = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      publish();
    });
  }, [publish]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const invoke = useCallback(
    (method: string, ...args: unknown[]) => {
      void connection?.invoke(method, ...args).catch(() => {});
    },
    [connection]
  );

  // Join the lesson's ink group and keep it across reconnects. The snapshot
  // replaces the local board so a reconnect cannot double-draw a stroke.
  useEffect(() => {
    if (!connection || !lessonId) return;
    let disposed = false;
    readyRef.current = false;
    // A reconnect starts a new board; the old in-progress stroke is gone.
    drawingRef.current = null;

    const onStarted = (stroke: StrokeStart) => {
      if (!stroke?.id) return;
      strokesRef.current.set(stroke.id, {
        id: stroke.id,
        color: stroke.color,
        width: stroke.width,
        points: [stroke.x, stroke.y],
      });
      requestRender();
    };

    const onAppended = (stroke: StrokeAppend) => {
      const target = strokesRef.current.get(stroke?.id);
      if (!target || !Array.isArray(stroke.points)) return;
      target.points.push(...stroke.points);
      requestRender();
    };

    const onCleared = () => {
      strokesRef.current.clear();
      requestRender();
    };

    const join = async () => {
      try {
        const snapshot = await connection.invoke<Snapshot>(
          "JoinLessonPen",
          lessonId
        );
        if (disposed) return;
        const next = new Map<string, Stroke>();
        for (const stroke of snapshot?.strokes ?? []) {
          next.set(stroke.id, {
            id: stroke.id,
            color: stroke.color,
            width: stroke.width,
            points: [...stroke.points],
          });
        }
        strokesRef.current = next;
        readyRef.current = true;
        requestRender();
      } catch {
        // Marking is a bonus layer; a failed join must never block the call.
      }
    };

    connection.on("PenStrokeStarted", onStarted);
    connection.on("PenStrokeAppended", onAppended);
    connection.on("PenCleared", onCleared);
    void join();

    return () => {
      disposed = true;
      readyRef.current = false;
      connection.off("PenStrokeStarted", onStarted);
      connection.off("PenStrokeAppended", onAppended);
      connection.off("PenCleared", onCleared);
      void connection.invoke("LeaveLessonPen", lessonId).catch(() => {});
    };
  }, [connection, lessonId, revision, requestRender]);

  const handleEnd = useCallback(() => {
    const current = drawingRef.current;
    if (!current) return;
    drawingRef.current = null;
    if (current.pending.length > 0) {
      invoke(
        "AppendPenStroke",
        lessonId,
        current.id,
        roundPoints(current.pending)
      );
    }
    invoke("EndPenStroke", lessonId, current.id);
  }, [invoke, lessonId]);

  const handleStart = (event: GestureResponderEvent) => {
    if (!active || !canDraw || !readyRef.current || !size.width || !size.height) {
      return;
    }
    const x = clampUnit(event.nativeEvent.locationX / size.width);
    const y = clampUnit(event.nativeEvent.locationY / size.height);
    const id = newStrokeId();
    strokesRef.current.set(id, {
      id,
      color,
      width: INK_WIDTH,
      points: [x, y],
    });
    drawingRef.current = { id, x, y, lastSent: Date.now(), pending: [] };
    requestRender();
    invoke("StartPenStroke", lessonId, id, color, INK_WIDTH, x, y);
  };

  const handleMove = (event: GestureResponderEvent) => {
    const current = drawingRef.current;
    if (!current || !size.width || !size.height) return;
    const x = clampUnit(event.nativeEvent.locationX / size.width);
    const y = clampUnit(event.nativeEvent.locationY / size.height);
    if (Math.abs(x - current.x) + Math.abs(y - current.y) < 0.0015) return;

    current.x = x;
    current.y = y;
    strokesRef.current.get(current.id)?.points.push(x, y);
    current.pending.push(x, y);
    requestRender();

    const now = Date.now();
    if (now - current.lastSent < APPEND_INTERVAL_MS) return;
    current.lastSent = now;
    invoke(
      "AppendPenStroke",
      lessonId,
      current.id,
      roundPoints(current.pending.splice(0, current.pending.length))
    );
  };

  const clear = () => {
    strokesRef.current.clear();
    requestRender();
    invoke("ClearLessonPen", lessonId);
  };

  const drawing = active && canDraw;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.layer]}
      pointerEvents={active ? "auto" : "none"}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height }
        );
      }}
      onStartShouldSetResponder={() =>
        active && canDraw && readyRef.current
      }
      onMoveShouldSetResponder={() => active && canDraw && readyRef.current}
      onResponderGrant={handleStart}
      onResponderMove={handleMove}
      onResponderRelease={handleEnd}
      onResponderTerminate={handleEnd}
    >
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height} pointerEvents="none">
          {strokes.map((stroke) => (
            <Path
              key={stroke.id}
              d={pathFor(stroke, size.width, size.height)}
              stroke={stroke.color}
              strokeWidth={Math.max(1, stroke.width * size.height)}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      ) : null}

      {drawing ? (
        <View style={[styles.bar, { bottom: insets.bottom + 16 }]}>
          {INK_COLORS.map((ink) => (
            <Pressable
              key={ink}
              accessibilityRole="button"
              accessibilityLabel="Pen color"
              accessibilityState={{ selected: color === ink }}
              onPress={() => setColor(ink)}
              style={[
                styles.swatch,
                { backgroundColor: ink },
                color === ink && styles.swatchActive,
              ]}
            />
          ))}
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all marks"
            hitSlop={6}
            onPress={clear}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={17} color="#ffffff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop marking"
            onPress={onDone}
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="checkmark" size={15} color="#0b0f12" />
            <AppText variant="caption" weight="700" color="#0b0f12">
              Done
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: { zIndex: 5 },
  bar: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -140 }],
    width: 280,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(8,12,15,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: { borderColor: "#ffffff" },
  divider: { width: 1, height: 18, backgroundColor: "rgba(255,255,255,0.22)" },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ffd166",
  },
  pressed: { opacity: 0.7 },
});
