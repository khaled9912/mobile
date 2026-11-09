import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import {
  getAssignedWeeklyAvailability,
  getTeacherDirectory,
} from "@/api/scheduling";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { PersonRowSkeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { RoleGate } from "@/components/ui/role-gate";
import { formatWeeklyTimeRange, WEEKDAY_SHORT } from "@/lib/format";
import {
  getViewerTimeZone,
  toViewerWeeklyTime,
  viewerWeekdays,
} from "@/lib/weekly-time";
import { TimeZoneNote } from "@/components/student/time-zone-note";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { StudentOpenOffers } from "@/features/offers/student-open-offers";

export default function BookScreen() {
  const { role } = useAuth();
  const { colors, radius } = useTheme();
  const viewerTimeZone = getViewerTimeZone();
  const directoryQuery = useQuery({
    queryKey: ["teacher-directory"],
    queryFn: getTeacherDirectory,
    enabled: role === "student",
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const assignedQuery = useQuery({
    queryKey: ["assigned-teacher"],
    queryFn: getAssignedWeeklyAvailability,
    enabled: role === "student",
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const teachers = directoryQuery.data ?? [];
  const assigned = assignedQuery.data;
  const assignedTeacher = assigned?.teacher ?? null;
  const series = assigned?.series ?? [];
  const otherTeachers = assignedTeacher
    ? teachers.filter((entry) => entry.teacher.id !== assignedTeacher.id)
    : teachers;
  const showDirectory = !assignedTeacher || otherTeachers.length > 0;
  const directoryBusy = directoryQuery.isLoading || assignedQuery.isLoading;
  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([directoryQuery.refetch(), assignedQuery.refetch()])
  );

  return (
    <RoleGate roles={["student"]}>
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <PageHeader
          eyebrow="Student portal"
          title="Book your weekly lessons"
          subtitle="Pick any weekly times that suit you. Once booked, the time is yours every week — no approval needed."
        />

        {!assignedQuery.isLoading && !assignedTeacher ? (
          <StudentOpenOffers />
        ) : null}

        {assignedTeacher ? (
          <View style={styles.assigned}>
            <SectionHeader title="Your teacher" />
            <Card
              onPress={() =>
                router.push(`/teachers/${assignedTeacher.id}`)
              }
              accessibilityLabel={`Open ${assignedTeacher.fullName}'s profile`}
            >
              <View style={styles.row}>
                <Avatar
                  name={assignedTeacher.fullName}
                  avatarUrl={assignedTeacher.avatarUrl}
                  size={52}
                />
                <View style={styles.copy}>
                  <AppText variant="h3">{assignedTeacher.fullName}</AppText>
                  {assigned && assigned.averageRating != null ? (
                    <StarRating
                      value={assigned.averageRating}
                      size={13}
                      showValue
                    />
                  ) : null}
                  <AppText variant="caption" color="muted">
                    {series.length
                      ? `${series.length} weekly time${
                          series.length === 1 ? "" : "s"
                        } booked`
                      : "No weekly time booked yet"}
                  </AppText>
                </View>
              </View>
            </Card>

            {series.length ? (
              <>
                <TimeZoneNote
                  zone={viewerTimeZone}
                  sourceZone={series[0]?.timeZoneId}
                />
                <View style={styles.series}>
                  {series.map((item) => {
                    const local = toViewerWeeklyTime(item, viewerTimeZone);
                    return (
                      <Card key={item.id}>
                        <View style={styles.row}>
                          <View
                            style={[
                              styles.dayChip,
                              {
                                backgroundColor: colors.brandSoft,
                                borderRadius: radius.md,
                              },
                            ]}
                          >
                            <AppText variant="caption" weight="700" color="link">
                              {WEEKDAY_SHORT[local.dayOfWeek]}
                            </AppText>
                          </View>
                          <View style={styles.copy}>
                            <AppText variant="body" weight="600">
                              {formatWeeklyTimeRange(
                                local.startsAtTime,
                                local.endsAtTime
                              )}
                            </AppText>
                            <AppText variant="caption" color="muted">
                              Repeats every {WEEKDAY_SHORT[local.dayOfWeek]}
                            </AppText>
                          </View>
                          <Button
                            title="Change"
                            size="sm"
                            variant="secondary"
                            onPress={() =>
                              router.push(`/change-time/${item.id}`)
                            }
                          />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </>
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="No weekly time yet"
                body={`Open ${assignedTeacher.fullName}'s profile, then pick the weekly times that suit you.`}
                action={
                  <Button
                    title="Choose weekly times"
                    size="sm"
                    onPress={() =>
                      router.push(`/teachers/${assignedTeacher.id}`)
                    }
                  />
                }
              />
            )}
            {series.length ? (
              <Button
                title="Add another weekly time"
                size="sm"
                variant="secondary"
                onPress={() => router.push(`/teachers/${assignedTeacher.id}`)}
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.directory}>
          {showDirectory ? (
            <SectionHeader
              title={
                assignedTeacher ? "Other teachers" : "Choose your teacher"
              }
            />
          ) : null}
          {!showDirectory ? null : directoryBusy ? (
            <View style={styles.list}>
              {[0, 1, 2].map((key) => (
                <PersonRowSkeleton key={key} />
              ))}
            </View>
          ) : directoryQuery.isError ? (
            <ErrorView
              error={directoryQuery.error}
              onRetry={() => void directoryQuery.refetch()}
            />
          ) : otherTeachers.length ? (
            <View style={styles.list}>
              {otherTeachers.map((entry) => {
                const open = entry.slots.filter(
                  (slot) => slot.status === "available"
                );
                const days = viewerWeekdays(open, viewerTimeZone);
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
                          {open.length
                            ? `${open.length} weekly time${
                                open.length === 1 ? "" : "s"
                              } available`
                            : "No weekly times right now"}
                        </AppText>
                      </View>
                    </View>
                    {days.length ? (
                      <View style={styles.days}>
                        {days.map((day) => (
                          <Badge
                            key={day}
                            label={WEEKDAY_SHORT[day]}
                            tone="neutral"
                          />
                        ))}
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
              body="No teacher has announced weekly times yet. Please check back soon."
            />
          )}
        </View>
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  assigned: { marginTop: 22, gap: 12 },
  series: { gap: 10 },
  directory: { marginTop: 28, gap: 12 },
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
  days: { flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "wrap" },
  dayChip: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
