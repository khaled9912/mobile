import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { PillPressable } from "@/components/ui/pill-pressable";
import { openWhatsApp } from "@/lib/whatsapp";
import {
  NotificationsBell,
  NotificationsSheet,
} from "@/components/notifications/notifications-sheet";
import { PrayerArt } from "@/components/onboarding/prayer-art";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import type { ThemeColors } from "@/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;
type TabKey = "home" | "teachers";
type Tone = "brand" | "gold" | "info" | "success";

type Option = {
  key: string;
  title: string;
  body: string;
  icon: IconName;
  tone: Tone;
  tag: string;
};

const CARD_HEIGHT = 356;
const CARD_PEEK_X = 24;
const CARD_PEEK_Y = 13;
const CARD_PEEK_SCALE = 0.045;
const STACK_WIDTH = 52;

const OPTIONS: Option[] = [
  {
    key: "lessons",
    title: "Live 1-to-1 lessons",
    body: "Meet a dedicated teacher in a private classroom built around your recitation.",
    icon: "videocam-outline",
    tone: "brand",
    tag: "Live",
  },
  {
    key: "tajweed",
    title: "Tajweed coaching",
    body: "Correct your makharij and rhythm in real time with guided recitation.",
    icon: "mic-outline",
    tone: "gold",
    tag: "Recitation",
  },
  {
    key: "hifz",
    title: "A hifz plan that fits",
    body: "A memorisation path paced around your week, reviewed every lesson.",
    icon: "book-outline",
    tone: "info",
    tag: "Hifz",
  },
  {
    key: "reports",
    title: "Progress you can follow",
    body: "A written report after every lesson, on every device you use.",
    icon: "stats-chart-outline",
    tone: "success",
    tag: "Reports",
  },
];

const TABS: {
  key: TabKey;
  label: string;
  icon: IconName;
  activeIcon: IconName;
}[] = [
  { key: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  {
    key: "teachers",
    label: "Teachers",
    icon: "people-outline",
    activeIcon: "people",
  },
];

const PROMISES: { label: string; icon: IconName }[] = [
  { label: "1-to-1 lessons", icon: "person-outline" },
  { label: "Ijazah teachers", icon: "ribbon-outline" },
  { label: "Flexible times", icon: "time-outline" },
  { label: "Written reports", icon: "document-text-outline" },
];

const PERKS: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Personal attention",
    body: "Individual lessons shaped around each learner's level, goals, and progress.",
    icon: "person-outline",
  },
  {
    title: "Flexible scheduling",
    body: "Pick your teacher's weekly times. Booking is instant and repeats every week.",
    icon: "calendar-outline",
  },
  {
    title: "A guided experience",
    body: "A clear weekly plan keeps students, teachers, and lesson times coordinated.",
    icon: "shield-checkmark-outline",
  },
];

const STEPS: { number: string; title: string; body: string }[] = [
  {
    number: "01",
    title: "Meet your teacher",
    body: "We connect each student with a dedicated teacher who understands their goals and learning pace.",
  },
  {
    number: "02",
    title: "Choose your weekly times",
    body: "See each teacher's weekly schedule and pick the times that fit your routine — as many as you need.",
  },
  {
    number: "03",
    title: "Learn one-to-one every week",
    body: "Your times lock in instantly and repeat every week. Join each lesson online, starting with a trial.",
  },
];

const useAnimatedValue = (initial: number) => {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
};

const accentFor = (colors: ThemeColors, tone: Tone) => {
  switch (tone) {
    case "gold":
      return { solid: colors.gold, soft: colors.goldSoft };
    case "info":
      return { solid: colors.info, soft: colors.infoSoft };
    case "success":
      return { solid: colors.success, soft: colors.successSoft };
    default:
      return { solid: colors.brand, soft: colors.brandSoft };
  }
};

const CardArt = ({
  icon,
  accent,
  index,
}: {
  icon: IconName;
  accent: { solid: string; soft: string };
  index: number;
}) => {
  const { colors } = useTheme();
  const drift = useAnimatedValue(0);

  useEffect(() => {
    const duration = 3200 + index * 480;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, index]);

  return (
    <View style={[styles.cardArt, { backgroundColor: accent.soft }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.artRing,
          styles.artRingLarge,
          {
            backgroundColor: accent.solid,
            opacity: drift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.16, 0.06],
            }),
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 18],
                }),
              },
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, -14],
                }),
              },
              {
                scale: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.16],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.artRing,
          styles.artRingSmall,
          {
            backgroundColor: accent.solid,
            opacity: drift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.18],
            }),
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, -18],
                }),
              },
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 12],
                }),
              },
              {
                scale: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1.12],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.iconBubble,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [3, -3],
                }),
              },
              {
                scale: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.04],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name={icon} size={54} color={accent.solid} />
      </Animated.View>
    </View>
  );
};

type PillButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline";
  icon?: IconName;
};

const PillButton = ({
  title,
  onPress,
  variant = "primary",
  icon,
}: PillButtonProps) => {
  const { colors, radius } = useTheme();
  const filled = variant === "primary";
  const fg = filled ? colors.onBrand : colors.brand;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      android_ripple={{
        color: filled ? "rgba(255,255,255,0.18)" : colors.brandSoft,
      }}
      style={({ pressed }) => [
        styles.cta,
        {
          borderRadius: radius.pill,
          backgroundColor: filled
            ? pressed
              ? colors.brandPressed
              : colors.brand
            : pressed
              ? colors.brandSoft
              : "transparent",
          borderColor: filled
            ? colors.brandPressed
            : pressed
              ? colors.brandPressed
              : colors.brand,
        },
      ]}
    >
      <AppText variant="button" weight="700" color={fg}>
        {title}
      </AppText>
      {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
    </Pressable>
  );
};

export const WelcomeExperience = () => {
  const { colors, radius, scheme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>("home");
  const [activeOption, setActiveOption] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const cardWidth = Math.min(width - 84, 340);
  const pan = useAnimatedValue(0);
  const settle = useAnimatedValue(0);
  const navBackground = scheme === "dark" ? colors.tabBar : "#10283a";
  const navBorder = scheme === "dark" ? colors.border : "#173d3f";
  const navMuted = "rgba(255,255,255,0.66)";

  const switchTab = (next: TabKey) => {
    setTab(next);
    setNotificationsOpen(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const openCard = () => router.push(user ? "/book" : "/signup");

  // Dots swap the deck instead of jumping: the front card folds back, the
  // chosen card comes forward, then the stack settles.
  const swapTo = (index: number) => {
    if (index === activeOption) return;
    Animated.timing(settle, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setActiveOption(index);
      Animated.spring(settle, {
        toValue: 0,
        tension: 120,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
  };

  const dismissCard = (direction: 1 | -1) => {
    Animated.timing(pan, {
      toValue: direction * (cardWidth + 80),
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      pan.setValue(0);
      settle.setValue(1);
      setActiveOption((prev) => (prev + 1) % OPTIONS.length);
      Animated.spring(settle, {
        toValue: 0,
        tension: 120,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
  };

  const cardPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => pan.setValue(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (
            Math.abs(gesture.dx) > cardWidth * 0.22 ||
            Math.abs(gesture.vx) > 0.4
          ) {
            dismissCard(gesture.dx >= 0 ? 1 : -1);
            return;
          }
          Animated.spring(pan, {
            toValue: 0,
            tension: 140,
            friction: 11,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: 0,
            tension: 140,
            friction: 11,
            useNativeDriver: true,
          }).start();
        },
      }),
    // dismissCard closes over cardWidth and the shared pan value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardWidth, pan]
  );

  const renderHome = () => (
    <View style={styles.section}>
      <View
        style={[
          styles.hero,
          { backgroundColor: colors.brandSoft, borderColor: colors.border },
        ]}
      >
        <View style={styles.heroCopy}>
          <AppText variant="caption" weight="700" color="gold">
            PERSONAL GUIDANCE
          </AppText>
          <AppText variant="h2">
            Grow your connection with the Qur&apos;an and Arabic.
          </AppText>
          <AppText variant="small" color="muted" style={styles.cardBody}>
            Learn with dedicated teachers through personal online lessons,
            flexible scheduling, and a learning experience built around you.
          </AppText>
        </View>
        <PrayerArt width={124} height={140} />
      </View>

      <View
        style={[
          styles.trust,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="shield-checkmark" size={16} color={colors.brand} />
        <AppText variant="caption" weight="700">
          Certified Qur&apos;an &amp; Arabic teachers
        </AppText>
      </View>

      <View
        style={[
          styles.stack,
          { width: cardWidth + STACK_WIDTH, height: CARD_HEIGHT + 30 },
        ]}
      >
        {(() => {
          const settleX = settle.interpolate({
            inputRange: [0, 1],
            outputRange: [0, CARD_PEEK_X],
          });
          const settleY = settle.interpolate({
            inputRange: [0, 1],
            outputRange: [0, CARD_PEEK_Y],
          });
          const settleScale = settle.interpolate({
            inputRange: [0, 1],
            outputRange: [0, CARD_PEEK_SCALE],
          });
          const revealScale = Animated.add(
            1,
            Animated.multiply(settleScale, -1)
          );

          return OPTIONS.map((option, index) => {
            const order =
              (index - activeOption + OPTIONS.length) % OPTIONS.length;
            if (order > 2) return null;
            const accent = accentFor(colors, option.tone);
            const front = order === 0;
            const transform = front
              ? [
                  { translateX: pan },
                  {
                    rotate: pan.interpolate({
                      inputRange: [-cardWidth, 0, cardWidth],
                      outputRange: ["-8deg", "0deg", "8deg"],
                    }),
                  },
                  { translateX: settleX },
                  { translateY: settleY },
                  { scale: revealScale },
                ]
              : [
                  {
                    translateX: Animated.add(
                      settleX,
                      order * CARD_PEEK_X
                    ),
                  },
                  {
                    translateY: Animated.add(
                      settleY,
                      order * CARD_PEEK_Y
                    ),
                  },
                  {
                    scale: Animated.add(
                      revealScale,
                      -order * CARD_PEEK_SCALE
                    ),
                  },
                ];

            return (
              <Animated.View
                key={option.key}
                style={[
                  styles.card,
                  {
                    width: cardWidth,
                    height: CARD_HEIGHT,
                    zIndex: 10 - order,
                    opacity: Animated.add(
                      1 - order * 0.08,
                      Animated.multiply(settle, -0.08)
                    ),
                    transform,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: colors.shadow,
                    elevation: 6 - order * 2,
                  },
                ]}
                {...(front ? cardPan.panHandlers : {})}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${option.title}. ${
                    user ? "Browse available teachers" : "Create an account"
                  }`}
                  accessibilityHint={
                    user ? "Opens the teacher directory" : "Opens sign up"
                  }
                  onPress={openCard}
                  style={styles.cardPress}
                >
                  <CardArt icon={option.icon} accent={accent} index={index} />
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.card,
                        borderColor: accent.solid,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight="700"
                      color={accent.solid}
                    >
                      {option.tag}
                    </AppText>
                  </View>

                  <View style={styles.cardCopy}>
                    <AppText variant="h2">{option.title}</AppText>
                    <AppText
                      variant="small"
                      color="muted"
                      style={styles.cardBody}
                    >
                      {option.body}
                    </AppText>
                  </View>
                </Pressable>
              </Animated.View>
            );
          });
        })()}
      </View>

      <View style={styles.dots}>
        {OPTIONS.map((option, index) => {
          const selected = index === activeOption;
          return (
            <Pressable
              key={option.key}
              onPress={() => swapTo(index)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Show ${option.title}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View
                style={[
                  styles.dot,
                  {
                    width: selected ? 24 : 8,
                    backgroundColor: selected
                      ? colors.brand
                      : colors.surfaceMuted,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <AppText variant="caption" color="muted" align="center">
        Swipe the card to see the next option
      </AppText>

      <View style={styles.actions}>
        <PillButton
          title="Get started"
          icon="arrow-forward"
          onPress={openCard}
        />
        <Pressable
          onPress={() => router.push("/login")}
          accessibilityRole="link"
          accessibilityLabel="Sign in"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppText variant="caption" color="muted" align="center">
            Already have an account?{" "}
            <AppText variant="caption" weight="700" color="brand">
              Sign in
            </AppText>
          </AppText>
        </Pressable>
      </View>

      <View style={styles.promise}>
        <AppText variant="h3" align="center">
          Our promise
        </AppText>
        <View style={styles.chips}>
          {PROMISES.map((item) => (
            <View
              key={item.label}
              style={[
                styles.chip,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name={item.icon} size={14} color={colors.brand} />
              <AppText variant="caption" weight="600">
                {item.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.steps}>
        <AppText variant="h3">Simple steps. Personal progress.</AppText>
        <AppText variant="small" color="muted">
          From your first sign-up to your next lesson, we make it easy to stay
          connected and keep learning.
        </AppText>
        {STEPS.map((step) => (
          <View
            key={step.number}
            style={[
              styles.stepCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <AppText variant="h3" color="gold" weight="800">
              {step.number}
            </AppText>
            <View style={styles.optionCopy}>
              <AppText variant="h3">{step.title}</AppText>
              <AppText variant="caption" color="muted">
                {step.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTeachers = () => (
    <View style={styles.section}>
      <View style={styles.pageIntro}>
        <AppText variant="h2">Meet your teacher</AppText>
        <AppText variant="small" color="muted">
          Every teacher is interviewed, tested, and reviewed by the academy
          before they join a single lesson.
        </AppText>
      </View>

      <View style={styles.list}>
        {PERKS.map((perk) => (
          <View
            key={perk.title}
            style={[
              styles.perkCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.perkIcon,
                { backgroundColor: colors.brandSoft },
              ]}
            >
              <Ionicons name={perk.icon} size={22} color={colors.brand} />
            </View>
            <View style={styles.optionCopy}>
              <AppText variant="h3">{perk.title}</AppText>
              <AppText variant="caption" color="muted">
                {perk.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PillButton
          title={user ? "Browse teachers" : "Create an account"}
          icon="arrow-forward"
          onPress={openCard}
        />
      </View>
    </View>
  );

  return (
    <>
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {tab === "home" ? null : (
            <PillPressable
              accessibilityLabel="Back to home"
              onPress={() => switchTab("home")}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </PillPressable>
          )}
        </View>

        <AppText style={[styles.brandTitle, { color: colors.text }]}>
          Ana Quran.
        </AppText>

        <View style={[styles.headerSide, styles.headerActions]}>
          <PillPressable
            accessibilityLabel="Chat on WhatsApp"
            onPress={openWhatsApp}
            style={styles.iconButton}
          >
            <Ionicons name="logo-whatsapp" size={19} color={colors.text} />
          </PillPressable>
          <NotificationsBell
            onPress={() => setNotificationsOpen((prev) => !prev)}
          />
        </View>
      </View>

      <View style={styles.greeting}>
        <AppText variant="caption" color="muted">
          Welcome to Ana Quran,
        </AppText>
        <View style={styles.greetingActions}>
          <PillPressable
            accessibilityLabel="Log in"
            onPress={() => router.push("/login")}
            style={styles.greetingLink}
          >
            <AppText variant="h3" weight="800">
              Log in
            </AppText>
          </PillPressable>
          <AppText variant="h3" weight="800" color="muted">
            or
          </AppText>
          <PillPressable
            accessibilityLabel="Sign up"
            onPress={openCard}
            style={styles.greetingLink}
          >
            <AppText variant="h3" weight="800">
              Sign up
            </AppText>
          </PillPressable>
        </View>
      </View>


      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === "home" ? renderHome() : renderTeachers()}
      </ScrollView>

      <View style={styles.navWrap}>
        <View
          style={[
            styles.navBar,
            {
              backgroundColor: navBackground,
              borderColor: navBorder,
              shadowColor: colors.shadow,
              borderRadius: radius.pill,
            },
          ]}
        >
          {TABS.map((item) => {
            const selected = tab === item.key;
            const label = (
              <>
                <Ionicons
                  name={selected ? item.activeIcon : item.icon}
                  size={20}
                  color={selected ? colors.onBrand : navMuted}
                />
                <AppText
                  variant="caption"
                  weight="700"
                  color={selected ? colors.onBrand : navMuted}
                  style={styles.navLabel}
                >
                  {item.label}
                </AppText>
              </>
            );

            if (selected) {
              return (
                <View
                  key={item.key}
                  accessible
                  accessibilityRole="tab"
                  accessibilityState={{ selected: true }}
                  accessibilityLabel={item.label}
                  style={[
                    styles.navItem,
                    styles.navItemActive,
                    {
                      backgroundColor: colors.brand,
                      borderColor: colors.brandPressed,
                    },
                  ]}
                >
                  {label}
                </View>
              );
            }

            return (
              <PillPressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: false }}
                accessibilityLabel={item.label}
                onPress={() => switchTab(item.key)}
                pressedBackgroundColor="rgba(255,255,255,0.14)"
                pressedBorderColor="rgba(255,255,255,0.32)"
                style={styles.navItem}
              >
                {label}
              </PillPressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
    <NotificationsSheet
      visible={notificationsOpen}
      onClose={() => setNotificationsOpen(false)}
    />
    </>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerSide: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerActions: { justifyContent: "flex-end", gap: 6 },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 2,
  },
  greetingActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginLeft: -6,
  },
  greetingLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 18,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: { flex: 1, gap: 2 },
  notificationClose: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
  },
  section: { gap: 16 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 4,
    paddingVertical: 10,
  },
  heroCopy: { flex: 1, gap: 6 },
  steps: { gap: 10, paddingTop: 8 },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  trust: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stack: { alignSelf: "center", position: "relative" },
  card: {
    position: "absolute",
    left: 0,
    top: 0,
    borderWidth: 1,
    borderRadius: 24,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardPress: { flex: 1 },
  cardArt: {
    flex: 1,
    margin: 12,
    marginBottom: 0,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artRing: { position: "absolute", borderRadius: 999 },
  artRingLarge: {
    width: 190,
    height: 190,
    top: -46,
    right: -44,
    opacity: 0.1,
  },
  artRingSmall: {
    width: 96,
    height: 96,
    bottom: -18,
    left: -14,
    opacity: 0.08,
  },
  iconBubble: {
    width: 112,
    height: 112,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    position: "absolute",
    top: 24,
    right: 24,
    zIndex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardCopy: { padding: 18, gap: 4 },
  cardBody: { lineHeight: 18 },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  dot: { height: 8, borderRadius: 999 },
  actions: { gap: 10 },
  cta: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  promise: { gap: 10, paddingTop: 4 },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pageIntro: { gap: 6 },
  list: { gap: 10 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCopy: { flex: 1, gap: 2 },
  perkCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  perkIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  moreCard: {
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  footer: { paddingTop: 6 },
  navWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 5,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  navItemActive: { borderWidth: 1, borderRadius: 999 },
  navLabel: { fontSize: 10 },
});
