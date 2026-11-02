import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { BrandMark } from "@/components/ui/brand";
import { useTheme } from "@/providers/theme-provider";

const PRODUCT = "Ana Quran";
const SUBTITLE = "Quran & Arabic Academy";
const TICK_MS = 32;
const PRODUCT_END = PRODUCT.length * 3;
const SUBTITLE_START = PRODUCT_END + 8;
const SUBTITLE_END = SUBTITLE_START + Math.ceil(SUBTITLE.length * 1.4);
const TOTAL_TICKS = SUBTITLE_END + 10;

type Props = {
  onDone: () => void;
};

export const LaunchIntro = ({ onDone }: Props) => {
  const { colors } = useTheme();
  const [tick, setTick] = useState(0);
  const [caretOn, setCaretOn] = useState(true);
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.86));
  const [screenOpacity] = useState(() => new Animated.Value(1));
  const finished = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    const ticker = setInterval(() => {
      setTick((prev) => Math.min(prev + 1, TOTAL_TICKS));
    }, TICK_MS);
    const caret = setInterval(() => setCaretOn((prev) => !prev), 450);

    return () => {
      clearInterval(ticker);
      clearInterval(caret);
    };
  }, [logoOpacity, logoScale]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 320,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished: done }) => {
      if (done) onDone();
    });
  }, [onDone, screenOpacity]);

  useEffect(() => {
    if (tick < TOTAL_TICKS) return;
    const timeout = setTimeout(finish, 650);
    return () => clearTimeout(timeout);
  }, [finish, tick]);

  const productChars = Math.min(PRODUCT.length, Math.floor(tick / 3));
  const subtitleChars = Math.min(
    SUBTITLE.length,
    Math.max(0, Math.floor((tick - SUBTITLE_START) / 1.4))
  );
  const typing = subtitleChars < SUBTITLE.length;
  const progress = Math.min(1, tick / TOTAL_TICKS);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip introduction"
        accessibilityHint="Continues to the welcome screen"
        onPress={finish}
        style={[styles.root, { backgroundColor: colors.background }]}
      >
        <View
          pointerEvents="none"
          style={[styles.orb, styles.orbTop, { backgroundColor: colors.brandSoft }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.orb,
            styles.orbBottom,
            { backgroundColor: colors.goldSoft },
          ]}
        />

        <SafeAreaView
          edges={["top", "bottom", "left", "right"]}
          style={styles.safe}
        >
          <View style={styles.center}>
            <Animated.View
              style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}
            >
              <BrandMark size={104} />
            </Animated.View>

            <View style={styles.wordRow}>
              {PRODUCT.split("").map((char, index) => (
                <AppText
                  key={`${char}-${index}`}
                  weight="800"
                  style={[
                    styles.wordmark,
                    { opacity: index < productChars ? 1 : 0 },
                  ]}
                >
                  {char === " " ? "\u00A0" : char}
                </AppText>
              ))}
            </View>

            <View style={styles.subtitleRow}>
              <AppText variant="label" color="muted" style={styles.subtitle}>
                {SUBTITLE.slice(0, subtitleChars)}
              </AppText>
              <AppText
                variant="label"
                color="brand"
                style={[
                  styles.caret,
                  { opacity: typing && caretOn ? 1 : 0 },
                ]}
              >
                |
              </AppText>
            </View>

            <View
              style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.round(progress * 100)}%` as DimensionValue,
                    backgroundColor: colors.brand,
                  },
                ]}
              />
            </View>
          </View>

          <AppText variant="caption" color="muted" align="center">
            Tap to skip
          </AppText>
        </SafeAreaView>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  safe: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 28,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  wordRow: { flexDirection: "row", alignItems: "flex-end" },
  wordmark: { fontSize: 42, lineHeight: 50, letterSpacing: -1 },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  caret: { fontSize: 16, marginLeft: 2 },
  track: {
    width: 148,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
  },
  fill: { height: 4, borderRadius: 999 },
  orb: { position: "absolute", borderRadius: 999, opacity: 0.7 },
  orbTop: { width: 300, height: 300, top: -90, right: -110 },
  orbBottom: { width: 260, height: 260, bottom: -90, left: -110 },
});
