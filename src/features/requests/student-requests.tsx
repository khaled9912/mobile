import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  getMyLessonRequests,
  respondToRequestAsStudent,
} from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RequestCard } from "@/components/lesson/request-card";
import { openRequests } from "@/lib/lesson-selectors";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const StudentRequests = () => {
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({
    queryKey: ["lesson-requests", "student"],
    queryFn: getMyLessonRequests,
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
    }) => respondToRequestAsStudent(id, decision),
    onSuccess: async (_, variables) => {
      setError("");
      setNotice(
        variables.decision === "confirm"
          ? "Request confirmed. The academy will review it next."
          : "Request declined."
      );
      await queryClient.invalidateQueries({ queryKey: ["lesson-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] });
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
        "Decline this lesson?",
        "The teacher will be told the time is no longer possible.",
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
        eyebrow="Student portal"
        title="Lesson requests"
        subtitle="A lesson is confirmed after your teacher and the academy approve it."
      />

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
        <LoadingView label="Loading your requests…" />
      ) : requestsQuery.isError ? (
        <ErrorView
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
        />
      ) : (
        <View style={styles.sections}>
          {open.length ? (
            <View style={styles.section}>
              <AppText variant="h2">Awaiting confirmation</AppText>
              <View style={styles.list}>
                {open.map((request) => {
                  const busy =
                    respond.isPending && respond.variables?.id === request.id;
                  return (
                    <RequestCard
                      key={request.id}
                      request={request}
                      perspective="student"
                      actions={
                        request.status === "pending_student" ? (
                          <>
                            <Button
                              title={busy ? "Saving…" : "Confirm"}
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
                        ) : undefined
                      }
                    />
                  );
                })}
              </View>
            </View>
          ) : (
            <EmptyState
              icon="mail-open-outline"
              title="No active requests"
              body="Book a lesson with a teacher and it will appear here while it is being approved."
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
                    perspective="student"
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
  block: { marginBottom: 14 },
  sections: { gap: 26 },
  section: { gap: 12 },
  list: { gap: 10 },
});
