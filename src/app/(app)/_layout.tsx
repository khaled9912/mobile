import { Stack } from "expo-router";
import { useTheme } from "@/providers/theme-provider";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { View, StyleSheet } from "react-native";

const AppLayout = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
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
        <Stack.Screen name="availability" options={{ title: "My availability" }} />
        <Stack.Screen
          name="student-availability"
          options={{ title: "Student availability" }}
        />
        <Stack.Screen name="profile/edit" options={{ title: "Edit profile" }} />
        <Stack.Screen
          name="profile/password"
          options={{ title: "Change password" }}
        />
        <Stack.Screen name="profile/reports" options={{ title: "Lesson reports" }} />
        <Stack.Screen name="contact" options={{ title: "Contact the academy" }} />
        <Stack.Screen name="people/new" options={{ title: "New account" }} />
        <Stack.Screen name="people/assign" options={{ title: "Assign teacher" }} />
        <Stack.Screen
          name="contact-submissions"
          options={{ title: "Contact messages" }}
        />
      </Stack>
      <OfflineBanner bottomOffset={8} />
    </View>
  );
};

export default AppLayout;

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
