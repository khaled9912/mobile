import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  REGISTRATION_BLOCKED_MESSAGE,
  getDeviceCountry,
  isRegistrationAllowed,
} from "@/lib/registration";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

const STEPS: { number: string; title: string; body: string }[] = [
  {
    number: "01",
    title: "Meet your teacher",
    body: "We connect each student with a dedicated teacher who understands their goals and learning pace.",
  },
  {
    number: "02",
    title: "Choose your weekly times",
    body: "See each teacher's weekly schedule and pick the times that fit your routine — as many as you need.",
  },
  {
    number: "03",
    title: "Learn one-to-one every week",
    body: "Your times lock in instantly and repeat every week. Join each lesson online, starting with a trial.",
  },
];

export default function StepsScreen() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const blocked = !user && !isRegistrationAllowed(getDeviceCountry());

  return (
    <AuthShell
      title="Simple steps. Personal progress."
      subtitle="From your first sign-up to your next lesson, we make it easy to stay connected and keep learning."
      showBack
    >
      {STEPS.map((step) => (
        <View
          key={step.number}
          style={[
            styles.stepCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <AppText variant="h3" color="gold" weight="800">
            {step.number}
          </AppText>
          <View style={styles.stepCopy}>
            <AppText variant="h3">{step.title}</AppText>
            <AppText variant="caption" color="muted">
              {step.body}
            </AppText>
          </View>
        </View>
      ))}

      <View style={styles.actions}>
        {blocked ? (
          <Notice tone="warning" message={REGISTRATION_BLOCKED_MESSAGE} />
        ) : (
          <Button
            title={user ? "Browse teachers" : "Create an account"}
            icon="arrow-forward"
            fullWidth
            onPress={() => router.push(user ? "/book" : "/signup")}
          />
        )}
        {user ? null : (
          <Button
            title="I already have an account"
            variant="secondary"
            fullWidth
            onPress={() => router.push("/login")}
          />
        )}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    padding: 14,
  },
  stepCopy: { flex: 1, gap: 2 },
  actions: { gap: 8, marginTop: 4 },
});
