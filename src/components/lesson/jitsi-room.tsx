import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { JitsiMeeting } from "@jitsi/react-native-sdk";
import { JITSI_DOMAIN } from "@/config/env";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "@/components/ui/app-text";

type JoinMode = "audio-video" | "audio-only" | "view-only";

type Props = {
  room: string;
  displayName: string;
  onJoined?: () => void;
  onClose: () => void;
};

const STAGE_BG = "#05080a";
const SERVER_URL = `https://${JITSI_DOMAIN}/`;

// Mirrors the web room's toolbar so both clients offer the same controls,
// including the screen share button (native ReplayKit / MediaProjection).
const TOOLBAR_BUTTONS = ["microphone", "camera", "desktop", "chat", "hangup"];

const buildConfig = (mode: JoinMode) => ({
  prejoinPageEnabled: false,
  prejoinConfig: { enabled: false, hideDisplayName: true },
  requireDisplayName: false,
  enableWelcomePage: false,
  disableDeepLinking: true,
  deeplinking: { disabled: true },
  hideLoginButton: true,
  startWithAudioMuted: mode === "view-only",
  startWithVideoMuted: mode !== "audio-video",
  enableInsecureRoomNameWarning: false,
  toolbarButtons: TOOLBAR_BUTTONS,
  disableReactions: true,
  disablePolls: true,
  disableWhiteboard: true,
  disableVirtualBackground: true,
  hideConferenceSubject: true,
  hideConferenceTimer: true,
});

// The conference keeps running in the background so a screen share is not
// interrupted when the app is sent to the background.
const FLAGS = {
  "ios.screensharing.enabled": true,
  "android.screensharing.enabled": true,
  "pip.enabled": true,
  "prejoinpage.enabled": false,
};

export const JitsiRoom = ({
  room,
  displayName,
  onJoined,
  onClose,
}: Props) => {
  const { colors, radius } = useTheme();
  const [mode, setMode] = useState<JoinMode | null>(null);
  const [pendingMode, setPendingMode] = useState<JoinMode | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const closedRef = useRef(false);
  const joinedRef = useRef(false);
  // The SDK registers listeners once on mount, so read the latest callbacks
  // through refs instead of freezing the values from the first render.
  const onCloseRef = useRef(onClose);
  const onJoinedRef = useRef(onJoined);
  useEffect(() => {
    onCloseRef.current = onClose;
    onJoinedRef.current = onJoined;
  }, [onClose, onJoined]);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current();
  }, []);

  const handleJoined = useCallback(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    onJoinedRef.current?.();
  }, []);

  const eventListeners = useMemo(
    () => ({
      onConferenceJoined: handleJoined,
      onReadyToClose: close,
    }),
    [close, handleJoined]
  );

  const config = useMemo(
    () => (mode ? buildConfig(mode) : undefined),
    [mode]
  );

  const userInfo = useMemo(
    () => ({ displayName, avatarURL: "", email: "" }),
    [displayName]
  );

  const requestDevices = async (nextMode: JoinMode) => {
    setPermissionError(null);

    if (nextMode !== "view-only") {
      setPendingMode(nextMode);
      try {
        if (nextMode === "audio-video") {
          const camera = await Camera.requestCameraPermissionsAsync();
          if (!camera.granted) {
            setPermissionError(
              "Camera access was blocked. Allow it in Settings, or join with microphone only."
            );
            return;
          }
        }

        const microphone = await requestRecordingPermissionsAsync();
        if (!microphone.granted) {
          setPermissionError(
            "Microphone access was blocked. Allow it in Settings, or join to watch and listen only."
          );
          return;
        }
      } catch {
        setPermissionError(
          "Could not request camera or microphone access. You can still join to watch and listen."
        );
        return;
      } finally {
        setPendingMode(null);
      }
    }

    closedRef.current = false;
    joinedRef.current = false;
    setMode(nextMode);
  };

  if (!mode) {
    const busy = pendingMode !== null;

    return (
      <View style={styles.stage}>
        <View style={styles.gate}>
          <View style={styles.gateIcon}>
            <Ionicons name="videocam-outline" size={30} color="#ffffff" />
          </View>
          <AppText variant="h2" color="#ffffff" align="center">
            Ready to join your lesson?
          </AppText>
          <AppText
            variant="small"
            color="rgba(255,255,255,0.72)"
            align="center"
            style={styles.gateCopy}
          >
            Allow camera and microphone so your teacher can see and hear you.
            This is a private, unlisted lesson room — share the link only with
            someone you trust.
          </AppText>

          <View style={styles.gateButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Join with camera and microphone"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => void requestDevices("audio-video")}
              style={({ pressed }) => [
                styles.stageButton,
                {
                  backgroundColor: colors.brand,
                  borderRadius: radius.md,
                  opacity: busy ? 0.6 : pressed ? 0.88 : 1,
                },
              ]}
            >
              {pendingMode === "audio-video" ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="videocam" size={18} color="#ffffff" />
              )}
              <AppText variant="button" color="#ffffff">
                {pendingMode === "audio-video"
                  ? "Waiting for permission…"
                  : "Join with camera & mic"}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Join with microphone only"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => void requestDevices("audio-only")}
              style={({ pressed }) => [
                styles.stageButton,
                styles.stageButtonOutline,
                {
                  borderRadius: radius.md,
                  opacity: busy ? 0.6 : pressed ? 0.88 : 1,
                },
              ]}
            >
              {pendingMode === "audio-only" ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="mic-outline" size={18} color="#ffffff" />
              )}
              <AppText variant="button" color="#ffffff">
                {pendingMode === "audio-only"
                  ? "Waiting for permission…"
                  : "Join with mic only"}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Join without camera and microphone"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void requestDevices("view-only")}
              style={({ pressed }) => [
                styles.stageButton,
                styles.stageButtonQuiet,
                {
                  borderRadius: radius.md,
                  opacity: busy ? 0.6 : pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="videocam-off-outline" size={17} color="#ffffff" />
              <AppText variant="small" color="rgba(255,255,255,0.82)" weight="700">
                Join without camera & mic
              </AppText>
            </Pressable>
          </View>

          <View style={styles.shareHint}>
            <Ionicons
              name="phone-portrait-outline"
              size={14}
              color="rgba(255,255,255,0.62)"
            />
            <AppText
              variant="caption"
              color="rgba(255,255,255,0.62)"
              style={styles.shareHintText}
            >
              Screen sharing keeps running when you switch to another app.
            </AppText>
          </View>

          {permissionError ? (
            <View style={styles.errorBox}>
              <AppText variant="small" color="#f7c9c2">
                {permissionError}
              </AppText>
              <View style={styles.errorActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open device settings"
                  onPress={() => void Linking.openSettings().catch(() => {})}
                  style={({ pressed }) => [
                    styles.errorAction,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <AppText variant="caption" color="#ffffff" weight="700">
                    Open settings
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Join without camera and microphone"
                  onPress={() => void requestDevices("view-only")}
                  style={({ pressed }) => [
                    styles.errorAction,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <AppText variant="caption" color="#ffffff" weight="700">
                    Join to watch & listen
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      <JitsiMeeting
        key={`${room}:${mode}`}
        room={room}
        serverURL={SERVER_URL}
        config={config}
        flags={FLAGS}
        userInfo={userInfo}
        eventListeners={eventListeners}
        style={styles.meeting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: STAGE_BG },
  meeting: { flex: 1, backgroundColor: STAGE_BG },
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 10,
  },
  gateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 6,
  },
  gateCopy: { maxWidth: 320, lineHeight: 20 },
  gateButtons: { width: "100%", maxWidth: 360, gap: 10, marginTop: 14 },
  stageButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stageButtonOutline: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  stageButtonQuiet: { backgroundColor: "transparent" },
  shareHint: {
    width: "100%",
    maxWidth: 360,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
  },
  shareHintText: { flexShrink: 1 },
  errorBox: {
    width: "100%",
    maxWidth: 360,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(240,167,158,0.14)",
    gap: 8,
  },
  errorActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  errorAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
