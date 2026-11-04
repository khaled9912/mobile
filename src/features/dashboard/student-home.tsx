import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { getLessons } from "@/api/lessons";
import {
  getAssignedWeeklyAvailability,
  getMyChangeRequests,
} from "@/api/scheduling";
import { useAuth } from "@/providers/auth-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { StatCard, InfoRow } from "@/components/ui/stat-card";
import {
  LessonCardSkeleton,
  Skeleton,
  StatRowSkeleton,
} from "@/components/ui/skeleton";
import { LessonCard } from "@/components/lesson/lesson-card";
import { ChangeRequestCard } from "@/components/lesson/change-request-card";
import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import {
  firstName,
  todayLessons,
  upcomingLessons,
} from "@/lib/lesson-selectors";
import { formatWeeklySlot } from "@/lib/format";
import { getViewerTimeZone, toViewerWeeklyTime } from "@/lib/weekly-time";
import { TimeZoneNote } from "@/components/student/time-zone-note";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const StudentHome = () => {
  const { user, offlineSession } = useAuth();
  const viewerTimeZone = getViewerTimeZone();
  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const changesQuery = useQuery({
    queryKey: ["change-requests", "student"],
    queryFn: getMyChangeRequests,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const teacherQuery = useQuery({
    queryKey: ["assigned-teacher"],
    queryFn: getAssignedWeeklyAvailability,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const lessons = lessonsQuery.data ?? [];
  const today = todayLessons(lessons);
  const next = today[0];
  const hasLaterLessons = upcomingLessons(lessons).length > 0;
  const pendingChanges = (changesQuery.data ?? [])
    .filter((change) => change.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const teacher = teacherQuery.data?.teacher ?? null;
  const series = teacherQuery.data?.series ?? [];
  const completed = lessons.filter((lesson) => lesson.status === "completed");
  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([
      lessonsQuery.refetch(),
      changesQuery.refetch(),
      teacherQuery.refetch(),
    ])
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Student portal"
        title={`Assalamu alaikum${user ? `, ${firstName(user.fullName)}` : ""}`}
        subtitle="Your weekly lessons, teacher, and time changes in one place."
      />

      {offlineSession ? (
        <View style={styles.block}>
          <Notice
            tone="warning"
            message="You're offline. Your saved lessons are shown; changes will sync when you reconnect."
          />
        </View>
      ) : null}

      {lessonsQuery.isLoading ? (
        <StatRowSkeleton />
      ) : (
        <View style={styles.stats}>
          <StatCard label="Today" value={today.length} />
          <StatCard label="Weekly times" value={series.length} />
          <StatCard label="Changes" value={pendingChanges.length} />
          <StatCard label="Completed" value={completed.length} />
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader
          title="Today's lesson"
          action={
            <Button
              title="Schedule"
              variant="ghost"
              size="sm"
              onPress={() => router.navigate("/schedule")}
            />
          }
        />
        {lessonsQuery.isLoading ? (
          <LessonCardSkeleton />
        ) : lessonsQuery.isError ? (
          <ErrorView
            error={lessonsQuery.error}
            onRetry={() => void lessonsQuery.refetch()}
          />
        ) : next ? (
          <LessonCard
            lesson={next}
            perspective="student"
            action={
              <Button
                title="Open lesson room"
                size="sm"
                onPress={() => router.push(`/lesson/${next.id}`)}
              />
            }
          />
        ) : hasLaterLessons ? (
          <EmptyState
            icon="calendar-outline"
            title="No lessons today"
            body="Your next lesson shows here on the day. Open the schedule to see the week ahead."
            action={
              <Button
                title="Open schedule"
                size="sm"
                onPress={() => router.navigate("/schedule")}
              />
            }
          />
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No lessons booked yet"
            body="Choose a teacher and pick your weekly times. Your first lesson is a trial."
            action={
              <Button
                title="Book weekly lessons"
                size="sm"
                onPress={() => router.navigate("/book")}
              />
            }
          />
        )}
      </View>

      {pendingChanges.length ? (
        <View style={styles.section}>
          <SectionHeader
            title="Time changes"
            action={
              <Button
                title="See all"
                variant="ghost"
                size="sm"
                onPress={() => router.navigate("/requests")}
              />
            }
          />
          <View style={styles.list}>
            {pendingChanges.slice(0, 2).map((change) => (
              <ChangeRequestCard
                key={change.id}
                request={change}
                perspective="student"
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Your teacher" />
        {teacherQuery.isLoading ? (
          <Card>
            <View style={styles.personRow}>
              <Skeleton width={52} height={52} radius={26} />
              <View style={styles.personCopy}>
                <Skeleton width="55%" height={18} />
                <Skeleton width="40%" height={12} />
                <Skeleton width="45%" height={12} />
              </View>
            </View>
          </Card>
        ) : teacher ? (
          <Card>
            <View style={styles.personRow}>
              <Avatar
                name={teacher.fullName}
                avatarUrl={teacher.avatarUrl}
                size={52}
              />
              <View style={styles.personCopy}>
                <AppText variant="h3">{teacher.fullName}</AppText>
                <AppText variant="caption" color="muted">
                  {teacherQuery.data?.averageRating
                    ? `${teacherQuery.data.averageRating.toFixed(1)} ★ · ${teacherQuery.data.reviewCount} reviews`
                    : "Your assigned teacher"}
                </AppText>
                <AppText variant="caption" color="muted">
                  {series.length
                    ? `${series.length} weekly time${series.length === 1 ? "" : "s"} booked`
                    : "No weekly time yet"}
                </AppText>
              </View>
            </View>
            {series.length ? (
              <View style={styles.series}>
                <TimeZoneNote
                  zone={viewerTimeZone}
                  sourceZone={series[0]?.timeZoneId}
                />
                {series.map((item) => {
                  const local = toViewerWeeklyTime(item, viewerTimeZone);
                  return (
                    <AppText key={item.id} variant="caption" color="muted">
                      {formatWeeklySlot(
                        local.dayOfWeek,
                        local.startsAtTime,
                        local.endsAtTime
                      )}
                    </AppText>
                  );
                })}
              </View>
            ) : null}
            <View style={styles.rowActions}>
              <Button
                title="View teacher"
                variant="secondary"
                size="sm"
                onPress={() => router.push(`/teachers/${teacher.id}`)}
              />
              <Button
                title={series.length ? "Add weekly time" : "Choose weekly times"}
                size="sm"
                onPress={() => router.navigate("/book")}
              />
            </View>
          </Card>
        ) : (
          <EmptyState
            icon="person-add-outline"
            title="No teacher yet"
            body="Choose an available teacher and book your first weekly lesson. The academy can also help."
            action={
              <Button
                title="Find a teacher"
                size="sm"
                onPress={() => router.navigate("/book")}
              />
            }
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Need help?" />
        <Card>
          <InfoRow
            label="Academy team"
            value="Time changes, billing, or account questions"
          />
          <View style={styles.helpAction}>
            <Button
              title="Contact us"
              variant="secondary"
              size="sm"
              fullWidth
              onPress={() => router.push("/contact")}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  block: { marginBottom: 16 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { marginTop: 26, gap: 12 },
  list: { gap: 10 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  personCopy: { flex: 1, gap: 2 },
  series: { marginTop: 12, gap: 3 },
  rowActions: { flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" },
  helpAction: { marginTop: 14 },
});
