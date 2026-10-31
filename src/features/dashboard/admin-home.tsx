import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { getAdminLessonApprovals } from "@/api/scheduling";
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
import { LessonCard } from "@/components/lesson/lesson-card";
import { RequestCard } from "@/components/lesson/request-card";
import { firstName, upcomingLessons } from "@/lib/lesson-selectors";

export const AdminHome = () => {
  const { user } = useAuth();
  const lessonsQuery = useQuery({ queryKey: ["lessons"], queryFn: getLessons });
  const approvalsQuery = useQuery({
    queryKey: ["lesson-requests", "pending-admin"],
    queryFn: getAdminLessonApprovals,
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
  const approvals = approvalsQuery.data ?? [];
  const upcoming = upcomingLessons(lessons);
  const refreshing =
    lessonsQuery.isFetching ||
    approvalsQuery.isFetching ||
    studentsQuery.isFetching ||
    teachersQuery.isFetching;

  const refresh = () => {
    void lessonsQuery.refetch();
    void approvalsQuery.refetch();
    void studentsQuery.refetch();
    void teachersQuery.refetch();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        eyebrow="Academy administration"
        title={`Assalamu alaikum${user ? `, ${firstName(user.fullName)}` : ""}`}
        subtitle="Approve lessons, monitor the schedule, and keep the academy running."
      />

      <View style={styles.stats}>
        <StatCard label="Awaiting approval" value={approvals.length} />
        <StatCard label="Upcoming lessons" value={upcoming.length} />
        <StatCard label="Students" value={studentsQuery.data?.length ?? 0} />
        <StatCard label="Teachers" value={teachersQuery.data?.length ?? 0} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Approval queue"
          action={
            <Button
              title="Open queue"
              variant="ghost"
              size="sm"
              onPress={() => router.navigate("/requests")}
            />
          }
        />
        {approvalsQuery.isLoading ? (
          <AppText variant="small" color="muted">
            Loading approvals…
          </AppText>
        ) : approvalsQuery.isError ? (
          <ErrorView error={approvalsQuery.error} onRetry={refresh} />
        ) : approvals.length ? (
          <View style={styles.list}>
            {approvals.slice(0, 3).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                perspective="admin"
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="shield-checkmark-outline"
            title="Nothing waiting"
            body="Requests confirmed by teachers appear here for final approval."
          />
        )}
      </View>

      <View style={styles.section}>
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
        {lessonsQuery.isLoading ? (
          <AppText variant="small" color="muted">
            Loading lessons…
          </AppText>
        ) : upcoming.length ? (
          <View style={styles.list}>
            {upcoming.slice(0, 3).map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} perspective="admin" />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming lessons"
            body="Confirmed lessons will appear in the academy schedule."
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Academy directory" />
        <View style={styles.quickLinks}>
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
