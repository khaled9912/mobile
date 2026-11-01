import { Pressable, StyleSheet, View } from "react-native";
import { router, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { isAdminRole, useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

/**
 * Height of the bar above the bottom safe-area inset. Screens that position
 * something above the bar (the offline banner) use this value.
 */
export const TAB_BAR_CONTENT_HEIGHT = 56;

type TabKey = "home" | "book" | "requests" | "schedule" | "people" | "profile";

type TabDef = {
  key: TabKey;
  route: "/" | "/book" | "/requests" | "/schedule" | "/people" | "/profile";
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
    case "people":
    case "contact-submissions":
      return "people";
    default:
      return null;
  }
};

export const PersistentTabBar = () => {
  const { colors } = useTheme();
  const { role } = useAuth();
  const insets = useSafeAreaInsets();
  const segments: string[] = useSegments();

  const isStudent = role === "student";
  const isAdmin = isAdminRole(role);

  const tabs = ALL_TABS.filter((tab) => {
    if (tab.key === "book") return isStudent;
    if (tab.key === "requests") return isStudent || isAdmin;
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
    : "home";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.row}>
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const color = selected ? colors.link : colors.muted;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
              android_ripple={{ color: colors.brandSoft }}
              onPress={() => router.navigate(tab.route)}
              style={styles.item}
            >
              <Ionicons
                name={selected ? tab.activeIcon : tab.icon}
                size={22}
                color={color}
              />
              <AppText
                variant="caption"
                weight="600"
                color={color}
                numberOfLines={1}
                style={styles.label}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, elevation: 8 },
  row: { flexDirection: "row", height: TAB_BAR_CONTENT_HEIGHT },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 2,
  },
  label: { fontSize: 11 },
});
