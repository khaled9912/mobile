import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  getTeacherStudentAvailability,
  selectStudentAvailability,
} from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";
import {
  formatDateTime,
  formatLongDate,
  formatTimeRange,
  relativeDay,
} from "@/lib/format";

export default function StudentAvailabilityScreen() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ["student-availability", "teacher"],
    queryFn: getTeacherStudentAvailability,
  });

  const select = useMutation({
    mutationFn: (slotId: string) => selectStudentAvailability(slotId),
    onSuccess: async (request) => {
      setError(null);
      setNotice(
        `A lesson has been proposed to ${request.studentName} for ${formatDateTime(
          request.startsAt
        )}. The student confirms first, then the academy approves it.`
      );
      await queryClient.invalidateQueries({
        queryKey: ["student-availability"],
      });
      await queryClient.invalidateQueries({ queryKey: ["lesson-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
    onError: (mutationError) => {
      setNotice(null);
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Unable to propose this time. Please try again."
      );
    },
  });

  const slots = slotsQuery.data ?? [];

  const confirmSelect = (slotId: string, studentName: string, label: string) => {
    Alert.alert(
      "Propose this lesson?",
      `${studentName} offered ${label}. This creates a request the student must confirm before the academy approves it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Propose lesson",
          onPress: () => select.mutate(slotId),
        },
      ]
    );
  };

  return (
    <RoleGate roles={["teacher"]}>
      <Screen
        edges={["left", "right"]}
        refreshing={slotsQuery.isFetching}
        onRefresh={() => void slotsQuery.refetch()}
      >
        <PageHeader
          eyebrow="Teacher portal"
          title="Student preferences"
          subtitle="Times your students have offered. Propose a lesson and the student confirms it."
        />

        {error ? (
          <View style={styles.block}>
            <Notice tone="error" message={error} />
          </View>
        ) : null}
        {notice ? (
          <View style={styles.block}>
            <Notice tone="success" message={notice} />
          </View>
        ) : null}

        {slotsQuery.isLoading ? (
          <LoadingView label="Loading student preferences…" />
        ) : slotsQuery.isError ? (
          <ErrorView
            error={slotsQuery.error}
            onRetry={() => void slotsQuery.refetch()}
          />
        ) : slots.length ? (
          <View style={styles.list}>
            {slots.map((slot) => {
              const working =
                select.isPending && select.variables === slot.id;
              const label = `${formatDateTime(slot.startsAt)} – ${formatTimeRange(
                slot.startsAt,
                slot.endsAt
              )}`;
              return (
                <Card key={slot.id}>
                  <View style={styles.slotRow}>
                    <View style={styles.slotCopy}>
                      <AppText variant="caption" color="gold" weight="700">
                        {relativeDay(slot.startsAt).toUpperCase()}
                      </AppText>
                      <AppText variant="h3">{slot.studentName}</AppText>
                      <AppText variant="small" weight="600">
                        {formatTimeRange(slot.startsAt, slot.endsAt)}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        {formatLongDate(slot.startsAt)}
                      </AppText>
                    </View>
                    <Button
                      title={working ? "Proposing…" : "Propose"}
                      size="sm"
                      loading={working}
                      disabled={select.isPending}
                      onPress={() =>
                        confirmSelect(slot.id, slot.studentName, label)
                      }
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="time-outline"
            title="No student preferences"
            body="When a student offers times they are available, they will appear here for you to propose a lesson."
          />
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  list: { gap: 10 },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  slotCopy: { flex: 1, gap: 2 },
});
