import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import {
  getAssignedTeacherAvailability,
  getMyLessonRequests,
  getTeacherDirectory,
} from "@/api/scheduling";
import { useAuth } from "@/providers/auth-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { StarRating } from "@/components/ui/star-rating";
import { RoleGate } from "@/components/ui/role-gate";
import { formatDateTime, formatTimeRange, relativeDay } from "@/lib/format";
import { openRequests } from "@/lib/lesson-selectors";

export default function BookScreen() {
  const { role } = useAuth();
  const directoryQuery = useQuery({
    queryKey: ["teacher-directory"],
    queryFn: getTeacherDirectory,
    enabled: role === "student",
  });
  const requestsQuery = useQuery({
    queryKey: ["lesson-requests", "student"],
    queryFn: getMyLessonRequests,
    enabled: role === "student",
  });
  const assignedQuery = useQuery({
    queryKey: ["assigned-teacher"],
    queryFn: getAssignedTeacherAvailability,
    enabled: role === "student",
  });

  const teachers = directoryQuery.data ?? [];
  const open = openRequests(requestsQuery.data ?? []);
  const assignedId = assignedQuery.data?.teacher?.id ?? null;
  const refreshing =
    directoryQuery.isFetching ||
    requestsQuery.isFetching ||
    assignedQuery.isFetching;

  const refresh = () => {
    void directoryQuery.refetch();
    void requestsQuery.refetch();
    void assignedQuery.refetch();
  };

  return (
    <RoleGate roles={["student"]}>
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <PageHeader
          eyebrow="Student portal"
          title="Choose your teacher"
          subtitle="Pick a teacher and an open time. Your teacher confirms first, then the academy approves the lesson."
        />

        {open.length ? (
          <View style={styles.block}>
            <Notice
              tone="warning"
              title="Request already in progress"
              message={`You have a lesson request awaiting approval for ${formatDateTime(open[0].startsAt)}. You can request another lesson once this one is resolved.`}
            />
          </View>
        ) : null}

        {directoryQuery.isLoading || requestsQuery.isLoading ? (
          <LoadingView label="Loading teacher profiles…" />
        ) : directoryQuery.isError ? (
          <ErrorView
            error={directoryQuery.error}
            onRetry={() => void directoryQuery.refetch()}
          />
        ) : teachers.length ? (
          <View style={styles.list}>
            {teachers.map((entry) => {
              const nextSlot = entry.slots[0];
              return (
                <Card
                  key={entry.teacher.id}
                  onPress={() => router.push(`/teachers/${entry.teacher.id}`)}
                  accessibilityLabel={`Open ${entry.teacher.fullName}'s profile`}
                >
                  <View style={styles.row}>
                    <Avatar
                      name={entry.teacher.fullName}
                      avatarUrl={entry.teacher.avatarUrl}
                      size={52}
                    />
                    <View style={styles.copy}>
                      <View style={styles.nameRow}>
                        <AppText variant="h3">
                          {entry.teacher.fullName}
                        </AppText>
                        {entry.teacher.id === assignedId ? (
                          <Badge label="Your teacher" tone="success" />
                        ) : null}
                      </View>
                      <View style={styles.ratingRow}>
                        {entry.reviewCount > 0 &&
                        entry.averageRating != null ? (
                          <>
                            <StarRating
                              value={entry.averageRating}
                              size={13}
                              showValue
                            />
                            <AppText variant="caption" color="muted">
                              ({entry.reviewCount})
                            </AppText>
                          </>
                        ) : (
                          <AppText variant="caption" color="muted">
                            New teacher
                          </AppText>
                        )}
                      </View>
                      <AppText variant="caption" color="muted">
                        {entry.slots.length
                          ? `${entry.slots.length} open time${entry.slots.length === 1 ? "" : "s"}`
                          : "No open times right now"}
                      </AppText>
                    </View>
                  </View>
                  {nextSlot ? (
                    <View style={styles.nextSlot}>
                      <AppText variant="caption" color="muted">
                        Next available
                      </AppText>
                      <AppText variant="small" weight="600">
                        {relativeDay(nextSlot.startsAt)} ·{" "}
                        {formatTimeRange(nextSlot.startsAt, nextSlot.endsAt)}
                      </AppText>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="people-outline"
            title="No teachers are listed"
            body="No teacher is accepting lesson requests right now. Please contact the academy."
          />
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 16 },
  list: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  copy: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  nextSlot: { marginTop: 14, gap: 2 },
});
