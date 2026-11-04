import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { useTheme } from "@/providers/theme-provider";

/**
 * A figure in dua beneath an arch. Deliberately abstract — no faces — and
 * gently animated so the anonymous landing screen feels calm rather than static.
 */
export const PrayerArt = ({
  width = 168,
  height = 148,
}: {
  width?: number;
  height?: number;
}) => {
  const { colors } = useTheme();
  const [drift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const float = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const glow = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.2],
  });

  return (
    <View style={{ width, height }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: colors.gold,
            opacity: glow,
            transform: [
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.05] }) },
            ],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY: float }] }}>
        <Svg width={width} height={height} viewBox="0 0 200 176">
          <Ellipse cx="100" cy="160" rx="74" ry="9" fill={colors.brand} opacity={0.12} />
          <Path
            d="M46 148 V84 a54 54 0 0 1 108 0 v64"
            stroke={colors.brand}
            strokeWidth={3}
            fill="none"
            opacity={0.35}
          />
          <Circle cx="100" cy="10" r="5" fill={colors.gold} opacity={0.55} />
          <Circle cx="158" cy="36" r="3" fill={colors.gold} opacity={0.45} />

          <G>
            <Rect
              x="56"
              y="132"
              width="88"
              height="10"
              rx="5"
              fill={colors.gold}
              opacity={0.7}
            />
            <Path
              d="M78 78 q-14 8 -18 30 l6 6 q8 -16 22 -22 Z"
              fill={colors.brand}
              opacity={0.85}
            />
            <Path
              d="M122 78 q14 8 18 30 l-6 6 q-8 -16 -22 -22 Z"
              fill={colors.brand}
              opacity={0.85}
            />
            <Circle cx="61" cy="118" r="5" fill={colors.brand} opacity={0.85} />
            <Circle cx="139" cy="118" r="5" fill={colors.brand} opacity={0.85} />
            <Path
              d="M100 52 c-13 0 -22 9 -24 22 l-4 58 h56 l-4 -58 c-2 -13 -11 -22 -24 -22 Z"
              fill={colors.brand}
            />
            <Circle cx="100" cy="39" r="13" fill={colors.brand} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    top: 28,
    left: 58,
    width: 84,
    height: 84,
    borderRadius: 999,
  },
});
