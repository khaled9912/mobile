import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "./app-text";

type Tone = "info" | "success" | "error" | "warning";

const meta: Record<
  Tone,
  { icon: keyof typeof Ionicons.glyphMap; colorKey: "info" | "success" | "danger" | "warning"; bgKey: "infoSoft" | "successSoft" | "dangerSoft" | "warningSoft" }
> = {
  info: { icon: "information-circle-outline", colorKey: "info", bgKey: "infoSoft" },
  success: {
    icon: "checkmark-circle-outline",
    colorKey: "success",
    bgKey: "successSoft",
  },
  error: { icon: "alert-circle-outline", colorKey: "danger", bgKey: "dangerSoft" },
  warning: { icon: "warning-outline", colorKey: "warning", bgKey: "warningSoft" },
};

export const Notice = ({
  message,
  tone = "info",
  title,
}: {
  message: string;
  tone?: Tone;
  title?: string;
}) => {
  const { colors, radius } = useTheme();
  const config = meta[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        { backgroundColor: colors[config.bgKey], borderRadius: radius.md },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={20}
        color={colors[config.colorKey]}
        style={styles.icon}
      />
      <View style={styles.copy}>
        {title ? (
          <AppText variant="label" color={config.colorKey}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="small" color="text">
          {message}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  icon: { marginTop: 1 },
  copy: { flex: 1, gap: 2 },
});
