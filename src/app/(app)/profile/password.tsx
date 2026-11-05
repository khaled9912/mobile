import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { changePassword } from "@/api/auth";
import { passwordProblem } from "@/lib/validation";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";

type FieldErrors = {
  current?: string;
  next?: string;
  confirm?: string;
};

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { showToast } = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setFormError(null);
      showToast("Your password has been changed. Other devices were signed out.");
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to change your password. Please try again."
      );
    },
  });

  const submit = () => {
    const nextErrors: FieldErrors = {};
    if (!currentPassword) {
      nextErrors.current = "Enter your current password.";
    }
    const issue = passwordProblem(newPassword);
    if (issue) {
      nextErrors.next = issue;
    } else if (newPassword === currentPassword) {
      nextErrors.next = "Choose a password different from your current one.";
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirm = "The new passwords do not match.";
    }

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;
    change.mutate();
  };

  return (
    <Screen edges={["left", "right"]} keyboard>
      <PageHeader
        eyebrow="Your account"
        title="Change password"
        subtitle="Update the password you use to sign in with your email."
      />

      <Card>
        <View style={styles.form}>
          <TextField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secure
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            error={errors.current}
          />
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.next}
            hint="At least 8 characters, including a number and a lowercase letter."
          />
          <TextField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.confirm}
          />

          {formError ? <Notice tone="error" message={formError} /> : null}

          <Button
            title={change.isPending ? "Updating…" : "Change password"}
            onPress={submit}
            loading={change.isPending}
            icon="key-outline"
          />
        </View>

        <AppText variant="caption" color="muted" style={styles.footnote}>
          Accounts created with only a phone number sign in with a one-time
          code and do not have a password.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  footnote: { marginTop: 16, lineHeight: 18 },
});
