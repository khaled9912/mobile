import { Stack, useSegments } from "expo-router";
import { useTheme } from "@/providers/theme-provider";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { AppHeader } from "@/components/navigation/app-header";
import { AppHeaderProvider } from "@/components/navigation/app-header-context";
import {
  PersistentTabBar,
  TAB_BAR_OFFSET,
} from "@/components/navigation/persistent-tab-bar";
import { View, StyleSheet } from "react-native";

const AppLayout = () => {
  const { colors } = useTheme();
  const segments: string[] = useSegments();
  const fullScreen = segments[1] === "lesson";

  return (
    <AppHeaderProvider present={!fullScreen}>
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {fullScreen ? null : <AppHeader />}
        <View style={styles.flex}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="lesson/[id]"
              options={{ gestureEnabled: true }}
            />
          </Stack>
        </View>
        {fullScreen ? null : <PersistentTabBar />}
        <OfflineBanner bottomOffset={fullScreen ? 8 : TAB_BAR_OFFSET} />
      </View>
    </AppHeaderProvider>
  );
};

export default AppLayout;

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
