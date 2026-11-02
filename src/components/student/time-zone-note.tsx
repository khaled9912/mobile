import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/providers/theme-provider";
import { timeZoneLabel } from "@/lib/weekly-time";

export const TimeZoneNote = ({
  zone,
  sourceZone,
}: {
  zone: string;
  sourceZone?: string | null;
}) => {
  const { colors } = useTheme();
  if (!zone) return null;

  return (
    <View style={styles.row}>
      <Ionicons name="globe-outline" size={14} color={colors.muted} />
      <AppText variant="caption" color="muted" style={styles.text}>
        Times shown in your time zone · {timeZoneLabel(zone)} ({zone})
        {sourceZone && sourceZone !== zone
          ? ` · teacher clock: ${sourceZone}`
          : ""}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  text: { flex: 1 },
});
