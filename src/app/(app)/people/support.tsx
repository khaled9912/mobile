import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { getSupportUsers, setUserActive } from "@/api/people";
import type { UserProfile } from "@/api/types";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";

export default function SupportTeamScreen() {
  const { spacing } = useTheme();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supportQuery = useQuery({
    queryKey: ["admin", "support-users"],
    queryFn: getSupportUsers,
  });

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      setUserActive(input.id, input.isActive),
    onSuccess: async (_, input) => {
      setActionError(null);
      setNotice(
        input.isActive
          ? "Reviewer reactivated. They can sign in again."
          : "Reviewer deactivated. Their submitted reviews are kept."
      );
      await queryClient.invalidateQueries({
        queryKey: ["admin", "support-users"],
      });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to update this account. Please try again."
      );
    },
  });

  const confirmToggle = (person: UserProfile) => {
    if (person.isActive) {
      Alert.alert(
        `Deactivate ${person.fullName}?`,
        "They will no longer be able to sign in, read transcripts or submit reviews. Reviews already submitted are kept.",
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

  const reviewers = supportQuery.data ?? [];

  return (
    <RoleGate roles={["admin", "super_admin"]}>
      <Screen
        refreshing={supportQuery.isRefetching}
        onRefresh={() => void supportQuery.refetch()}
      >
        <PageHeader
          eyebrow="Academy administration"
          title="Support team"
          subtitle="Reviewers can read lesson transcripts, submit reviews and open the weekly digest. They cannot change lessons, students or teachers."
          right={
            <Button
              title="Add reviewer"
              size="sm"
              icon="person-add-outline"
              onPress={() =>
                router.push({
                  pathname: "/people/new",
                  params: { role: "support" },
                })
              }
            />
          }
        />

        {notice ? (
          <View style={{ marginBottom: spacing.md }}>
            <Notice tone="success" message={notice} />
          </View>
        ) : null}
        {actionError ? (
          <View style={{ marginBottom: spacing.md }}>
            <Notice tone="error" message={actionError} />
          </View>
        ) : null}

        {supportQuery.isLoading ? (
          <LoadingView label="Loading the support team…" />
        ) : supportQuery.isError ? (
          <ErrorView
            error={supportQuery.error}
            onRetry={() => void supportQuery.refetch()}
          />
        ) : reviewers.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="No reviewers yet"
            body="Add a support account so lesson transcripts and reviews are checked every week."
            action={
              <Button
                title="Add reviewer"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: "/people/new",
                    params: { role: "support" },
                  })
                }
              />
            }
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {reviewers.map((person) => {
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
                    </View>
                    <Badge
                      label={person.isActive ? "Active" : "Inactive"}
                      tone={person.isActive ? "success" : "neutral"}
                    />
                  </View>
                  <View style={styles.actions}>
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
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  personCopy: { flex: 1, gap: 2 },
  actions: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
