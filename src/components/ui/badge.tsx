import { StyleSheet, View } from "react-native";
import { useTheme } from "@/providers/theme-provider";
import type { Tone } from "@/lib/status";
import { AppText } from "./app-text";

type Props = {
  label: string;
  tone?: Tone;
};

export const Badge = ({ label, tone = "neutral" }: Props) => {
  const { colors, radius } = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceMuted, fg: colors.muted },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const palette = map[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderRadius: radius.pill },
      ]}
    >
      <AppText variant="caption" weight="700" color={palette.fg}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
