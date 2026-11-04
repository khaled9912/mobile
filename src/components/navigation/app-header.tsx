import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { PillPressable } from "@/components/ui/pill-pressable";
import {
  NotificationsBell,
  NotificationsSheet,
} from "@/components/notifications/notifications-sheet";
import { openWhatsApp } from "@/lib/whatsapp";
import { useTheme } from "@/providers/theme-provider";

export const AppHeader = () => {
  const { colors } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.navigate("/");
  };

  return (
    <>
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <PillPressable
              accessibilityLabel="Go back"
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
            <NotificationsBell
              onPress={() => setNotificationsOpen((prev) => !prev)}
            />
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
  safe: { zIndex: 10 },
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
});
