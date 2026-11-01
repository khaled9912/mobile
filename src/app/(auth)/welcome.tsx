import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/app-text";
import { BrandLockup } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { markWelcomeSeen } from "@/lib/welcome";
import { useTheme } from "@/providers/theme-provider";

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}[] = [
  {
    icon: "videocam-outline",
    title: "Live one-to-one lessons",
    body: "Meet your teacher in a secure classroom, right from the app.",
  },
  {
    icon: "calendar-clear-outline",
    title: "Flexible scheduling",
    body: "Request lesson times that fit around your week.",
  },
  {
    icon: "document-text-outline",
    title: "Progress you can follow",
    body: "Reports and reviews after every lesson, on any device.",
  },
];

export default function WelcomeScreen() {
  const { colors, radius } = useTheme();

  useEffect(() => {
    markWelcomeSeen();
  }, []);

  return (
    <Screen
      edges={["top", "bottom", "left", "right"]}
      contentStyle={styles.content}
    >
      <View style={styles.hero}>
        <BrandLockup size={82} vertical />
        <AppText variant="h1" align="center" style={styles.title}>
          Learn the Qur&apos;an, one lesson at a time.
        </AppText>
        <AppText variant="body" color="muted" align="center" style={styles.lead}>
          One-to-one lessons with dedicated teachers. Schedule a session, join
          the classroom, and keep track of your progress in one place.
        </AppText>
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.featureRow}>
            <View
              style={[
                styles.featureIcon,
                {
                  backgroundColor: colors.brandSoft,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name={feature.icon}
                size={20}
                color={colors.brand}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
            <View style={styles.featureCopy}>
              <AppText variant="label">{feature.title}</AppText>
              <AppText variant="caption" color="muted" style={styles.featureBody}>
                {feature.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          title="Sign in"
          onPress={() => router.replace("/login")}
          fullWidth
        />
        <Button
          title="Create account"
          variant="secondary"
          onPress={() => router.push("/signup")}
          fullWidth
        />
        <AppText variant="caption" color="muted" align="center">
          Teachers and administrators are invited by the academy.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  hero: { alignItems: "center", gap: 14 },
  title: { marginTop: 8, maxWidth: 360 },
  lead: { lineHeight: 22, maxWidth: 380 },
  features: { gap: 18 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  featureIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCopy: { flex: 1, gap: 2 },
  featureBody: { lineHeight: 18 },
  actions: { gap: 10 },
});
