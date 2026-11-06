import { useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  deleteAssignment,
  getAssignments,
  getStudents,
  getTeachers,
  setUserActive,
} from "@/api/people";
import type { Assignment, UserProfile } from "@/api/types";
import { useAuth, isAdminRole } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView } from "@/components/ui/states";
import {
  PersonRowSkeleton,
  TextCardSkeleton,
} from "@/components/ui/skeleton";
import { RoleGate } from "@/components/ui/role-gate";
import { formatDateTime } from "@/lib/format";

type Tab = "students" | "teachers" | "assignments";

const tabOptions: { value: Tab; label: string }[] = [
  { value: "students", label: "Students" },
  { value: "teachers", label: "Teachers" },
  { value: "assignments", label: "Assignments" },
];

export default function PeopleTab() {
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const { colors, radius } = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("students");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");

  const studentsQuery = useQuery({
    queryKey: ["admin", "students", includeInactive],
    queryFn: () => getStudents(includeInactive),
    enabled: isAdmin,
  });
  const teachersQuery = useQuery({
    queryKey: ["admin", "teachers", includeInactive],
    queryFn: () => getTeachers(includeInactive),
    enabled: isAdmin,
  });
  const assignmentsQuery = useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: getAssignments,
    enabled: isAdmin,
  });

  const invalidatePeople = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "teachers"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "assignments"] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
  };

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      setUserActive(input.id, input.isActive),
    onSuccess: async (_, input) => {
      showToast(
        input.isActive
          ? "Account reactivated. The user can sign in again."
          : "Account deactivated."
      );
      await invalidatePeople();
    },
    onError: (error) => {
      showToast(
        error instanceof ApiError
          ? error.message
          : "Unable to update this account. Please try again.",
        "error"
      );
    },
  });

  const endAssignment = useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(assignmentId),
    onSuccess: async () => {
      showToast("Assignment ended.");
      await invalidatePeople();
    },
    onError: (error) => {
      showToast(
        error instanceof ApiError
          ? error.message
          : "Unable to end this assignment. Please try again.",
        "error"
      );
    },
  });

  const query =
    tab === "students"
      ? studentsQuery
      : tab === "teachers"
        ? teachersQuery
        : assignmentsQuery;

  const people = useMemo(() => {
    const list =
      tab === "students"
        ? studentsQuery.data ?? []
        : tab === "teachers"
          ? teachersQuery.data ?? []
          : [];
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (person) =>
        person.fullName.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle)
    );
  }, [search, studentsQuery.data, tab, teachersQuery.data]);

  const assignments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = assignmentsQuery.data ?? [];
    if (!needle) return list;
    return list.filter(
      (item) =>
        item.teacherName.toLowerCase().includes(needle) ||
        item.studentName.toLowerCase().includes(needle)
    );
  }, [assignmentsQuery.data, search]);

  const confirmToggle = (person: UserProfile) => {
    if (person.isActive) {
      Alert.alert(
        `Deactivate ${person.fullName}?`,
        "They will not be able to sign in. Accounts with upcoming lessons cannot be deactivated until those lessons are cancelled.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Deactivate",
            style: "destructive",
            onPress: () =>
              toggleActive.mutate({ id: person.id, isActive: false }),
          },
        ]
      );
      return;
    }
    toggleActive.mutate({ id: person.id, isActive: true });
  };

  const confirmEnd = (assignment: Assignment) => {
    Alert.alert(
      "End this assignment?",
      `${assignment.teacherName} will no longer be ${assignment.studentName}'s assigned teacher. Lesson history is kept.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End assignment",
          style: "destructive",
          onPress: () => endAssignment.mutate(assignment.id),
        },
      ]
    );
  };

  const addLabel =
    tab === "students"
      ? "Add student"
      : tab === "teachers"
        ? "Add teacher"
        : "Assign student";

  const openAdd = () => {
    if (tab === "assignments") {
      router.push("/people/assign");
      return;
    }
    router.push({ pathname: "/people/new", params: { role: tab.slice(0, -1) } });
  };

  return (
    <RoleGate roles={["admin", "super_admin"]}>
      <Screen
        refreshing={query.isFetching}
        onRefresh={() => {
          void studentsQuery.refetch();
          void teachersQuery.refetch();
          void assignmentsQuery.refetch();
        }}
      >
        <PageHeader
          eyebrow="Academy administration"
          title="People"
          subtitle="Manage student, teacher and support accounts, and who teaches whom."
          right={
            <Button title={addLabel} size="sm" icon="add" onPress={openAdd} />
          }
        />

        <Segmented
          label="People section"
          value={tab}
          onChange={setTab}
          options={tabOptions}
        />

        <Card
          onPress={() => router.push("/people/support")}
          accessibilityLabel="Support team"
          style={styles.teamLink}
        >
          <View style={styles.teamRow}>
            <View
              style={[
                styles.teamIcon,
                { backgroundColor: colors.brandSoft, borderRadius: radius.md },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.brand}
              />
            </View>
            <View style={styles.flex}>
              <AppText variant="label" weight="700">
                Support team
              </AppText>
              <AppText variant="caption" color="muted">
                Reviewers who audit lesson transcripts and weekly digests
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Card>

        <View style={styles.filters}>
          <TextField
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder={
              tab === "assignments"
                ? "Teacher or student name"
                : "Name or email"
            }
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {tab !== "assignments" ? (
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <AppText variant="label">Show inactive accounts</AppText>
                <AppText variant="caption" color="muted">
                  Deactivated teachers and students are hidden by default.
                </AppText>
              </View>
              <Switch
                accessibilityLabel="Show inactive accounts"
                value={includeInactive}
                onValueChange={setIncludeInactive}
                trackColor={{ true: colors.brand, false: colors.surfaceMuted }}
                thumbColor={colors.card}
              />
            </View>
          ) : null}
        </View>

        {query.isLoading ? (
          <View style={styles.list}>
            {[0, 1, 2].map((key) =>
              tab === "assignments" ? (
                <TextCardSkeleton key={key} lines={3} action />
              ) : (
                <PersonRowSkeleton key={key} avatarSize={46} />
              )
            )}
          </View>
        ) : query.isError ? (
          <ErrorView error={query.error} onRetry={() => void query.refetch()} />
        ) : tab === "assignments" ? (
          assignments.length ? (
            <View style={styles.list}>
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <View style={styles.assignmentHead}>
                    <View style={styles.assignmentCopy}>
                      <AppText variant="h3">{assignment.studentName}</AppText>
                      <AppText variant="small" color="muted">
                        Teacher: {assignment.teacherName}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        Since {formatDateTime(assignment.createdAt)}
                      </AppText>
                    </View>
                    <Badge
                      label={assignment.isActive ? "Active" : "Ended"}
                      tone={assignment.isActive ? "success" : "neutral"}
                    />
                  </View>
                  {assignment.isActive ? (
                    <View style={styles.actions}>
                      <Button
                        title={
                          endAssignment.isPending &&
                          endAssignment.variables === assignment.id
                            ? "Ending…"
                            : "End assignment"
                        }
                        variant="danger"
                        size="sm"
                        loading={
                          endAssignment.isPending &&
                          endAssignment.variables === assignment.id
                        }
                        disabled={endAssignment.isPending}
                        onPress={() => confirmEnd(assignment)}
                      />
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="No assignments yet"
              body="Assign a teacher to a student so lessons can be requested."
              action={
                <Button
                  title="Assign a student"
                  size="sm"
                  onPress={() => router.push("/people/assign")}
                />
              }
            />
          )
        ) : people.length ? (
          <View style={styles.list}>
            {people.map((person) => {
              const busy =
                toggleActive.isPending &&
                toggleActive.variables?.id === person.id;
              return (
                <Card key={person.id}>
                  <View style={styles.personRow}>
                    <Avatar
                      name={person.fullName}
                      avatarUrl={person.avatarUrl}
                      size={46}
                    />
                    <View style={styles.personCopy}>
                      <AppText variant="h3">{person.fullName}</AppText>
                      <AppText variant="caption" color="muted">
                        {person.email}
                      </AppText>
                      {person.phoneNumber ? (
                        <AppText variant="caption" color="muted">
                          {person.phoneNumber}
                        </AppText>
                      ) : null}
                    </View>
                    <Badge
                      label={person.isActive ? "Active" : "Inactive"}
                      tone={person.isActive ? "success" : "neutral"}
                    />
                  </View>
                  <View style={styles.actions}>
                    {tab === "students" ? (
                      <Button
                        title="Assign teacher"
                        variant="secondary"
                        size="sm"
                        icon="link-outline"
                        onPress={() =>
                          router.push({
                            pathname: "/people/assign",
                            params: { studentId: person.id },
                          })
                        }
                      />
                    ) : null}
                    {tab === "teachers" ? (
                      <Button
                        title="Weekly availability"
                        variant="secondary"
                        size="sm"
                        icon="calendar-outline"
                        onPress={() =>
                          router.push({
                            pathname: "/people/availability/[teacherId]",
                            params: {
                              teacherId: person.id,
                              name: person.fullName,
                            },
                          })
                        }
                      />
                    ) : null}
                    <Button
                      title={
                        busy
                          ? "Saving…"
                          : person.isActive
                            ? "Deactivate"
                            : "Reactivate"
                      }
                      variant={person.isActive ? "danger" : "secondary"}
                      size="sm"
                      loading={busy}
                      disabled={toggleActive.isPending}
                      onPress={() => confirmToggle(person)}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="people-outline"
            title={
              search.trim()
                ? "No matches"
                : tab === "students"
                  ? "No students"
                  : "No teachers"
            }
            body={
              search.trim()
                ? "Try a different name or email."
                : "Create an account to get started."
            }
            action={
              search.trim() ? undefined : (
                <Button title={addLabel} size="sm" onPress={openAdd} />
              )
            }
          />
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { marginTop: 14 },
  filters: { marginTop: 16, gap: 12 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchCopy: { flex: 1, gap: 2 },
  teamLink: { marginTop: 16 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  teamIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { marginTop: 16, gap: 10 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  personCopy: { flex: 1, gap: 2 },
  actions: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  assignmentHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  assignmentCopy: { flex: 1, gap: 2 },
});
