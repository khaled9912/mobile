import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "./app-text";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  size?: "md" | "sm";
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export const Button = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  size = "md",
  style,
  accessibilityHint,
}: Props) => {
  const { colors, radius } = useTheme();
  const blocked = disabled || loading;

  const background =
    variant === "primary"
      ? colors.brand
      : variant === "secondary"
        ? colors.card
        : variant === "danger"
          ? colors.dangerSoft
          : "transparent";
  const borderColor =
    variant === "secondary" ? colors.border : "transparent";
  const textColor =
    variant === "primary"
      ? colors.onBrand
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.text
          : colors.link;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.18)" }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          borderWidth: variant === "secondary" ? StyleSheet.hairlineWidth * 2 : 1,
          borderRadius: radius.md,
          paddingVertical: size === "sm" ? 9 : 14,
          paddingHorizontal: size === "sm" ? 14 : 18,
          opacity: blocked ? 0.55 : pressed ? 0.88 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : icon ? (
          <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={textColor} />
        ) : null}
        <AppText
          variant={size === "sm" ? "small" : "button"}
          weight="700"
          color={textColor}
        >
          {title}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", minHeight: 44 },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
