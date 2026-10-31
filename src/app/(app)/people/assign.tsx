import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import {
  createAssignment,
  getStudents,
  getTeachers,
} from "@/api/people";
import type { UserProfile } from "@/api/types";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";

const PersonRow = ({
  person,
  hint,
  onPress,
}: {
  person: UserProfile;
  hint: string;
  onPress: () => void;
}) => (
  <Card
    onPress={onPress}
    accessibilityLabel={`Choose ${person.fullName}`}
  >
    <View style={styles.personRow}>
      <Avatar name={person.fullName} avatarUrl={person.avatarUrl} size={44} />
      <View style={styles.personCopy}>
        <AppText variant="h3">{person.fullName}</AppText>
        <AppText variant="caption" color="muted">
          {person.email}
        </AppText>
      </View>
      <View style={styles.choose}>
        <AppText variant="caption" color="link" weight="700">
          {hint}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color="#217a34" />
      </View>
    </View>
  </Card>
);

export default function AssignTeacherScreen() {
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const rawStudentId = Array.isArray(params.studentId)
    ? params.studentId[0]
    : params.studentId;
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [studentId, setStudentId] = useState<string | null>(
    rawStudentId ?? null
  );
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["admin", "students", false],
    queryFn: () => getStudents(false),
  });
  const teachersQuery = useQuery({
    queryKey: ["admin", "teachers", false],
    queryFn: () => getTeachers(false),
  });

  const students = studentsQuery.data ?? [];
  const teachers = teachersQuery.data ?? [];
  const student = students.find((item) => item.id === studentId) ?? null;
  const teacher = teachers.find((item) => item.id === teacherId) ?? null;

  const needle = search.trim().toLowerCase();
  const matches = (person: UserProfile) =>
    !needle ||
    person.fullName.toLowerCase().includes(needle) ||
    person.email.toLowerCase().includes(needle);

  const filteredStudents = students.filter(matches);
  const filteredTeachers = teachers.filter(matches);

  const assign = useMutation({
    mutationFn: async () => {
      if (!studentId || !teacherId) {
        throw new Error("Choose a student and a teacher first.");
      }
      return createAssignment(teacherId, studentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
      await queryClient.invalidateQueries({
        queryKey: ["assigned-teacher"],
      });
      await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
      Alert.alert(
        "Teacher assigned",
        `${teacher?.fullName ?? "This teacher"} is now ${
          student?.fullName ?? "the student"
        }'s assigned teacher. Any previous assignment was ended.`,
        [{ text: "Done", onPress: () => router.back() }]
      );
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Unable to create this assignment. Please try again."
      ),
  });

  const chooseStudent = (person: UserProfile) => {
    setStudentId(person.id);
    setTeacherId(null);
    setSearch("");
    setError(null);
  };

  const chooseTeacher = (person: UserProfile) => {
    setTeacherId(person.id);
    setSearch("");
    setError(null);
  };

  const subheading = !studentId
    ? "Choose a student"
    : !teacherId
      ? "Choose a teacher"
      : "Confirm the assignment";

  const choosingStudent = !studentId;
  const choosingTeacher = Boolean(studentId) && !teacherId;

  return (
    <RoleGate roles={["admin", "super_admin"]}>
      <Screen edges={["left", "right"]} keyboard>
        <PageHeader
          eyebrow="Academy administration"
          title="Assign a teacher"
          subtitle="A student has one active teacher. Assigning a new teacher ends the previous assignment."
        />

        <View
          style={[
            styles.steps,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          {[
            { label: "Student", value: student?.fullName ?? "Not chosen" },
            { label: "Teacher", value: teacher?.fullName ?? "Not chosen" },
          ].map((step, index) => (
            <View key={step.label} style={styles.step}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      (index === 0 && student) || (index === 1 && teacher)
                        ? colors.brand
                        : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="700"
                  color={
                    (index === 0 && student) || (index === 1 && teacher)
                      ? "onBrand"
                      : "muted"
                  }
                >
                  {index + 1}
                </AppText>
              </View>
              <View style={styles.stepCopy}>
                <AppText variant="caption" color="muted">
                  {step.label}
                </AppText>
                <AppText variant="small" weight="600" numberOfLines={1}>
                  {step.value}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {error ? (
          <View style={styles.block}>
            <Notice tone="error" message={error} />
          </View>
        ) : null}

        {studentsQuery.isLoading || teachersQuery.isLoading ? (
          <LoadingView label="Loading people…" />
        ) : studentsQuery.isError ? (
          <ErrorView
            error={studentsQuery.error}
            onRetry={() => void studentsQuery.refetch()}
          />
        ) : teachersQuery.isError ? (
          <ErrorView
            error={teachersQuery.error}
            onRetry={() => void teachersQuery.refetch()}
          />
        ) : choosingStudent ? (
          <>
            <SectionHeader title={subheading} />
            <TextField
              label="Search students"
              value={search}
              onChangeText={setSearch}
              placeholder="Name or email"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.list}>
              {filteredStudents.length ? (
                filteredStudents.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    hint="Choose"
                    onPress={() => chooseStudent(person)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="person-outline"
                  title={needle ? "No matching students" : "No active students"}
                  body={
                    needle
                      ? "Try a different name or email."
                      : "Create a student account from the People tab first."
                  }
                />
              )}
            </View>
          </>
        ) : choosingTeacher ? (
          <>
            <View style={styles.selected}>
              <Card>
                <View style={styles.personRow}>
                  <Avatar
                    name={student?.fullName ?? "Student"}
                    avatarUrl={student?.avatarUrl}
                    size={44}
                  />
                  <View style={styles.personCopy}>
                    <AppText variant="caption" color="muted">
                      Student
                    </AppText>
                    <AppText variant="h3">{student?.fullName}</AppText>
                  </View>
                  <Button
                    title="Change"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setStudentId(null);
                      setTeacherId(null);
                      setSearch("");
                    }}
                  />
                </View>
              </Card>
            </View>

            <SectionHeader title={subheading} />
            <TextField
              label="Search teachers"
              value={search}
              onChangeText={setSearch}
              placeholder="Name or email"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.list}>
              {filteredTeachers.length ? (
                filteredTeachers.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    hint="Choose"
                    onPress={() => chooseTeacher(person)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="people-outline"
                  title={needle ? "No matching teachers" : "No active teachers"}
                  body={
                    needle
                      ? "Try a different name or email."
                      : "Create a teacher account from the People tab first."
                  }
                />
              )}
            </View>
          </>
        ) : (
          <>
            <SectionHeader title={subheading} />
            <Card>
              <View style={styles.confirmRow}>
                <View style={styles.confirmPerson}>
                  <Avatar
                    name={student?.fullName ?? "Student"}
                    avatarUrl={student?.avatarUrl}
                    size={48}
                  />
                  <View style={styles.personCopy}>
                    <AppText variant="caption" color="muted">
                      Student
                    </AppText>
                    <AppText variant="h3">{student?.fullName}</AppText>
                    <AppText variant="caption" color="muted">
                      {student?.email}
                    </AppText>
                  </View>
                </View>
                <Ionicons name="arrow-down" size={20} color={colors.muted} />
                <View style={styles.confirmPerson}>
                  <Avatar
                    name={teacher?.fullName ?? "Teacher"}
                    avatarUrl={teacher?.avatarUrl}
                    size={48}
                  />
                  <View style={styles.personCopy}>
                    <AppText variant="caption" color="muted">
                      Teacher
                    </AppText>
                    <AppText variant="h3">{teacher?.fullName}</AppText>
                    <AppText variant="caption" color="muted">
                      {teacher?.email}
                    </AppText>
                  </View>
                </View>
              </View>

              <AppText variant="small" color="muted" style={styles.confirmNote}>
                The student will see this teacher and their open lesson times.
                Any previous active assignment is ended automatically.
              </AppText>

              <View style={styles.actions}>
                <Button
                  title="Assign teacher"
                  onPress={() => assign.mutate()}
                  loading={assign.isPending}
                  icon="checkmark-circle-outline"
                />
                <Button
                  title="Change teacher"
                  variant="secondary"
                  disabled={assign.isPending}
                  onPress={() => setTeacherId(null)}
                />
              </View>
            </Card>
          </>
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  steps: {
    flexDirection: "row",
    gap: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 14,
  },
  step: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCopy: { flex: 1, gap: 1 },
  block: { marginTop: 14 },
  list: { marginTop: 14, gap: 10 },
  selected: { marginTop: 18 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  personCopy: { flex: 1, gap: 2 },
  choose: { flexDirection: "row", alignItems: "center", gap: 2 },
  confirmRow: { gap: 12 },
  confirmPerson: { flexDirection: "row", alignItems: "center", gap: 12 },
  confirmNote: { marginTop: 16, lineHeight: 19 },
  actions: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
