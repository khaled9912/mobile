import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { getAdminChangeRequests } from "@/api/scheduling";
import { getLessons } from "@/api/lessons";
import { getStudents, getTeachers } from "@/api/people";
import { useAuth } from "@/providers/auth-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import {
  LessonCardSkeleton,
  PageHeaderSkeleton,
  SectionHeaderSkeleton,
  StatRowSkeleton,
  TextCardSkeleton,
} from "@/components/ui/skeleton";
import { LessonCard } from "@/components/lesson/lesson-card";
import { ChangeRequestCard } from "@/components/lesson/change-request-card";
import { firstName, upcomingLessons } from "@/lib/lesson-selectors";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const AdminHome = () => {
  const { user } = useAuth();
  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const changesQuery = useQuery({
    queryKey: ["change-requests", "admin", "recent"],
    queryFn: () => getAdminChangeRequests(),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const studentsQuery = useQuery({
    queryKey: ["admin", "students"],
    queryFn: () => getStudents(),
  });
  const teachersQuery = useQuery({
    queryKey: ["admin", "teachers"],
    queryFn: () => getTeachers(),
  });

  const lessons = lessonsQuery.data ?? [];
  const changes = changesQuery.data ?? [];
  const upcoming = upcomingLessons(lessons);
  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([
      lessonsQuery.refetch(),
      changesQuery.refetch(),
      studentsQuery.refetch(),
      teachersQuery.refetch(),
    ])
  );
  const loading =
    lessonsQuery.isLoading ||
    changesQuery.isLoading ||
    studentsQuery.isLoading ||
    teachersQuery.isLoading;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {loading ? (
        <PageHeaderSkeleton titleLines={2} />
      ) : (
        <PageHeader
          eyebrow="Academy administration"
          title={`Assalamu alaikum${
            user?.fullName ? `, ${firstName(user.fullName)}` : ""
          }`}
          subtitle="See the weekly times students moved, monitor the schedule, and keep the academy running."
        />
      )}

      {loading ? (
        <StatRowSkeleton />
      ) : (
        <View style={styles.stats}>
          <StatCard label="Time changes" value={changes.length} />
          <StatCard label="Upcoming lessons" value={upcoming.length} />
          <StatCard label="Students" value={studentsQuery.data?.length ?? 0} />
          <StatCard label="Teachers" value={teachersQuery.data?.length ?? 0} />
        </View>
      )}

      <View style={styles.section}>
        {loading ? (
          <>
            <SectionHeaderSkeleton />
            <TextCardSkeleton lines={3} />
            <TextCardSkeleton lines={3} />
          </>
        ) : (
          <>
            <SectionHeader
              title="Recent time changes"
              action={
                <Button
                  title="Open log"
                  variant="ghost"
                  size="sm"
                  onPress={() => router.navigate("/requests")}
                />
              }
            />
            {changesQuery.isError ? (
              <ErrorView
                error={changesQuery.error}
                onRetry={() => void changesQuery.refetch()}
              />
            ) : changes.length ? (
              <View style={styles.list}>
                {changes.slice(0, 3).map((change) => (
                  <ChangeRequestCard
                    key={change.id}
                    request={change}
                    perspective="admin"
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="No time changes"
                body="Students move their own weekly time between the slots their teacher publishes. Every move is recorded here and you get a notification."
              />
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        {loading ? (
          <>
            <SectionHeaderSkeleton />
            <LessonCardSkeleton />
          </>
        ) : (
          <>
            <SectionHeader
              title="Coming up"
              action={
                <Button
                  title="Schedule"
                  variant="ghost"
                  size="sm"
                  onPress={() => router.navigate("/schedule")}
                />
              }
            />
            {upcoming.length ? (
              <View style={styles.list}>
                {upcoming.slice(0, 3).map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    perspective="admin"
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="No upcoming lessons"
                body="Booked weekly lessons will appear in the academy schedule."
              />
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Academy directory" />
        <View style={styles.quickLinks}>
          <Card onPress={() => router.push("/admin/lesson-ops")}>
            <AppText variant="h3">Lesson operations</AppText>
            <AppText variant="small" color="muted" style={styles.linkBody}>
              Monitor live lessons, review attendance, approve pay, and manage
              the cancellation policy.
            </AppText>
          </Card>
          <Card onPress={() => router.navigate("/people")}>
            <AppText variant="h3">People</AppText>
            <AppText variant="small" color="muted" style={styles.linkBody}>
              Browse students, teachers, and active assignments.
            </AppText>
          </Card>
          <Card onPress={() => router.push("/contact-submissions")}>
            <AppText variant="h3">Contact messages</AppText>
            <AppText variant="small" color="muted" style={styles.linkBody}>
              Read messages sent through the public contact form.
            </AppText>
          </Card>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { marginTop: 26, gap: 12 },
  list: { gap: 10, marginTop: 4 },
  quickLinks: { gap: 12 },
  linkBody: { marginTop: 4 },
});
