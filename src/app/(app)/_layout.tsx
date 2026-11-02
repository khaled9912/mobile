import { Stack, useSegments } from "expo-router";
import { useTheme } from "@/providers/theme-provider";
import { OfflineBanner } from "@/components/ui/offline-banner";
import {
  PersistentTabBar,
  TAB_BAR_CONTENT_HEIGHT,
} from "@/components/navigation/persistent-tab-bar";
import { View, StyleSheet } from "react-native";

const AppLayout = () => {
  const { colors } = useTheme();
  const segments: string[] = useSegments();
  const fullScreen = segments[1] === "lesson";

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.flex}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: "minimal",
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="lesson/[id]"
            options={{ headerShown: false, gestureEnabled: true }}
          />
          <Stack.Screen name="teachers/[id]" options={{ title: "Teacher" }} />
          <Stack.Screen
            name="availability"
            options={{ title: "My availability" }}
          />
          <Stack.Screen name="payments" options={{ title: "Monthly payment" }} />
          <Stack.Screen name="earnings" options={{ title: "Monthly earnings" }} />
          <Stack.Screen
            name="change-time/[seriesId]"
            options={{ title: "Change weekly time" }}
          />
          <Stack.Screen name="profile/edit" options={{ title: "Edit profile" }} />
          <Stack.Screen
            name="profile/password"
            options={{ title: "Change password" }}
          />
          <Stack.Screen
            name="profile/reports"
            options={{ title: "Lesson reports" }}
          />
          <Stack.Screen
            name="reviews/[id]"
            options={{ title: "Lesson review" }}
          />
          <Stack.Screen
            name="reviews/weekly"
            options={{ title: "Weekly digest" }}
          />
          <Stack.Screen name="contact" options={{ title: "Contact the academy" }} />
          <Stack.Screen name="people/new" options={{ title: "New account" }} />
          <Stack.Screen
            name="people/assign"
            options={{ title: "Assign teacher" }}
          />
          <Stack.Screen
            name="people/support"
            options={{ title: "Support team" }}
          />
          <Stack.Screen
            name="people/availability/[teacherId]"
            options={{ title: "Weekly availability" }}
          />
          <Stack.Screen
            name="contact-submissions"
            options={{ title: "Contact messages" }}
          />
        </Stack>
      </View>
      {fullScreen ? null : <PersistentTabBar />}
      <OfflineBanner bottomOffset={fullScreen ? 8 : TAB_BAR_CONTENT_HEIGHT + 8} />
    </View>
  );
};

export default AppLayout;

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
