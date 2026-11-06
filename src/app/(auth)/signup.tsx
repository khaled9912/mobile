import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@/api/client";
import { register } from "@/api/auth";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { isValidEmail, passwordProblem } from "@/lib/validation";

export default function SignupScreen() {
  const { applySession } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const fail = (message: string) => showToast(message, "error");

  const handleSubmit = async () => {
    if (loading) return;

    if (fullName.trim().length < 2) {
      fail("Enter your full name.");
      return;
    }
    if (!isValidEmail(email)) {
      fail("Enter a valid email address.");
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      fail(problem);
      return;
    }
    if (password !== confirm) {
      fail("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const user = await register(fullName.trim(), email.trim(), password);
      applySession(user);
      router.replace("/");
    } catch (error) {
      fail(
        error instanceof ApiError
          ? error.message
          : "We could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      showBack
      title="Create your account"
      subtitle="Student accounts are free to create. Teachers and administrators are invited by the academy."
    >
      <View style={styles.form}>
        <TextField
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 8 characters, including a digit and a lowercase letter."
          returnKeyType="next"
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
        <Button
          title={loading ? "Creating account…" : "Create account"}
          onPress={() => void handleSubmit()}
          loading={loading}
          fullWidth
        />
        <Notice
          tone="info"
          message="After registration you can choose a teacher and request your first lesson."
        />
      </View>

      <View style={styles.footer}>
        <AppText variant="small" color="muted">
          Already have an account?
        </AppText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Sign in"
          onPress={() => router.replace("/login")}
          hitSlop={8}
        >
          <AppText variant="small" weight="700" color="link">
            Sign in
          </AppText>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
});
