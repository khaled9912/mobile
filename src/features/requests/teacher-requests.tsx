import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  getIncomingLessonRequests,
  respondToRequestAsTeacher,
} from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RequestCard } from "@/components/lesson/request-card";
import { openRequests } from "@/lib/lesson-selectors";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const TeacherRequests = () => {
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({
    queryKey: ["lesson-requests", "teacher"],
    queryFn: getIncomingLessonRequests,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(requestsQuery.refetch);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const respond = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "confirm" | "reject";
    }) => respondToRequestAsTeacher(id, decision),
    onSuccess: async (_, variables) => {
      setError("");
      setNotice(
        variables.decision === "confirm"
          ? "Confirmed. The academy will now approve the lesson."
          : "Request declined. The time is open again."
      );
      await queryClient.invalidateQueries({ queryKey: ["lesson-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (mutationError) => {
      setNotice("");
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Unable to update the request. Please try again."
      );
    },
  });

  const requests = requestsQuery.data ?? [];
  const open = openRequests(requests);
  const history = requests
    .filter(
      (request) =>
        request.status !== "pending_teacher" &&
        request.status !== "pending_student" &&
        request.status !== "pending_admin"
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const decide = (id: string, decision: "confirm" | "reject") => {
    setNotice("");
    if (decision === "reject") {
      Alert.alert(
        "Decline this request?",
        "The student will be notified and the time will become available again.",
        [
          { text: "Keep request", style: "cancel" },
          {
            text: "Decline",
            style: "destructive",
            onPress: () => respond.mutate({ id, decision }),
          },
        ]
      );
      return;
    }
    respond.mutate({ id, decision });
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Teacher portal"
        title="Lesson requests"
        subtitle="Confirm the times you can teach. The academy gives the final approval."
      />

      <Card onPress={() => router.push("/student-availability")}>
        <AppText variant="h3">Student time preferences</AppText>
        <AppText variant="small" color="muted" style={styles.linkBody}>
          Students can offer times too. Review them and propose a lesson.
        </AppText>
      </Card>

      {notice ? (
        <View style={styles.block}>
          <Notice tone="success" message={notice} />
        </View>
      ) : null}
      {error ? (
        <View style={styles.block}>
          <Notice tone="error" message={error} />
        </View>
      ) : null}

      {requestsQuery.isLoading ? (
        <LoadingView label="Loading requests…" />
      ) : requestsQuery.isError ? (
        <ErrorView
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
        />
      ) : (
        <View style={styles.sections}>
          {open.length ? (
            <View style={styles.section}>
              <AppText variant="h2">Open requests</AppText>
              <View style={styles.list}>
                {open.map((request) => {
                  const busy =
                    respond.isPending && respond.variables?.id === request.id;
                  return (
                    <RequestCard
                      key={request.id}
                      request={request}
                      perspective="teacher"
                      actions={
                        request.status === "pending_teacher" ? (
                          <>
                            <Button
                              title={busy ? "Saving…" : "Confirm time"}
                              size="sm"
                              loading={busy}
                              disabled={respond.isPending}
                              onPress={() => decide(request.id, "confirm")}
                            />
                            <Button
                              title="Decline"
                              size="sm"
                              variant="danger"
                              disabled={respond.isPending}
                              onPress={() => decide(request.id, "reject")}
                            />
                          </>
                        ) : request.status === "pending_admin" ? (
                          <AppText variant="caption" color="muted">
                            Waiting for academy approval
                          </AppText>
                        ) : (
                          <AppText variant="caption" color="muted">
                            Waiting for the student&apos;s confirmation
                          </AppText>
                        )
                      }
                    />
                  );
                })}
              </View>
            </View>
          ) : (
            <EmptyState
              icon="mail-open-outline"
              title="No open requests"
              body="When a student requests one of your open times, it will appear here."
            />
          )}

          {history.length ? (
            <View style={styles.section}>
              <AppText variant="h2">History</AppText>
              <View style={styles.list}>
                {history.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    perspective="teacher"
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  block: { marginTop: 14 },
  linkBody: { marginTop: 4 },
  sections: { marginTop: 20, gap: 26 },
  section: { gap: 12 },
  list: { gap: 10 },
});
