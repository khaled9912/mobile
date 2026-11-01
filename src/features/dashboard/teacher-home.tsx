import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import {
  getIncomingLessonRequests,
  getMyAvailability,
} from "@/api/scheduling";
import { getLessons } from "@/api/lessons";
import { useAuth } from "@/providers/auth-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { LessonCard } from "@/components/lesson/lesson-card";
import { RequestCard } from "@/components/lesson/request-card";
import { firstName, upcomingLessons } from "@/lib/lesson-selectors";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { isReportDue } from "@/lib/status";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const TeacherHome = () => {
  const { user } = useAuth();
  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const requestsQuery = useQuery({
    queryKey: ["lesson-requests", "teacher"],
    queryFn: getIncomingLessonRequests,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const availabilityQuery = useQuery({
    queryKey: ["availability", "teacher"],
    queryFn: getMyAvailability,
  });

  const lessons = lessonsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const slots = availabilityQuery.data ?? [];
  const upcoming = upcomingLessons(lessons);
  const pending = requests.filter(
    (request) => request.status === "pending_teacher"
  );
  const reportsDue = lessons
    .filter(isReportDue)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const openSlots = slots.filter(
    (slot) =>
      slot.status === "available" &&
      new Date(slot.startsAt).getTime() > availabilityQuery.dataUpdatedAt
  );
  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([
      lessonsQuery.refetch(),
      requestsQuery.refetch(),
      availabilityQuery.refetch(),
    ])
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Teacher portal"
        title={`Assalamu alaikum${user ? `, ${firstName(user.fullName)}` : ""}`}
        subtitle="Your teaching day, pending requests, and lesson reports."
      />

      <View style={styles.stats}>
        <StatCard label="Upcoming lessons" value={upcoming.length} />
        <StatCard label="Requests" value={pending.length} />
        <StatCard label="Reports due" value={reportsDue.length} />
        <StatCard label="Open slots" value={openSlots.length} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Next lessons"
          action={
            <Button
              title="Full schedule"
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
        ) : upcoming.length ? (
          <View style={styles.list}>
            {upcoming.slice(0, 3).map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                perspective="teacher"
                action={
                  <Button
                    title="Open lesson room"
                    size="sm"
                    onPress={() => router.push(`/lesson/${lesson.id}`)}
                  />
                }
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming lessons"
            body="Publish availability so students can request a time."
            action={
              <Button
                title="Manage availability"
                size="sm"
                onPress={() => router.push("/availability")}
              />
            }
          />
        )}
      </View>

      {reportsDue.length ? (
        <View style={styles.section}>
          <SectionHeader
            title="Reports due"
            action={
              <Button
                title="All reports"
                variant="ghost"
                size="sm"
                onPress={() => router.navigate("/schedule")}
              />
            }
          />
          <Card>
            <AppText variant="small" color="muted">
              Submit a report after a lesson ends to complete it and share
              feedback with the student.
            </AppText>
            <View style={styles.list}>
              {reportsDue.slice(0, 3).map((lesson) => (
                <View key={lesson.id} style={styles.reportRow}>
                  <View style={styles.reportCopy}>
                    <AppText variant="label">{lesson.studentName}</AppText>
                    <AppText variant="caption" color="muted">
                      Ended {new Date(lesson.endsAt).toLocaleDateString()}
                    </AppText>
                  </View>
                  <Button
                    title="Write report"
                    size="sm"
                    onPress={() => router.push(`/lesson/${lesson.id}`)}
                  />
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Lesson requests"
          action={
            <Button
              title="Review all"
              variant="ghost"
              size="sm"
              onPress={() => router.navigate("/requests")}
            />
          }
        />
        {requestsQuery.isLoading ? (
          <AppText variant="small" color="muted">
            Loading requests…
          </AppText>
        ) : pending.length ? (
          <View style={styles.list}>
            {pending.slice(0, 2).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                perspective="teacher"
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="mail-open-outline"
            title="No pending requests"
            body="New student requests will appear here for you to confirm."
          />
        )}
      </View>

      <View style={styles.quickLinks}>
        <Card onPress={() => router.push("/availability")}>
          <AppText variant="h3">Manage availability</AppText>
          <AppText variant="small" color="muted" style={styles.linkBody}>
            Publish open lesson times for students to request.
          </AppText>
        </Card>
        <Card onPress={() => router.push("/student-availability")}>
          <AppText variant="h3">Student preferences</AppText>
          <AppText variant="small" color="muted" style={styles.linkBody}>
            See times students have offered and propose a lesson.
          </AppText>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { marginTop: 26, gap: 12 },
  list: { gap: 10, marginTop: 12 },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
  },
  reportCopy: { flex: 1, gap: 2 },
  quickLinks: { marginTop: 26, gap: 12 },
  linkBody: { marginTop: 4 },
});
