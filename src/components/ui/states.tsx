import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "./app-text";
import { Button } from "./button";

export const LoadingView = ({ label = "Loading…" }: { label?: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
      <AppText color="muted" style={styles.gap}>
        {label}
      </AppText>
    </View>
  );
};

export const EmptyState = ({
  icon = "leaf-outline",
  title,
  body,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: ReactNode;
}) => {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.empty,
        {
          borderColor: colors.border,
          borderRadius: radius.lg,
          backgroundColor: colors.card,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.brandSoft }]}>
        <Ionicons name={icon} size={24} color={colors.link} />
      </View>
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="small" color="muted" align="center">
          {body}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
};

export const ErrorView = ({
  error,
  onRetry,
  title = "Something went wrong",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) => {
  const { colors, radius } = useTheme();
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Please try again.";
  return (
    <View
      style={[
        styles.empty,
        {
          borderColor: colors.danger,
          borderRadius: radius.lg,
          backgroundColor: colors.dangerSoft,
        },
      ]}
    >
      <Ionicons name="alert-circle-outline" size={26} color={colors.danger} />
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      <AppText variant="small" color="muted" align="center">
        {message}
      </AppText>
      {onRetry ? (
        <View style={styles.action}>
          <Button title="Try again" variant="secondary" size="sm" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", padding: 32 },
  gap: { marginTop: 12 },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: "dashed",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  action: { marginTop: 6 },
});
