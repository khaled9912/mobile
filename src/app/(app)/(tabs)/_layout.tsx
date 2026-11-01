import { Tabs } from "expo-router";
import { useAuth, isAdminRole } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

const TabLayout = () => {
  const { colors } = useTheme();
  const { role } = useAuth();
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = isAdminRole(role);

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
        options={{ href: isTeacher || isAdmin ? undefined : null }}
      />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="people" options={{ href: isAdmin ? undefined : null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
};

export default TabLayout;
