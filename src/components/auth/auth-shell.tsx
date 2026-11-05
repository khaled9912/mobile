import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/screen";
import { PillPressable } from "@/components/ui/pill-pressable";
import {
  NotificationsBell,
  NotificationsSheet,
} from "@/components/notifications/notifications-sheet";
import { openWhatsApp } from "@/lib/whatsapp";
import { BrandLockup } from "@/components/ui/brand";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/providers/theme-provider";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
};

export const AuthShell = ({
  title,
  subtitle,
  children,
  showBack = false,
}: Props) => {
  const { colors, radius } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // The masthead sits outside the scroll view, so it stays visible while a
  // long form (or the keyboard) scrolls the fields beneath it.
  const header = (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      <BrandLockup size={36} />
      <View style={[styles.side, styles.actions]}>
        <PillPressable
          accessibilityLabel="Chat on WhatsApp"
          onPress={() => openWhatsApp()}
          style={styles.iconButton}
        >
          <Ionicons name="logo-whatsapp" size={19} color={colors.text} />
        </PillPressable>
        <NotificationsBell
          onPress={() => setNotificationsOpen((prev) => !prev)}
        />
      </View>
    </View>
  );

  return (
    <>
      <Screen keyboard contentStyle={styles.content} header={header}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.xl,
          },
        ]}
      >
        <AppText variant="h2" align="center">
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            variant="small"
            color="muted"
            align="center"
            style={styles.subtitle}
          >
            {subtitle}
          </AppText>
        ) : null}
        <View style={styles.body}>{children}</View>
      </View>
      </Screen>
      <NotificationsSheet
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { flex: 1, flexDirection: "row", alignItems: "center" },
  actions: { justifyContent: "flex-end", gap: 4 },
  back: {
    justifyContent: "center",
    paddingHorizontal: 8,
    height: 38,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 22,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  subtitle: { marginTop: 8, lineHeight: 19 },
  body: { marginTop: 22, gap: 16 },
});
