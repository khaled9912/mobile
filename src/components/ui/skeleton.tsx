import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
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

export const PageHeaderSkeleton = ({
  eyebrow = true,
  subtitle = true,
  titleLines = 1,
}: {
  eyebrow?: boolean;
  subtitle?: boolean;
  titleLines?: 1 | 2;
}) => (
  <View style={styles.pageHeader}>
    {eyebrow ? <Skeleton width={104} height={10} /> : null}
    <Skeleton
      width="78%"
      height={28}
      style={eyebrow ? styles.gapMd : undefined}
    />
    {titleLines === 2 ? (
      <Skeleton width="54%" height={28} style={styles.gapSm} />
    ) : null}
    {subtitle ? (
      <>
        <Skeleton width="92%" height={12} style={styles.gapLg} />
        <Skeleton width="64%" height={12} style={styles.gapSm} />
      </>
    ) : null}
  </View>
);

export const SectionHeaderSkeleton = ({
  withAction = true,
}: {
  withAction?: boolean;
}) => (
  <View style={styles.sectionRow}>
    <Skeleton width={168} height={22} />
    {withAction ? <Skeleton width={92} height={30} radius={999} /> : null}
  </View>
);

export const TextCardSkeleton = ({
  lines = 3,
  action = false,
}: {
  lines?: number;
  action?: boolean;
}) => {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.border, borderRadius: radius.lg },
      ]}
    >
      <Skeleton width="44%" height={16} />
      {Array.from({ length: Math.max(0, lines - 1) }, (_, index) => (
        <Skeleton
          key={index}
          width={index % 2 ? "58%" : "86%"}
          height={11}
          style={styles.gap}
        />
      ))}
      {action ? <Skeleton height={38} radius={999} style={styles.action} /> : null}
    </View>
  );
};

export const PersonRowSkeleton = ({ avatarSize = 52 }: { avatarSize?: number }) => {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        styles.person,
        { borderColor: colors.border, borderRadius: radius.lg },
      ]}
    >
      <Skeleton width={avatarSize} height={avatarSize} radius={avatarSize / 2} />
      <View style={styles.personCopy}>
        <Skeleton width="58%" height={17} />
        <Skeleton width="38%" height={11} style={styles.gap} />
        <Skeleton width="72%" height={11} style={styles.gap} />
      </View>
    </View>
  );
};

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
  pageHeader: { marginBottom: 24 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 16,
  },
  person: { flexDirection: "row", alignItems: "center", gap: 14 },
  personCopy: { flex: 1 },
  lesson: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  gapSm: { marginTop: 8 },
  gap: { marginTop: 10 },
  gapMd: { marginTop: 12 },
  gapLg: { marginTop: 14 },
  action: { marginTop: 16 },
});
