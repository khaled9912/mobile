import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "./app-text";

type Props = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
};

export const PageHeader = ({ title, eyebrow, subtitle, right }: Props) => {
  const { spacing } = useTheme();
  return (
    <View style={[styles.wrapper, { marginBottom: spacing.xl }]}>
      <View style={styles.row}>
        <View style={styles.copy}>
          {eyebrow ? (
            <AppText variant="eyebrow" color="gold">
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="h1" style={eyebrow ? styles.titleGap : undefined}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" color="muted" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
};

export const SectionHeader = ({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) => {
  const { spacing } = useTheme();
  return (
    <View style={[styles.sectionRow, { marginBottom: spacing.md }]}>
      <AppText variant="h2">{title}</AppText>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  copy: { flex: 1 },
  right: { paddingTop: 2 },
  titleGap: { marginTop: 6 },
  subtitle: { marginTop: 8, lineHeight: 20 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
