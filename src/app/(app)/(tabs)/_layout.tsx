import { Tabs } from "expo-router";
import {
  canReviewLessons,
  isAdminRole,
  useAuth,
} from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

const TabLayout = () => {
  const { colors } = useTheme();
  const { role } = useAuth();
  const isStudent = role === "student";
  const isAdmin = isAdminRole(role);
  const isReviewer = canReviewLessons(role);

  // The visible bar lives in (app)/_layout so it also covers stack screens.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen
        name="book"
        options={{ href: isStudent ? undefined : null }}
      />
      <Tabs.Screen
        name="requests"
        options={{ href: isStudent || isAdmin ? undefined : null }}
      />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen
        name="reviews"
        options={{ href: isReviewer ? undefined : null }}
      />
      <Tabs.Screen name="people" options={{ href: isAdmin ? undefined : null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
};

export default TabLayout;
