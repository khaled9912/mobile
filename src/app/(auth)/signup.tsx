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
import { getDeviceCountry } from "@/lib/registration";

export default function SignupScreen() {
  const { applySession } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fail = (message: string) => showToast(message, "error");

  const handleSubmit = async () => {
    if (loading) return;

    const invalid: Record<string, string> = {};
    if (fullName.trim().length < 2) invalid.fullName = "Enter your full name.";
    else if (fullName.includes("@"))
      invalid.fullName = "Enter your name, not an email address.";
    if (!isValidEmail(email)) invalid.email = "Enter a valid email address.";
    const problem = passwordProblem(password);
    if (problem) invalid.password = problem;
    if (password !== confirm) invalid.confirm = "The passwords do not match.";

    if (Object.keys(invalid).length) {
      setErrors(invalid);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const user = await register(
        fullName.trim(),
        email.trim(),
        password,
        getDeviceCountry() ?? undefined
      );
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
          onChangeText={(text) => {
            setFullName(text);
            setErrors((current) =>
              current.fullName ? { ...current, fullName: "" } : current
            );
          }}
          error={errors.fullName}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors((current) =>
              current.email ? { ...current, email: "" } : current
            );
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrors((current) =>
              current.password ? { ...current, password: "" } : current
            );
          }}
          error={errors.password}
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
          onChangeText={(text) => {
            setConfirm(text);
            setErrors((current) =>
              current.confirm ? { ...current, confirm: "" } : current
            );
          }}
          error={errors.confirm}
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
          message="After registration, tell us your levels and the weekly times that suit you, and the academy assigns your teacher."
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
