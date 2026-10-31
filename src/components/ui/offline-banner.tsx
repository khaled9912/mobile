import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { AppText } from "./app-text";

export const OfflineBanner = ({ bottomOffset = 0 }: { bottomOffset?: number }) => {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        {
          bottom: insets.bottom + bottomOffset,
          backgroundColor: colors.card,
          borderColor: colors.warning,
          borderRadius: radius.pill,
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
      <AppText variant="caption" weight="600">
        You&apos;re offline. Showing saved information.
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth * 2,
    zIndex: 1000,
    elevation: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
