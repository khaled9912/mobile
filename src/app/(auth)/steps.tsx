import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

const STEPS: { number: string; title: string; body: string }[] = [
  {
    number: "01",
    title: "Tell us your level and times",
    body: "Create an account, set the level for each subject, and give us the weekly times that suit your family.",
  },
  {
    number: "02",
    title: "The academy assigns your teacher",
    body: "We match your level and your times with one dedicated teacher, then set your weekly lessons around them.",
  },
  {
    number: "03",
    title: "Learn one-to-one every week",
    body: "The same teacher at the same weekly time, shown in your own time zone — starting with a free trial lesson.",
  },
];

export default function StepsScreen() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();

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
        <Button
          title={user ? "Open my dashboard" : "Create an account"}
          icon="arrow-forward"
          fullWidth
          onPress={() => router.push(user ? "/" : "/signup")}
        />
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
