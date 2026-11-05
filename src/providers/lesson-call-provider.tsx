import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { sendAttendanceEvent } from "@/api/lesson-operations";
import { getDeviceId } from "@/lib/device-id";
import { JitsiRoom } from "@/components/lesson/jitsi-room";
import { LessonPenOverlay } from "@/components/lesson/lesson-pen-overlay";
import { ShareLessonDrawer } from "@/components/lesson/share-lesson-drawer";
import { BrandMark } from "@/components/ui/brand";
import { AppText } from "@/components/ui/app-text";
import { TAB_BAR_CONTENT_HEIGHT } from "@/components/navigation/persistent-tab-bar";

export interface ActiveLessonCall {
  lessonId: string;
  room: string;
  displayName: string;
  title: string;
  subtitle: string;
  shareUrl: string;
  /** Only teachers and students count toward attendance; support does not. */
  trackAttendance?: boolean;
}

const newEventId = (action: string) =>
  `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface LessonCallContextValue {
  call: ActiveLessonCall | null;
  joined: boolean;
  minimized: boolean;
  startCall: (call: ActiveLessonCall) => void;
  endCall: () => void;
  endCallForLesson: (lessonId: string) => void;
  setMinimized: (minimized: boolean) => void;
}

const LessonCallContext = createContext<LessonCallContextValue | null>(null);

export const useLessonCall = () => {
  const context = useContext(LessonCallContext);
  if (!context) {
    throw new Error("useLessonCall must be used inside LessonCallProvider");
  }
  return context;
};

/**
 * Owns the live Jitsi room for the whole app. Mounted at the root so tab and
 * back navigation never unmounts the meeting and never drops the participant.
 */
export const LessonCallProvider = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  const [call, setCall] = useState<ActiveLessonCall | null>(null);
  const [joined, setJoined] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const callRef = useRef<ActiveLessonCall | null>(null);
  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const startCall = useCallback((next: ActiveLessonCall) => {
    setCall((current) => {
      // Same room: update labels without rebuilding the conference.
      if (current?.room === next.room) return { ...current, ...next };
      return next;
    });
  }, []);

  const cycleRef = useRef<{
    lessonId: string;
    room: string;
    deviceId: string;
  } | null>(null);

  const sendBeat = useCallback(
    (lessonId: string, action: "join" | "leave", deviceId: string) => {
      void sendAttendanceEvent(lessonId, {
        action,
        deviceId,
        eventId: newEventId(action),
        clientAt: new Date().toISOString(),
      }).catch(() => {
        // Attendance is best-effort; the server closes open intervals.
      });
    },
    []
  );

  const leaveCycle = useCallback(() => {
    const cycle = cycleRef.current;
    if (!cycle) return;
    cycleRef.current = null;
    sendBeat(cycle.lessonId, "leave", cycle.deviceId);
  }, [sendBeat]);

  const handleJoined = useCallback(() => {
    setJoined(true);
    if (!call?.trackAttendance) return;
    void getDeviceId()
      .then((deviceId) => {
        // The room may have changed while the device id was loading.
        if (callRef.current?.room !== call.room) return;
        cycleRef.current = {
          lessonId: call.lessonId,
          room: call.room,
          deviceId,
        };
        sendBeat(call.lessonId, "join", deviceId);
      })
      .catch(() => {});
  }, [call, sendBeat]);

  const endCall = useCallback(() => {
    leaveCycle();
    setCall(null);
    setJoined(false);
    setMinimized(false);
  }, [leaveCycle]);

  const endCallForLesson = useCallback(
    (lessonId: string) => {
      if (callRef.current?.lessonId !== lessonId) return;
      leaveCycle();
      setCall(null);
      setJoined(false);
      setMinimized(false);
    },
    [leaveCycle]
  );

  const activeRoom = call?.room ?? null;
  const roomRef = useRef<string | null>(null);
  useEffect(() => {
    if (roomRef.current === activeRoom) return;
    roomRef.current = activeRoom;
    leaveCycle();
    setJoined(false);
    setMinimized(false);
  }, [activeRoom, leaveCycle]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const timer = setTimeout(endCall, 0);
    return () => clearTimeout(timer);
  }, [endCall, status]);

  const value = useMemo(
    () => ({
      call,
      joined,
      minimized,
      startCall,
      endCall,
      endCallForLesson,
      setMinimized,
    }),
    [call, endCall, endCallForLesson, joined, minimized, startCall]
  );

  return (
    <LessonCallContext.Provider value={value}>
      {children}
      {call ? (
        <LessonCallHost
          call={call}
          joined={joined}
          minimized={minimized}
          onJoined={handleJoined}
          onLeft={leaveCycle}
          onMinimized={setMinimized}
          onEnd={endCall}
        />
      ) : null}
    </LessonCallContext.Provider>
  );
};

const LessonCallHost = ({
  call,
  joined,
  minimized,
  onJoined,
  onLeft,
  onMinimized,
  onEnd,
}: {
  call: ActiveLessonCall;
  joined: boolean;
  minimized: boolean;
  onJoined: () => void;
  onLeft: () => void;
  onMinimized: (minimized: boolean) => void;
  onEnd: () => void;
}) => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isLessonRoute = pathname === `/lesson/${call.lessonId}`;
  // Before joining there is nothing to minimize; keep the gate on screen.
  const expanded = isLessonRoute && (!minimized || !joined);
  const showMini = !expanded && joined;
  const tabBarVisible = !pathname.startsWith("/lesson/");

  // Jitsi also fires onReadyToClose when the room unmounts, so the second
  // leave call would dispatch another GO_BACK after the stack already popped.
  const leavingRef = useRef(false);
  useEffect(() => {
    leavingRef.current = false;
  }, [call.lessonId]);

  const endAndReturn = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    onEnd();
    if (isLessonRoute) {
      if (router.canGoBack()) router.back();
      else router.replace("/schedule");
    }
  }, [isLessonRoute, onEnd]);

  // Leaving the lesson before joining should not leave a hidden room behind.
  useEffect(() => {
    if (isLessonRoute || joined) return;
    const timer = setTimeout(onEnd, 0);
    return () => clearTimeout(timer);
  }, [isLessonRoute, joined, onEnd]);

  const open = useCallback(() => {
    onMinimized(false);
    if (!isLessonRoute) router.push(`/lesson/${call.lessonId}`);
  }, [call.lessonId, isLessonRoute, onMinimized]);

  const [shareOpen, setShareOpen] = useState(false);
  const [penActive, setPenActive] = useState(false);
  const { role } = useAuth();
  // The server enforces the same rule; this only decides who sees the button.
  const canMark =
    role === "teacher" || role === "admin" || role === "super_admin";

  // Marking takes over touches, so shrinking the room must drop it.
  const minimize = useCallback(() => {
    setPenActive(false);
    onMinimized(true);
  }, [onMinimized]);

  const containerStyle: StyleProp<ViewStyle> = expanded
    ? styles.expandedHost
    : showMini
      ? [
          styles.miniHost,
          {
            bottom:
              insets.bottom +
              (tabBarVisible ? TAB_BAR_CONTENT_HEIGHT + 10 : 12),
          },
        ]
      : styles.hiddenHost;

  return (
    <View
      style={containerStyle}
      pointerEvents={expanded || showMini ? "auto" : "none"}
      accessibilityElementsHidden={!expanded && !showMini}
      importantForAccessibility={
        expanded || showMini ? "auto" : "no-hide-descendants"
      }
    >
      {expanded ? <StatusBar style="light" /> : null}
      {expanded ? (
        <View key="bar" style={[styles.expandedBar, { paddingTop: insets.top + 6 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={joined ? "Minimize lesson" : "Close lesson room"}
            hitSlop={10}
            onPress={() => (joined ? minimize() : endAndReturn())}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={joined ? "chevron-down" : "close"}
              size={20}
              color="#ffffff"
            />
          </Pressable>
          <View style={styles.expandedCopy}>
            <AppText variant="small" weight="700" color="#ffffff" numberOfLines={1}>
              {call.title}
            </AppText>
            <AppText
              variant="caption"
              color="rgba(255,255,255,0.62)"
              numberOfLines={1}
            >
              {call.subtitle}
            </AppText>
          </View>
          {expanded && canMark ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                penActive ? "Stop marking the screen" : "Mark on the screen"
              }
              accessibilityState={{ selected: penActive }}
              hitSlop={10}
              onPress={() => setPenActive((value) => !value)}
              style={({ pressed }) => [
                styles.iconButton,
                penActive && styles.penActiveButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="pencil"
                size={17}
                color={penActive ? "#0b0f12" : "#ffffff"}
              />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share lesson room link"
            hitSlop={10}
            onPress={() => setShareOpen(true)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="share-outline" size={19} color="#ffffff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave lesson"
            hitSlop={10}
            onPress={endAndReturn}
            style={({ pressed }) => [
              styles.hangupButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="call"
              size={16}
              color="#ffffff"
              style={styles.hangupIcon}
            />
          </Pressable>
        </View>
      ) : null}

      {showMini ? (
        <View key="bar" style={styles.miniBar}>
          <View style={styles.liveDot} />
          <AppText
            variant="caption"
            weight="700"
            color="#ffffff"
            numberOfLines={1}
            style={styles.miniTitle}
          >
            Lesson in progress
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open lesson room"
            hitSlop={8}
            onPress={open}
            style={({ pressed }) => [
              styles.miniAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="expand-outline" size={13} color="#ffffff" />
            <AppText variant="caption" weight="700" color="#ffffff">
              Open
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share lesson room link"
            hitSlop={8}
            onPress={() => setShareOpen(true)}
            style={({ pressed }) => [
              styles.miniIcon,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="share-outline" size={14} color="#ffffff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave lesson"
            hitSlop={8}
            onPress={endAndReturn}
            style={({ pressed }) => [
              styles.miniHangup,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="call"
              size={12}
              color="#ffffff"
              style={styles.hangupIcon}
            />
          </Pressable>
        </View>
      ) : null}

      <View
        key="stage"
        style={
          expanded ? styles.expandedStage : showMini ? styles.miniStage : styles.hiddenStage
        }
        pointerEvents={showMini ? "none" : "auto"}
      >
        <JitsiRoom
          key={call.room}
          room={call.room}
          displayName={call.displayName}
          onJoined={onJoined}
          onLeft={onLeft}
          onClose={endAndReturn}
        />
        {expanded ? (
          <LessonPenOverlay
            lessonId={call.lessonId}
            active={penActive}
            canDraw={canMark}
            onDone={() => setPenActive(false)}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={
            penActive && expanded
              ? styles.logoHidden
              : showMini
                ? styles.miniLogo
                : styles.logo
          }
        >
          <BrandMark
            size={showMini ? 24 : 46}
            color="#8fd39a"
            fill="#f2faf3"
          />
        </View>
        {showMini ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open lesson room"
            onPress={open}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>

      <ShareLessonDrawer
        visible={shareOpen}
        shareUrl={call.shareUrl}
        onClose={() => setShareOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  expandedHost: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "#05080a",
  },
  hiddenHost: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
    zIndex: -1,
    elevation: -1,
  },
  miniHost: {
    position: "absolute",
    right: 12,
    width: 268,
    zIndex: 1000,
    elevation: 1000,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#0b0f12",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  expandedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: "#0b0f12",
  },
  expandedCopy: { flex: 1, gap: 1 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  hangupButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d94a3f",
  },
  penActiveButton: { backgroundColor: "#ffd166" },
  hangupIcon: { transform: [{ rotate: "135deg" }] },
  pressed: { opacity: 0.7 },
  expandedStage: { flex: 1, backgroundColor: "#05080a" },
  hiddenStage: { flex: 1, backgroundColor: "#05080a" },
  miniStage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#05080a",
  },
  miniBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#141a1f",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5ac47a",
  },
  miniTitle: { flex: 1 },
  miniAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  miniIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  miniHangup: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: "#d94a3f",
  },
  logo: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  logoHidden: { position: "absolute", opacity: 0 },
  miniLogo: {
    position: "absolute",
    left: 7,
    top: 7,
    zIndex: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});
