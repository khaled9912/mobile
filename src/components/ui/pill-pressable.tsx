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
  /** Press wash override for surfaces where the brand wash would not fit. */
  pressedBackgroundColor?: string;
  pressedBorderColor?: string;
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
  pressedBackgroundColor,
  pressedBorderColor,
}: Props) => {
  const { colors, radius } = useTheme();
  const wash = pressedBackgroundColor ?? colors.brandSoft;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: wash, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: radius.pill },
        style,
        pressed && {
          backgroundColor: wash,
          borderColor: pressedBorderColor ?? colors.brand,
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
    overflow: "hidden",
  },
});
