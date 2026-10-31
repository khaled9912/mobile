import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@/api/client";
import { requestPasswordReset, resetPassword } from "@/api/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { isNumericCode, isValidEmail, passwordProblem } from "@/lib/validation";

type Step = "email" | "reset" | "done";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleRequest = async () => {
    if (loading) return;
    setMessage("");
    if (!isValidEmail(email)) {
      setMessage("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setDevCode(result.devCode ?? null);
      setStep("reset");
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to send the reset code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (loading) return;
    setMessage("");
    if (!isNumericCode(code.trim())) {
      setMessage("Enter the numeric code from the email.");
      return;
    }
    const problem = passwordProblem(newPassword);
    if (problem) {
      setMessage(problem);
      return;
    }
    if (newPassword !== confirm) {
      setMessage("The new passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      setStep("done");
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to reset your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <AuthShell title="Password updated">
        <Notice
          tone="success"
          message="Your password has been reset. Sign in with your new password."
        />
        <Button
          title="Back to sign in"
          onPress={() => router.replace("/login")}
          fullWidth
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      showBack
      title="Reset your password"
      subtitle={
        step === "email"
          ? "Enter the email you use to sign in and we will send a one-time code."
          : `Enter the code we sent to ${email.trim()}.`
      }
    >
      {step === "email" ? (
        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={() => void handleRequest()}
          />
          <Button
            title={loading ? "Sending code…" : "Send reset code"}
            onPress={() => void handleRequest()}
            loading={loading}
            fullWidth
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="Verification code"
            value={code}
            onChangeText={(next) => setCode(next.replace(/\D/g, ""))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={8}
          />
          {devCode ? (
            <Notice
              tone="info"
              title="Development code"
              message={`Use ${devCode} to reset your password. This code is only returned by the development API.`}
            />
          ) : null}
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            hint="At least 8 characters, including a digit and a lowercase letter."
          />
          <TextField
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => void handleReset()}
          />
          <Button
            title={loading ? "Resetting…" : "Reset password"}
            onPress={() => void handleReset()}
            loading={loading}
            fullWidth
          />
          <Button
            title="Use a different email"
            variant="ghost"
            size="sm"
            onPress={() => {
              setStep("email");
              setMessage("");
              setCode("");
              setDevCode(null);
            }}
          />
        </View>
      )}

      {message ? <Notice tone="error" message={message} /> : null}

      <View style={styles.footer}>
        <AppText variant="small" color="muted">
          Remembered it?
        </AppText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Back to sign in"
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
