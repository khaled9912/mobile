import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import type { LessonRequestStatus } from "@/api/types";
import {
  approveLessonRequest,
  getAdminLessonRequests,
  rejectLessonRequest,
} from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RequestCard } from "@/components/lesson/request-card";

type Filter = Extract<
  LessonRequestStatus,
  "pending_admin" | "approved" | "rejected"
>;

export const AdminApprovals = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending_admin");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const approvalsQuery = useQuery({
    queryKey: ["lesson-requests", "admin", filter],
    queryFn: () => getAdminLessonRequests(filter),
  });

  const decide = useMutation({
    mutationFn: ({
      id,
      approve,
    }: {
      id: string;
      approve: boolean;
    }) => (approve ? approveLessonRequest(id) : rejectLessonRequest(id)),
    onSuccess: async (_, variables) => {
      setError("");
      setNotice(
        variables.approve
          ? "Lesson approved. It now appears in both schedules."
          : "Request declined. The teacher and student can see the outcome."
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

  const requests = approvalsQuery.data ?? [];

  const act = (id: string, approve: boolean) => {
    setNotice("");
    Alert.alert(
      approve ? "Approve this lesson?" : "Decline this request?",
      approve
        ? "Both the teacher and student will be notified in their schedules."
        : "The time will be released and the request marked as declined.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: approve ? "Approve" : "Decline",
          style: approve ? "default" : "destructive",
          onPress: () => decide.mutate({ id, approve }),
        },
      ]
    );
  };

  return (
    <Screen
      refreshing={approvalsQuery.isFetching}
      onRefresh={() => void approvalsQuery.refetch()}
    >
      <PageHeader
        eyebrow="Academy administration"
        title="Lesson approvals"
        subtitle="Final review for every lesson already confirmed by a teacher."
      />

      <Segmented
        label="Approval filter"
        value={filter}
        onChange={(next) => {
          setNotice("");
          setError("");
          setFilter(next);
        }}
        options={[
          { value: "pending_admin", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Declined" },
        ]}
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

      <View style={styles.list}>
        {approvalsQuery.isLoading ? (
          <LoadingView label="Loading approvals…" />
        ) : approvalsQuery.isError ? (
          <ErrorView
            error={approvalsQuery.error}
            onRetry={() => void approvalsQuery.refetch()}
          />
        ) : requests.length ? (
          requests.map((request) => {
            const busy =
              decide.isPending && decide.variables?.id === request.id;
            return (
              <RequestCard
                key={request.id}
                request={request}
                perspective="admin"
                actions={
                  filter === "pending_admin" ? (
                    <>
                      <Button
                        title={busy ? "Saving…" : "Approve"}
                        size="sm"
                        loading={busy}
                        disabled={decide.isPending}
                        onPress={() => act(request.id, true)}
                      />
                      <Button
                        title="Decline"
                        size="sm"
                        variant="danger"
                        disabled={decide.isPending}
                        onPress={() => act(request.id, false)}
                      />
                    </>
                  ) : undefined
                }
              />
            );
          })
        ) : (
          <EmptyState
            icon={
              filter === "pending_admin"
                ? "shield-checkmark-outline"
                : "archive-outline"
            }
            title={
              filter === "pending_admin"
                ? "No requests waiting"
                : filter === "approved"
                  ? "No approved requests"
                  : "No declined requests"
            }
            body={
              filter === "pending_admin"
                ? "Requests confirmed by teachers appear here for final approval."
                : "This list fills up as you review lesson requests."
            }
          />
        )}
      </View>
      {filter === "pending_admin" ? (
        <AppText variant="caption" color="muted" style={styles.footnote}>
          Approving checks for scheduling conflicts and creates the lesson for
          both participants.
        </AppText>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  block: { marginTop: 14 },
  list: { marginTop: 18, gap: 10 },
  footnote: { marginTop: 16, lineHeight: 18 },
});
