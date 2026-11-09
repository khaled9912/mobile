import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { AppThemeProvider, useTheme } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { LessonReminderProvider } from "@/providers/lesson-reminder-provider";
import { PushTokenProvider } from "@/providers/push-token-provider";
import { NotificationBadgeProvider } from "@/providers/notification-badge-provider";
import { NotificationTrayProvider } from "@/providers/notification-tray-provider";
import { LessonCallProvider } from "@/providers/lesson-call-provider";
import { LessonRingProvider } from "@/providers/lesson-ring-provider";
import { ApiDebugOverlay } from "@/components/dev/api-debug-overlay";
import { LaunchIntro } from "@/components/onboarding/launch-intro";
import { queryClient } from "@/lib/query-client";
import { BrandLockup } from "@/components/ui/brand";
import { AppText } from "@/components/ui/app-text";

void SplashScreen.preventAutoHideAsync().catch(() => {});

const BootOverlay = () => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.boot,
        { backgroundColor: colors.background },
      ]}
    >
      <BrandLockup size={72} vertical />
      <ActivityIndicator color={colors.brand} style={styles.spinner} />
      <AppText variant="small" color="muted">
        Restoring your session…
      </AppText>
    </View>
  );
};

const RootNavigator = () => {
  const { colors, scheme } = useTheme();
  const { user, status, hydrated } = useAuth();
  const segments = useSegments();
  const segmentKey = segments.join("/");
  const inAuthGroup = segments[0] === "(auth)";
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || status === "restoring") return;
    if (!user && !inAuthGroup) {
      router.replace("/welcome");
      return;
    }
    if (user && (inAuthGroup || segmentKey === "")) {
      router.replace("/");
    }
  }, [hydrated, status, user, inAuthGroup, segmentKey]);

  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, scheme]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      {status === "restoring" && introDone ? <BootOverlay /> : null}
      {introDone ? null : (
        <View style={styles.introLayer}>
          <LaunchIntro onDone={() => setIntroDone(true)} />
        </View>
      )}
    </NavigationThemeProvider>
  );
};

const RootLayout = () => (
  <GestureHandlerRootView style={styles.flex}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <RealtimeProvider>
                <PushTokenProvider>
                  <NotificationBadgeProvider>
                    <NotificationTrayProvider>
                      <LessonReminderProvider>
                        <LessonCallProvider>
                          <LessonRingProvider>
                            <RootNavigator />
                          </LessonRingProvider>
                        </LessonCallProvider>
                        <ApiDebugOverlay />
                      </LessonReminderProvider>
                    </NotificationTrayProvider>
                  </NotificationBadgeProvider>
                </PushTokenProvider>
              </RealtimeProvider>
            </AuthProvider>
          </ToastProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

export default RootLayout;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    zIndex: 2000,
  },
  introLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3000,
    elevation: 30,
  },
  spinner: { marginTop: 6 },
});
