import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/providers/theme-provider";

type Props = {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

/**
 * Pressable with the app's "pill" feedback: a soft brand wash plus a visible
 * border while pressed, matching the bordered buttons.
 */
export const PillPressable = ({
  children,
  onPress,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityState,
  style,
  disabled,
}: Props) => {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: colors.brandSoft }}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: radius.pill },
        style,
        pressed && {
          backgroundColor: colors.brandSoft,
          borderColor: colors.brand,
        },
      ]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
});
