import { useRef, useState } from "react";
import {
  Alert,
  Linking,
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
import { useTheme } from "@/providers/theme-provider";
import type { ThemeColors } from "@/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;
type TabKey = "home" | "options" | "teachers" | "more";
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
  { key: "options", label: "Options", icon: "grid-outline", activeIcon: "grid" },
  {
    key: "teachers",
    label: "Teachers",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    key: "more",
    label: "More",
    icon: "ellipsis-horizontal-circle-outline",
    activeIcon: "ellipsis-horizontal-circle",
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
    title: "Certified and vetted",
    body: "Every teacher is interviewed, tested, and reviewed by the academy.",
    icon: "shield-checkmark-outline",
  },
  {
    title: "Ijazah in Hafs",
    body: "Learn with teachers who carry an authentic chain of recitation.",
    icon: "ribbon-outline",
  },
  {
    title: "English and Arabic",
    body: "Switch between languages as your confidence grows.",
    icon: "chatbubbles-outline",
  },
];

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

type Props = {
  onReplayIntro: () => void;
};

export const WelcomeExperience = ({ onReplayIntro }: Props) => {
  const { colors, radius, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>("home");
  const [activeOption, setActiveOption] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const cardWidth = Math.min(width - 56, 360);
  const navBackground = scheme === "dark" ? colors.tabBar : "#10283a";
  const navBorder = scheme === "dark" ? colors.border : "#173d3f";
  const navMuted = "rgba(255,255,255,0.66)";

  const switchTab = (next: TabKey) => {
    setTab(next);
    setNotificationsOpen(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleBack = () => {
    if (tab !== "home") {
      switchTab("home");
      return;
    }
    onReplayIntro();
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      "Assalamu alaikum, I'd like to know more about Ana Quran lessons."
    );
    void Linking.openURL(`whatsapp://send?text=${message}`).catch(() => {
      Alert.alert(
        "WhatsApp not available",
        "Install WhatsApp to chat with the academy."
      );
    });
  };

  const openSignup = () => router.push("/signup");

  const renderHome = () => (
    <View style={styles.section}>
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
          { width: cardWidth + 26, height: CARD_HEIGHT + 18 },
        ]}
      >
        {OPTIONS.map((option, index) => {
          const order = (index - activeOption + OPTIONS.length) % OPTIONS.length;
          if (order > 2) return null;
          const accent = accentFor(colors, option.tone);
          const front = order === 0;

          return (
            <Pressable
              key={option.key}
              disabled={!front}
              accessibilityRole="button"
              accessibilityLabel={`${option.title}. Show the next option`}
              accessibilityElementsHidden={!front}
              importantForAccessibility={front ? "auto" : "no-hide-descendants"}
              onPress={() =>
                setActiveOption((prev) => (prev + 1) % OPTIONS.length)
              }
              style={({ pressed }) => [
                styles.card,
                {
                  width: cardWidth,
                  height: CARD_HEIGHT,
                  zIndex: 10 - order,
                  opacity: 1 - order * 0.12,
                  transform: [
                    { translateX: order * 13 },
                    { translateY: order * 9 },
                    { scale: 1 - order * 0.04 },
                  ],
                  backgroundColor: pressed ? colors.brandSoft : colors.card,
                  borderColor: pressed ? colors.brand : colors.border,
                  shadowColor: colors.shadow,
                  elevation: 6 - order * 2,
                },
              ]}
            >
              <View style={[styles.cardArt, { backgroundColor: accent.soft }]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.artRing,
                    styles.artRingLarge,
                    { backgroundColor: accent.solid },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.artRing,
                    styles.artRingSmall,
                    { backgroundColor: accent.solid },
                  ]}
                />
                <View
                  style={[
                    styles.iconBubble,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={54}
                    color={accent.solid}
                  />
                </View>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.card,
                      borderColor: accent.solid,
                    },
                  ]}
                >
                  <AppText variant="caption" weight="700" color={accent.solid}>
                    {option.tag}
                  </AppText>
                </View>
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
          );
        })}
      </View>

      <View style={styles.dots}>
        {OPTIONS.map((option, index) => {
          const selected = index === activeOption;
          return (
            <Pressable
              key={option.key}
              onPress={() => setActiveOption(index)}
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
        Tap the card to browse the next option
      </AppText>

      <View style={styles.actions}>
        <PillButton
          title="Get started"
          icon="arrow-forward"
          onPress={openSignup}
        />
        <PillButton
          title="View all options"
          variant="outline"
          onPress={() => switchTab("options")}
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
    </View>
  );

  const renderOptions = () => (
    <View style={styles.section}>
      <View style={styles.pageIntro}>
        <AppText variant="h1">All options</AppText>
        <AppText variant="body" color="muted">
          Everything that comes with an Ana Quran membership. Tap one to preview
          it on the home card.
        </AppText>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((option, index) => {
          const accent = accentFor(colors, option.tone);
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                setActiveOption(index);
                switchTab("home");
              }}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${option.title}`}
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor: pressed ? colors.brandSoft : colors.card,
                  borderColor: pressed ? colors.brand : colors.border,
                },
              ]}
            >
              <View style={[styles.optionIcon, { backgroundColor: accent.soft }]}>
                <Ionicons name={option.icon} size={22} color={accent.solid} />
              </View>
              <View style={styles.optionCopy}>
                <AppText variant="label">{option.title}</AppText>
                <AppText variant="caption" color="muted">
                  {option.body}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.muted}
              />
            </Pressable>
          );
        })}
      </View>

      <PillButton
        title="Get started"
        icon="arrow-forward"
        onPress={openSignup}
      />
    </View>
  );

  const renderTeachers = () => (
    <View style={styles.section}>
      <View style={styles.pageIntro}>
        <AppText variant="h1">Meet your teachers</AppText>
        <AppText variant="body" color="muted">
          One-to-one lessons with teachers the academy knows personally.
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
              style={[styles.perkIcon, { backgroundColor: colors.brandSoft }]}
            >
              <Ionicons name={perk.icon} size={22} color={colors.brand} />
            </View>
            <View style={styles.optionCopy}>
              <AppText variant="label">{perk.title}</AppText>
              <AppText variant="caption" color="muted">
                {perk.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <PillButton
        title="Create an account to meet them"
        icon="arrow-forward"
        onPress={openSignup}
      />
    </View>
  );

  const renderMore = () => (
    <View style={styles.section}>
      <View style={styles.pageIntro}>
        <AppText variant="h1">More</AppText>
        <AppText variant="body" color="muted">
          Sign in, create an account, or reach the academy team.
        </AppText>
      </View>

      <View style={styles.actions}>
        <PillButton
          title="Sign in"
          variant="outline"
          onPress={() => router.push("/login")}
        />
        <PillButton title="Create account" onPress={openSignup} />
      </View>

      <View
        style={[
          styles.moreCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <AppText variant="label">Chat with the academy</AppText>
        <AppText variant="caption" color="muted">
          Questions about lessons, teachers, or payments? Message us on
          WhatsApp.
        </AppText>
        <PillButton
          title="Open WhatsApp"
          variant="outline"
          icon="logo-whatsapp"
          onPress={openWhatsApp}
        />
      </View>

      <PillButton
        title="Replay introduction"
        variant="outline"
        icon="refresh"
        onPress={onReplayIntro}
      />

      <AppText
        variant="caption"
        color="muted"
        align="center"
        style={styles.footer}
      >
        Ana Quran · Qur&apos;an &amp; Arabic Academy
      </AppText>
    </View>
  );

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <PillPressable
            accessibilityLabel={
              tab === "home" ? "Replay introduction" : "Back to home"
            }
            onPress={handleBack}
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
          <PillPressable
            accessibilityLabel="Notifications"
            accessibilityState={{ expanded: notificationsOpen }}
            onPress={() => setNotificationsOpen((prev) => !prev)}
            style={styles.iconButton}
          >
            <Ionicons
              name="notifications-outline"
              size={19}
              color={colors.text}
            />
            <View
              style={[
                styles.bellDot,
                {
                  backgroundColor: colors.danger,
                  borderColor: colors.background,
                },
              ]}
            />
          </PillPressable>
        </View>
      </View>

      <View style={styles.welcomeRow}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.brand,
              borderColor: colors.brandPressed,
            },
          ]}
        >
          <AppText weight="800" color={colors.onBrand} style={styles.avatarText}>
            AQ
          </AppText>
        </View>
        <View style={styles.welcomeCopy}>
          <AppText variant="caption" color="muted">
            Welcome back,
          </AppText>
          <AppText variant="h3" weight="800">
            anaquran
          </AppText>
        </View>
        <View
          style={[
            styles.livePill,
            { backgroundColor: colors.brandSoft, borderColor: colors.border },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: colors.brand }]} />
          <AppText variant="caption" weight="700" color="brand">
            Live 1:1
          </AppText>
        </View>
      </View>

      {notificationsOpen ? (
        <View
          style={[
            styles.notification,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.notificationIcon,
              { backgroundColor: colors.brandSoft },
            ]}
          >
            <Ionicons name="sparkles" size={16} color={colors.brand} />
          </View>
          <View style={styles.notificationCopy}>
            <AppText variant="label">Welcome to Ana Quran</AppText>
            <AppText variant="caption" color="muted">
              Your first lesson is one step away. Create an account to book it.
            </AppText>
          </View>
          <PillPressable
            accessibilityLabel="Dismiss notification"
            onPress={() => setNotificationsOpen(false)}
            style={styles.notificationClose}
          >
            <Ionicons name="close" size={15} color={colors.muted} />
          </PillPressable>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === "home"
          ? renderHome()
          : tab === "options"
            ? renderOptions()
            : tab === "teachers"
              ? renderTeachers()
              : renderMore()}
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
                style={styles.navItem}
              >
                {label}
              </PillPressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
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
  bellDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarText: { fontSize: 13 },
  welcomeCopy: { flex: 1 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 999 },
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
    top: 12,
    right: 12,
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
