import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { getLessons } from "@/api/lessons";
import { getAssignedTeacherAvailability, getMyLessonRequests } from "@/api/scheduling";
import { useAuth } from "@/providers/auth-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { StatCard, InfoRow } from "@/components/ui/stat-card";
import { LessonCard } from "@/components/lesson/lesson-card";
import { RequestCard } from "@/components/lesson/request-card";
import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import {
  firstName,
  openRequests,
  upcomingLessons,
} from "@/lib/lesson-selectors";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const StudentHome = () => {
  const { user, offlineSession } = useAuth();
  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const requestsQuery = useQuery({
    queryKey: ["lesson-requests", "student"],
    queryFn: getMyLessonRequests,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const teacherQuery = useQuery({
    queryKey: ["assigned-teacher"],
    queryFn: getAssignedTeacherAvailability,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const lessons = lessonsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const upcoming = upcomingLessons(lessons);
  const next = upcoming[0];
  const pending = openRequests(requests);
  const teacher = teacherQuery.data?.teacher ?? null;
  const completed = lessons.filter((lesson) => lesson.status === "completed");
  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([
      lessonsQuery.refetch(),
      requestsQuery.refetch(),
      teacherQuery.refetch(),
    ])
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Student portal"
        title={`Assalamu alaikum${user ? `, ${firstName(user.fullName)}` : ""}`}
        subtitle="Your upcoming lessons, teacher, and requests in one place."
      />

      {offlineSession ? (
        <View style={styles.block}>
          <Notice
            tone="warning"
            message="You're offline. Sign-in and new requests will work again when you reconnect."
          />
        </View>
      ) : null}

      <View style={styles.stats}>
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Awaiting reply" value={pending.length} />
        <StatCard label="Completed" value={completed.length} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Next lesson"
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
          <AppText variant="small" color="muted">
            Loading your lessons…
          </AppText>
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
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No confirmed lessons yet"
            body="Choose a teacher and an open time to request your first lesson."
            action={
              <Button
                title="Book a lesson"
                size="sm"
                onPress={() => router.navigate("/book")}
              />
            }
          />
        )}
      </View>

      {pending.length ? (
        <View style={styles.section}>
          <SectionHeader
            title="Pending requests"
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
            {pending.slice(0, 2).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                perspective="student"
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Your teacher" />
        {teacherQuery.isLoading ? (
          <AppText variant="small" color="muted">
            Loading your teacher…
          </AppText>
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
                  {teacherQuery.data?.slots.length ?? 0} open times
                </AppText>
              </View>
            </View>
            <View style={styles.rowActions}>
              <Button
                title="View teacher"
                variant="secondary"
                size="sm"
                onPress={() => router.push(`/teachers/${teacher.id}`)}
              />
              <Button
                title="Book a lesson"
                size="sm"
                onPress={() => router.navigate("/book")}
              />
            </View>
          </Card>
        ) : (
          <EmptyState
            icon="person-add-outline"
            title="No teacher yet"
            body="Choose an available teacher to request your first lesson. The academy can also help."
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
            value="Reschedules, billing, or account questions"
          />
          <View style={styles.rowActions}>
            <Button
              title="Contact us"
              variant="secondary"
              size="sm"
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
  rowActions: { flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" },
});
