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
type Snapshot = { strokes: SnapshotStroke[]; frame: number };
type StrokeStart = {
  id: string;
  color: string;
  width: number;
  x: number;
  y: number;
};
type StrokeAppend = { id: string; points: number[] };
type FrameChanged = { frame: number };
type Drawing = {
  id: string;
  x: number;
  y: number;
  lastSent: number;
  pending: number[];
};

const INK_COLORS = ["#ff5252", "#ffd166", "#6ee7b7", "#60a5fa"];
const INK_WIDTH = 0.004;
const DEFAULT_ASPECT = 16 / 9;
// One batch per frame-ish keeps a fast scribble from flooding the socket.
const APPEND_INTERVAL_MS = 60;
// The grip is dragged continuously; the room only needs the settled ratio.
const FRAME_INTERVAL_MS = 90;
// The same limits the hub enforces, so a drag never lands on a rejected value.
const MIN_ASPECT = 0.3;
const MAX_ASPECT = 4;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));
const clampAspect = (value: number) =>
  Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, value));
const roundPoints = (points: number[]) =>
  points.map((value) => Math.round(value * 10_000) / 10_000);

type Box = { x: number; y: number; width: number; height: number };

/** The largest centered box of the shared picture's ratio inside the stage. */
const frameBox = (width: number, height: number, aspect: number): Box => {
  const boxWidth = Math.min(width, height * aspect);
  const boxHeight = boxWidth / aspect;
  return {
    x: (width - boxWidth) / 2,
    y: (height - boxHeight) / 2,
    width: boxWidth,
    height: boxHeight,
  };
};

const newStrokeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const pathFor = (stroke: Stroke, box: Box) => {
  const { points } = stroke;
  if (points.length < 2) return "";
  let path = `M${(box.x + points[0] * box.width).toFixed(2)} ${(box.y + points[1] * box.height).toFixed(2)}`;
  for (let index = 2; index + 1 < points.length; index += 2) {
    path += `L${(box.x + points[index] * box.width).toFixed(2)} ${(box.y + points[index + 1] * box.height).toFixed(2)}`;
  }
  return path;
};

/**
 * A synced ink layer above the Jitsi view. Marks are normalized inside a
 * centered box fitted to the shared picture's ratio, so both screens write on
 * the same part of the page instead of on their own viewport. That box tracks
 * Jitsi's own letterboxing only approximately, because the filmstrip and
 * controls shift the picture differently on every screen: the corner grip is
 * how whoever marks corrects it, and only the ratio travels to the others.
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
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [fitting, setFitting] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Map<string, Stroke>>(new Map());
  const drawingRef = useRef<Drawing | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameSent = useRef(0);
  const frameDirty = useRef(false);
  // Where the grip and the touch started, so only the drag delta is needed.
  const fitFrom = useRef<{
    x: number;
    y: number;
    pageX: number;
    pageY: number;
  } | null>(null);
  // The server only accepts strokes after JoinLessonPen registers the drawer.
  const readyRef = useRef(false);

  const box = frameBox(size.width, size.height, aspect);

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

    const onFrame = (state: FrameChanged) => {
      const next = Number(state?.frame);
      if (Number.isFinite(next)) setAspect(clampAspect(next));
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
        const frame = Number(snapshot?.frame);
        setAspect(Number.isFinite(frame) ? clampAspect(frame) : DEFAULT_ASPECT);
        readyRef.current = true;
        requestRender();
      } catch {
        // Marking is a bonus layer; a failed join must never block the call.
      }
    };

    connection.on("PenStrokeStarted", onStarted);
    connection.on("PenStrokeAppended", onAppended);
    connection.on("PenCleared", onCleared);
    connection.on("PenFrameChanged", onFrame);
    void join();

    return () => {
      disposed = true;
      readyRef.current = false;
      connection.off("PenStrokeStarted", onStarted);
      connection.off("PenStrokeAppended", onAppended);
      connection.off("PenCleared", onCleared);
      connection.off("PenFrameChanged", onFrame);
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

  /** A stage position as a point inside the fitted box. */
  const pointOf = (locationX: number, locationY: number) => {
    if (box.width < 1 || box.height < 1) return null;
    return {
      x: clampUnit((locationX - box.x) / box.width),
      y: clampUnit((locationY - box.y) / box.height),
    };
  };

  const publishFrame = (next: number, force: boolean) => {
    const now = Date.now();
    if (!force && now - lastFrameSent.current < FRAME_INTERVAL_MS) {
      frameDirty.current = true;
      return;
    }
    lastFrameSent.current = now;
    frameDirty.current = false;
    void connection
      ?.invoke("SetPenFrame", lessonId, Number(next.toFixed(4)))
      .catch(() => {});
  };

  const fitGrant = (event: GestureResponderEvent) => {
    fitFrom.current = {
      x: box.x + box.width,
      y: box.y + box.height,
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    };
    setFitting(true);
  };

  const fitMove = (event: GestureResponderEvent) => {
    const from = fitFrom.current;
    if (!from) return;
    const touch = event.nativeEvent;
    const cornerX = from.x + (touch.pageX - from.pageX);
    const cornerY = from.y + (touch.pageY - from.pageY);
    // The corner is half a width and half a height from the centre, so its new
    // distance from the centre is the picture's ratio directly.
    const dx = Math.abs(cornerX - size.width / 2);
    const dy = Math.abs(cornerY - size.height / 2);
    if (dx < 8 || dy < 8) return;
    const next = clampAspect(dx / dy);
    if (Math.abs(next - aspect) < 0.002) return;
    setAspect(next);
    publishFrame(next, false);
  };

  const fitRelease = () => {
    fitFrom.current = null;
    setFitting(false);
    if (frameDirty.current) publishFrame(aspect, true);
  };

  const handleStart = (event: GestureResponderEvent) => {
    if (
      !active ||
      !canDraw ||
      fitting ||
      !readyRef.current ||
      !size.width ||
      !size.height
    ) {
      return;
    }
    const point = pointOf(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY
    );
    if (!point) return;
    const { x, y } = point;
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
    if (!current || fitting) return;
    const point = pointOf(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY
    );
    if (!point) return;
    const { x, y } = point;
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
              d={pathFor(stroke, box)}
              stroke={stroke.color}
              strokeWidth={Math.max(1, stroke.width * box.height)}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      ) : null}

      {drawing && box.width > 1 ? (
        <>
          {fitting ? (
            <View
              pointerEvents="none"
              style={[
                styles.frame,
                {
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                },
              ]}
            />
          ) : null}
          <View
            accessibilityRole="adjustable"
            accessibilityLabel="Drag to fit the marks to the shared screen"
            accessibilityValue={{
              min: MIN_ASPECT * 100,
              max: MAX_ASPECT * 100,
              now: Math.round(aspect * 100),
            }}
            hitSlop={10}
            style={[
              styles.grip,
              { left: box.x + box.width, top: box.y + box.height },
            ]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={fitGrant}
            onResponderMove={fitMove}
            onResponderRelease={fitRelease}
            onResponderTerminate={fitRelease}
          />
        </>
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
  frame: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,209,102,0.85)",
  },
  grip: {
    position: "absolute",
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#ffd166",
    backgroundColor: "rgba(11,15,18,0.8)",
  },
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
