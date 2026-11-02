import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Card } from "./card";
import { AppText } from "./app-text";

export const StatCard = ({
  label,
  value,
  hint,
  style,
}: {
  label: string;
  value: string | number;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <Card style={[styles.stat, style]}>
    <AppText variant="caption" color="muted" weight="600">
      {label}
    </AppText>
    <AppText variant="h1" color="link">
      {value}
    </AppText>
    {hint ? (
      <AppText variant="caption" color="muted">
        {hint}
      </AppText>
    ) : null}
  </Card>
);

export const InfoRow = ({
  label,
  value,
  accessory,
}: {
  label: string;
  value: ReactNode;
  accessory?: ReactNode;
}) => (
  <View style={styles.row}>
    <AppText variant="small" color="muted">
      {label}
    </AppText>
    <View style={styles.value}>
      {typeof value === "string" ? (
        <AppText variant="small" weight="600" align="right">
          {value}
        </AppText>
      ) : (
        value
      )}
      {accessory}
    </View>
  </View>
);

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: 140, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  value: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
});
