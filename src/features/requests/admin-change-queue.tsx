import { useState } from "react";
import { Alert, Modal, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import type { ChangeRequestStatus } from "@/api/types";
import {
  approveChangeRequest,
  getAdminChangeRequests,
  rejectChangeRequest,
} from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { ChangeRequestCard } from "@/components/lesson/change-request-card";
import { useTheme } from "@/providers/theme-provider";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const AdminChangeQueue = () => {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<ChangeRequestStatus>("pending");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const changesQuery = useQuery({
    queryKey: ["change-requests", "admin", filter],
    queryFn: () => getAdminChangeRequests(filter),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(changesQuery.refetch);

  const decide = useMutation({
    mutationFn: ({
      id,
      note,
    }: {
      id: string;
      note?: string;
    }) =>
      note != null ? rejectChangeRequest(id, note) : approveChangeRequest(id),
    onSuccess: async (_, variables) => {
      setError("");
      setNotice(
        variables.note != null
          ? "Change declined. The student keeps their current weekly time."
          : "Change approved. The weekly lessons now use the new time."
      );
      setRejecting(null);
      setRejectNote("");
      await queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["series"] });
      await queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] });
      await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
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

  const changes = changesQuery.data ?? [];

  const approve = (id: string) => {
    setNotice("");
    Alert.alert(
      "Approve this time change?",
      "Check the new time with the teacher first. Approving moves all future weekly lessons for this student.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => decide.mutate({ id }),
        },
      ]
    );
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Academy administration"
        title="Time change requests"
        subtitle="Students never see a pending state in their schedule until you approve. Confirm the new time with the teacher first."
      />

      <Segmented
        label="Change request filter"
        value={filter}
        onChange={(next) => {
          setNotice("");
          setError("");
          setFilter(next);
        }}
        options={[
          { value: "pending", label: "Pending" },
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
        {changesQuery.isLoading ? (
          <LoadingView label="Loading time change requests…" />
        ) : changesQuery.isError ? (
          <ErrorView
            error={changesQuery.error}
            onRetry={() => void changesQuery.refetch()}
          />
        ) : changes.length ? (
          changes.map((change) => {
            const busy = decide.isPending && decide.variables?.id === change.id;
            return (
              <ChangeRequestCard
                key={change.id}
                request={change}
                perspective="admin"
                actions={
                  filter === "pending" ? (
                    <>
                      <Button
                        title={busy ? "Saving…" : "Approve"}
                        size="sm"
                        loading={busy}
                        disabled={decide.isPending}
                        onPress={() => approve(change.id)}
                      />
                      <Button
                        title="Decline"
                        size="sm"
                        variant="danger"
                        disabled={decide.isPending}
                        onPress={() => {
                          setNotice("");
                          setError("");
                          setRejectNote("");
                          setRejecting(change.id);
                        }}
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
              filter === "pending"
                ? "shield-checkmark-outline"
                : "archive-outline"
            }
            title={
              filter === "pending"
                ? "Nothing waiting"
                : filter === "approved"
                  ? "No approved changes"
                  : "No declined changes"
            }
            body={
              filter === "pending"
                ? "Students requesting a different weekly time will appear here."
                : "Reviewed requests are kept here for your records."
            }
          />
        )}
      </View>

      <Modal
        visible={rejecting != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <View style={styles.modalRoot}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <AppText variant="h3">Decline this change</AppText>
            <AppText variant="small" color="muted">
              The student keeps their current weekly time. Add a short reason
              for your records.
            </AppText>
            <TextField
              label="Reason (optional)"
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="e.g. The teacher is not available at that time"
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setRejecting(null)}
              />
              <Button
                title={decide.isPending ? "Saving…" : "Decline"}
                variant="danger"
                loading={decide.isPending}
                disabled={decide.isPending}
                onPress={() => {
                  if (!rejecting) return;
                  decide.mutate({ id: rejecting, note: rejectNote.trim() });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {filter === "pending" ? (
        <Card style={styles.footnote}>
          <AppText variant="caption" color="muted">
            Approving deletes the remaining weekly lessons and recreates them at
            the new time. The old time becomes open for other students.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  block: { marginTop: 14 },
  list: { marginTop: 18, gap: 10 },
  footnote: { marginTop: 16 },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
});
