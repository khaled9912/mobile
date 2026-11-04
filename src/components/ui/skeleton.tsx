import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/providers/theme-provider";

type Props = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pulsing placeholder for content that has not arrived yet. */
export const Skeleton = ({ width = "100%", height = 16, radius, style }: Props) => {
  const { colors, radius: themeRadius } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius ?? themeRadius.sm,
          backgroundColor: colors.surfaceMuted,
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.55, 1],
          }),
        },
        style,
      ]}
    />
  );
};

export const StatRowSkeleton = ({ count = 4 }: { count?: number }) => (
  <Animated.View style={styles.row}>
    {Array.from({ length: count }, (_, index) => (
      <Skeleton key={index} height={88} radius={18} style={styles.stat} />
    ))}
  </Animated.View>
);

export const LessonCardSkeleton = () => {
  const { colors } = useTheme();
  return (
    <Animated.View style={[styles.lesson, { borderColor: colors.border }]}>
      <Skeleton width={70} height={10} />
      <Skeleton width="60%" height={22} style={styles.gap} />
      <Skeleton width="40%" height={12} style={styles.gap} />
      <Skeleton height={40} radius={999} style={styles.action} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  block: { overflow: "hidden" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flex: 1, minWidth: 140 },
  lesson: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  gap: { marginTop: 10 },
  action: { marginTop: 16 },
});
