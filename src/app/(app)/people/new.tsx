import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  createManagedUser,
  createStudent,
  type CreateUserInput,
} from "@/api/people";
import type { UserProfile } from "@/api/types";
import { isValidEmail, passwordProblem } from "@/lib/validation";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { RoleGate } from "@/components/ui/role-gate";

type AccountRole = "student" | "teacher" | "admin" | "support";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  grade?: string;
};

const roleOptions: { value: AccountRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
  { value: "support", label: "Support" },
];

const isAccountRole = (value: unknown): value is AccountRole =>
  value === "student" ||
  value === "teacher" ||
  value === "admin" ||
  value === "support";

export default function NewAccountScreen() {
  const params = useLocalSearchParams<{ role?: string | string[] }>();
  const rawRole = Array.isArray(params.role) ? params.role[0] : params.role;
  const queryClient = useQueryClient();
  const [role, setRole] = useState<AccountRole>(
    isAccountRole(rawRole) ? rawRole : "student"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [grade, setGrade] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (): Promise<UserProfile> => {
      if (role === "student") {
        return createStudent({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          ...(grade.trim() ? { grade: grade.trim() } : {}),
        });
      }
      return createManagedUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: role as CreateUserInput["role"],
      });
    },
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "teachers"] });
      await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
      setNotice(`${user.fullName} now has an account.`);
      Alert.alert(
        "Account created",
        `${user.fullName} can sign in with ${user.email}.`,
        [{ text: "Done", onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      setNotice(null);
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to create this account. Please try again."
      );
    },
  });

  const submit = () => {
    const nextErrors: FieldErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Enter the account holder's name.";
    if (!isValidEmail(email)) nextErrors.email = "Enter a valid email address.";
    const passwordIssue = passwordProblem(password);
    if (passwordIssue) nextErrors.password = passwordIssue;
    if (confirm !== password) nextErrors.confirm = "Passwords do not match.";
    if (grade.trim().length > 20) {
      nextErrors.grade = "Keep the grade under 20 characters.";
    }
    setErrors(nextErrors);
    setFormError(null);
    setNotice(null);
    if (Object.keys(nextErrors).length > 0) return;
    create.mutate();
  };

  const changeRole = (next: AccountRole) => {
    setRole(next);
    setErrors({});
    setFormError(null);
    setNotice(null);
  };

  return (
    <RoleGate roles={["admin", "super_admin"]}>
      <Screen edges={["left", "right"]} keyboard>
        <PageHeader
          eyebrow="Academy administration"
          title="Create an account"
          subtitle="Admins create all student, teacher, and admin accounts. The user can change their password after signing in."
        />

        <Card>
          <View style={styles.form}>
            <View style={styles.roleBlock}>
              <AppText variant="label">Account type</AppText>
              <Segmented
                label="Account type"
                value={role}
                onChange={changeRole}
                options={roleOptions}
              />
            </View>

            <TextField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              error={errors.fullName}
              maxLength={160}
            />
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              error={errors.email}
            />
            {role === "student" ? (
              <TextField
                label="Grade (optional)"
                value={grade}
                onChangeText={setGrade}
                placeholder="For example, Grade 7"
                error={errors.grade}
                maxLength={20}
              />
            ) : null}
            <TextField
              label="Temporary password"
              value={password}
              onChangeText={setPassword}
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              error={errors.password}
              hint="At least 8 characters with a lowercase letter and a digit."
            />
            <TextField
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              error={errors.confirm}
            />

            {formError ? <Notice tone="error" message={formError} /> : null}
            {notice ? <Notice tone="success" message={notice} /> : null}

            <Button
              title={create.isPending ? "Creating…" : "Create account"}
              onPress={submit}
              loading={create.isPending}
              icon="person-add-outline"
            />
          </View>
        </Card>
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  roleBlock: { gap: 8 },
});
