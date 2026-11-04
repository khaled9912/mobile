import { StyleSheet, View } from "react-native";
import { router, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { PillPressable } from "@/components/ui/pill-pressable";
import {
  canReviewLessons,
  isAdminRole,
  useAuth,
} from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

/**
 * Height of the floating bar above the bottom safe-area inset. Screens that
 * position something above the bar (the offline banner) use TAB_BAR_OFFSET.
 */
export const TAB_BAR_CONTENT_HEIGHT = 58;
export const TAB_BAR_OFFSET = TAB_BAR_CONTENT_HEIGHT + 16;

type TabKey =
  | "home"
  | "book"
  | "requests"
  | "schedule"
  | "reviews"
  | "people"
  | "profile";

type TabDef = {
  key: TabKey;
  route:
    | "/"
    | "/book"
    | "/requests"
    | "/schedule"
    | "/reviews"
    | "/people"
    | "/profile";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const ALL_TABS: TabDef[] = [
  {
    key: "home",
    route: "/",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    key: "book",
    route: "/book",
    label: "Book",
    icon: "library-outline",
    activeIcon: "library",
  },
  {
    key: "requests",
    route: "/requests",
    label: "Changes",
    icon: "swap-horizontal-outline",
    activeIcon: "swap-horizontal",
  },
  {
    key: "schedule",
    route: "/schedule",
    label: "Schedule",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  {
    key: "reviews",
    route: "/reviews",
    label: "Reviews",
    icon: "reader-outline",
    activeIcon: "reader",
  },
  {
    key: "people",
    route: "/people",
    label: "People",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    key: "profile",
    route: "/profile",
    label: "Profile",
    icon: "person-outline",
    activeIcon: "person",
  },
];

// Internal stack screens keep the bar and highlight the section they belong to.
const sectionTab = (
  section: string | undefined,
  role: string | null
): TabKey | null => {
  switch (section) {
    case "teachers":
      if (role === "student") return "book";
      if (role === "admin" || role === "super_admin") return "people";
      return "home";
    case "lesson":
    case "availability":
      return "schedule";
    case "change-time":
      return "requests";
    case "profile":
    case "contact":
      return "profile";
    case "reviews":
      return "reviews";
    case "people":
    case "contact-submissions":
      return "people";
    default:
      return null;
  }
};

export const PersistentTabBar = () => {
  const { colors, radius, scheme } = useTheme();
  const { role } = useAuth();
  const insets = useSafeAreaInsets();
  const segments: string[] = useSegments();
  const navBackground = scheme === "dark" ? colors.tabBar : "#10283a";
  const navBorder = scheme === "dark" ? colors.border : "#173d3f";
  const navMuted = "rgba(255,255,255,0.66)";

  const isStudent = role === "student";
  const isAdmin = isAdminRole(role);
  const isSupport = role === "support";

  const tabs = ALL_TABS.filter((tab) => {
    if (tab.key === "home") return !isSupport;
    if (tab.key === "book") return isStudent;
    if (tab.key === "requests") return isStudent || isAdmin;
    if (tab.key === "schedule") return !isSupport;
    if (tab.key === "reviews") return canReviewLessons(role);
    if (tab.key === "people") return isAdmin;
    return true;
  });

  const tabSegment = segments[1] === "(tabs)" ? (segments[2] ?? "index") : null;
  const activeTab: TabKey =
    tabSegment === null
      ? sectionTab(segments[1], role) ?? "home"
      : tabSegment === "index"
        ? "home"
        : (tabSegment as TabKey);
  const active = tabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : (tabs[0]?.key ?? "home");

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: navBackground,
            borderColor: navBorder,
            borderRadius: radius.pill,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const color = selected ? colors.onBrand : navMuted;
          const content = (
            <>
              <Ionicons
                name={selected ? tab.activeIcon : tab.icon}
                size={20}
                color={color}
              />
              <AppText
                variant="caption"
                weight="700"
                color={color}
                numberOfLines={1}
                style={styles.label}
              >
                {tab.label}
              </AppText>
            </>
          );

          if (selected) {
            return (
              <View
                key={tab.key}
                accessible
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
                accessibilityLabel={tab.label}
                style={[
                  styles.item,
                  styles.itemActive,
                  {
                    backgroundColor: colors.brand,
                    borderColor: colors.brandPressed,
                  },
                ]}
              >
                {content}
              </View>
            );
          }

          return (
            <PillPressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={tab.label}
              onPress={() => router.navigate(tab.route)}
              pressedBackgroundColor="rgba(255,255,255,0.14)"
              pressedBorderColor="rgba(255,255,255,0.32)"
              style={styles.item}
            >
              {content}
            </PillPressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: TAB_BAR_CONTENT_HEIGHT,
    gap: 3,
    padding: 5,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  itemActive: { borderWidth: 1, borderRadius: 999 },
  label: { fontSize: 10 },
});
