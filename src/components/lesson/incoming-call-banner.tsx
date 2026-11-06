import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";
import { useTheme } from "@/providers/theme-provider";
import type { LessonCall } from "@/api/types";

type Props = {
  call: LessonCall;
  onJoin: () => void;
  onDismiss: () => void;
};

/**
 * Sits above every screen, including the lesson room, because a call is only
 * useful to someone who is not in the room yet.
 */
export const IncomingCallBanner = ({ call, onJoin, onDismiss }: Props) => {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.layer, { paddingTop: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.brand,
            borderRadius: radius.lg,
          },
        ]}
      >
        <View style={styles.header}>
          <View
            style={[styles.pulse, { backgroundColor: colors.brandSoft }]}
          >
            <Ionicons name="call" size={20} color={colors.brand} />
          </View>
          <View style={styles.grow}>
            <AppText variant="h3" numberOfLines={2}>
              {call.callerName} is calling you
            </AppText>
            <AppText variant="caption" color="muted">
              {call.callerRole === "teacher"
                ? "Your teacher"
                : call.callerRole === "student"
                  ? "Your student"
                  : "The academy"}{" "}
              · called {formatTime(call.createdAt)}
            </AppText>
          </View>
        </View>
        <AppText variant="small" color="muted">
          {call.calleeRole === "student"
            ? "Join the lesson room to answer."
            : "Open the lesson room to answer."}
        </AppText>
        <View style={styles.actions}>
          <Button
            title="Join the lesson"
            onPress={onJoin}
            icon="videocam"
            style={styles.grow}
          />
          <Button
            title="Not now"
            onPress={onDismiss}
            variant="ghost"
            accessibilityHint="Stop the ringing without opening the lesson"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-start",
    alignItems: "stretch",
    paddingHorizontal: 16,
    zIndex: 2500,
    elevation: 2500,
  },
  card: {
    borderWidth: 2,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  pulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
});
