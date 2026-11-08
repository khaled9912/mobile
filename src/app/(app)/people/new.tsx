import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { RoleGate } from "@/components/ui/role-gate";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { GRADE_OPTIONS } from "@/lib/grades";

type AccountRole = "student" | "teacher" | "admin" | "support";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
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

const GradePicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = GRADE_OPTIONS.find((option) => option.value === value);
  const rows = [
    { value: "", short: "No grade", explain: "Leave the grade empty." },
    ...GRADE_OPTIONS,
  ];

  return (
    <View style={styles.pickerWrapper}>
      <AppText variant="label">Grade (optional)</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Grade: ${selected?.short ?? "No grade"}`}
        accessibilityHint="Opens the grade picker"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.pickerField,
          {
            borderRadius: radius.md,
            borderColor: colors.border,
            backgroundColor: colors.input,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <AppText variant="body" style={styles.pickerValue}>
          {selected?.short ?? "No grade"}
        </AppText>
        <Ionicons name="chevron-down" size={17} color={colors.muted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close grade picker"
            onPress={() => setOpen(false)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.overlay },
            ]}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.sheetHead}>
              <AppText variant="h3">Grade</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close grade picker"
                hitSlop={10}
                onPress={() => setOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList}>
              {rows.map((row) => {
                const isSelected = row.value === value;
                return (
                  <Pressable
                    key={row.value || "none"}
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(row.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.pickerOption,
                      {
                        borderRadius: radius.md,
                        backgroundColor: isSelected
                          ? colors.brandSoft
                          : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.pickerOptionText}>
                      <AppText variant="body">{row.short}</AppText>
                      <AppText variant="caption" color="muted">
                        {row.explain}
                      </AppText>
                    </View>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.brand}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function NewAccountScreen() {
  const params = useLocalSearchParams<{ role?: string | string[] }>();
  const rawRole = Array.isArray(params.role) ? params.role[0] : params.role;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [role, setRole] = useState<AccountRole>(
    isAccountRole(rawRole) ? rawRole : "student"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [grade, setGrade] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const create = useMutation({
    mutationFn: async (): Promise<UserProfile> => {
      if (role === "student") {
        return createStudent({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          ...(grade ? { grade } : {}),
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
      await queryClient.invalidateQueries({
        queryKey: ["admin", "support-users"],
      });
      await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
      showToast(`${user.fullName} now has an account.`);
      router.back();
    },
    onError: (error) => {
      showToast(
        error instanceof ApiError
          ? error.message
          : "Unable to create this account. Please try again.",
        "error"
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
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast(Object.values(nextErrors)[0], "error");
      return;
    }
    create.mutate();
  };

  const changeRole = (next: AccountRole) => {
    setRole(next);
    setErrors({});
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
              <GradePicker value={grade} onChange={setGrade} />
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
  pickerWrapper: { gap: 6 },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pickerValue: { flex: 1 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerList: { maxHeight: 400 },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerOptionText: { flex: 1, gap: 2 },
});
