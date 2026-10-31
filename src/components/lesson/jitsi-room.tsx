import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
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

const escapeForScript = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Mirrors the web Jitsi config so both clients land in the same room with the
 * same chrome and the same starting mute state.
 */
const buildHtml = (
  domain: string,
  room: string,
  displayName: string,
  mode: JoinMode
) => {
  const options = {
    roomName: room,
    width: "100%",
    height: "100%",
    userInfo: { displayName },
    configOverwrite: {
      prejoinPageEnabled: false,
      prejoinConfig: { enabled: false },
      enableWelcomePage: false,
      disableDeepLinking: true,
      deeplinking: { disabled: true },
      requireDisplayName: false,
      hideLoginButton: true,
      startWithAudioMuted: mode === "view-only",
      startWithVideoMuted: mode !== "audio-video",
      enableInsecureRoomNameWarning: false,
      // Screen sharing is not available inside a native WebView.
      toolbarButtons: ["microphone", "camera", "chat", "hangup"],
      disableReactions: true,
      disablePolls: true,
      disableWhiteboard: true,
      disableVirtualBackground: true,
      hideConferenceSubject: true,
      hideConferenceTimer: true,
      notifications: [],
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_BRAND_WATERMARK: false,
      SHOW_POWERED_BY: false,
      MOBILE_APP_PROMO: false,
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      DEFAULT_BACKGROUND: "#000000",
    },
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<style>
  html, body { height: 100%; margin: 0; background: ${STAGE_BG}; overflow: hidden; }
  #meet { height: 100%; width: 100%; }
</style>
</head>
<body>
<div id="meet"></div>
<script src="https://${domain}/external_api.js"></script>
<script>
(function () {
  function post(payload) {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    } catch (error) {}
  }
  try {
    var options = ${escapeForScript(options)};
    options.parentNode = document.getElementById("meet");
    var api = new JitsiMeetExternalAPI(${escapeForScript(domain)}, options);
    api.addEventListener("videoConferenceJoined", function () {
      post({ type: "joined" });
    });
    api.addEventListener("videoConferenceLeft", function () {
      post({ type: "left" });
    });
    api.addEventListener("readyToClose", function () {
      post({ type: "closed" });
    });
    api.addEventListener("errorOccurred", function (event) {
      var message = event && event.error && event.error.message;
      post({ type: "error", message: typeof message === "string" ? message : "" });
    });
  } catch (error) {
    post({ type: "load-error" });
  }
})();
</script>
</body>
</html>`;
};

export const JitsiRoom = ({ room, displayName, onJoined, onClose }: Props) => {
  const { colors, radius } = useTheme();
  const [mode, setMode] = useState<JoinMode | null>(null);
  const [pendingMode, setPendingMode] = useState<JoinMode | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting" | "joined" | "error">(
    "connecting"
  );
  const [attempt, setAttempt] = useState(0);
  const audioConfigured = useRef(false);
  const onJoinedRef = useRef(onJoined);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onJoinedRef.current = onJoined;
    onCloseRef.current = onClose;
  }, [onJoined, onClose]);

  useEffect(
    () => () => {
      if (!audioConfigured.current) return;
      void setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
      }).catch(() => {});
    },
    []
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

    try {
      await setAudioModeAsync({
        allowsRecording: nextMode !== "view-only",
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: "doNotMix",
      });
      audioConfigured.current = true;
    } catch {
      // The room still works with default audio settings.
    }

    setStatus("connecting");
    setMode(nextMode);
  };

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    let payload: unknown;
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!payload || typeof payload !== "object") return;
    const type = (payload as { type?: unknown }).type;

    if (type === "joined") {
      setStatus((current) => {
        if (current !== "joined") onJoinedRef.current?.();
        return "joined";
      });
    } else if (type === "left" || type === "closed") {
      onCloseRef.current();
    } else if (type === "error" || type === "load-error") {
      setStatus("error");
    }
  }, []);

  const html = useMemo(
    () =>
      mode ? buildHtml(JITSI_DOMAIN, room, displayName, mode) : "",
    [mode, room, displayName]
  );

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
            This is a private, unlisted lesson room — do not share it.
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
      <WebView
        key={attempt}
        source={{ html, baseUrl: `https://${JITSI_DOMAIN}` }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        setSupportMultipleWindows={false}
        style={styles.webview}
        containerStyle={styles.webview}
        onMessage={handleMessage}
        onError={() => setStatus("error")}
        onHttpError={() => setStatus("error")}
        allowsBackForwardNavigationGestures={false}
        bounces={false}
        overScrollMode="never"
      />

      {status === "connecting" ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
          <AppText variant="small" color="rgba(255,255,255,0.82)">
            Connecting to your lesson room…
          </AppText>
        </View>
      ) : null}

      {status === "error" ? (
        <View style={styles.overlay}>
          <Ionicons name="cloud-offline-outline" size={30} color="#ffffff" />
          <AppText variant="h3" color="#ffffff" align="center">
            Could not load the lesson room
          </AppText>
          <AppText
            variant="small"
            color="rgba(255,255,255,0.72)"
            align="center"
            style={styles.gateCopy}
          >
            Check your connection and try again. If it keeps failing, contact the
            academy.
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading the room again"
            onPress={() => {
              setStatus("connecting");
              setAttempt((value) => value + 1);
            }}
            style={({ pressed }) => [
              styles.stageButton,
              styles.stageButtonOutline,
              {
                borderRadius: radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="refresh" size={17} color="#ffffff" />
            <AppText variant="button" color="#ffffff">
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: STAGE_BG },
  webview: { flex: 1, backgroundColor: STAGE_BG },
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
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: STAGE_BG,
  },
});
