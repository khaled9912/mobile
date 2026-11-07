import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { getMyAvailabilityRules } from "@/api/scheduling";
import { getLessons } from "@/api/lessons";
import { useAuth } from "@/providers/auth-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { firstName, todayLessons } from "@/lib/lesson-selectors";
import { formatWeeklySlot } from "@/lib/format";
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
  const rulesQuery = useQuery({
    queryKey: ["availability-rules", "teacher"],
    queryFn: getMyAvailabilityRules,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const lessons = lessonsQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const today = todayLessons(lessons);
  const booked = rules.filter((rule) => rule.status === "booked").length;
  const reportsDue = lessons
    .filter(isReportDue)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([lessonsQuery.refetch(), rulesQuery.refetch()])
  );
  const loading = lessonsQuery.isLoading || rulesQuery.isLoading;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {loading ? (
        <PageHeaderSkeleton titleLines={2} />
      ) : (
        <PageHeader
          eyebrow="Teacher portal"
          title={`Assalamu alaikum${
            user?.fullName ? `, ${firstName(user.fullName)}` : ""
          }`}
          subtitle="Your teaching week, weekly availability, and lesson reports."
        />
      )}

      {loading ? (
        <>
          <StatRowSkeleton />
          <View style={styles.section}>
            <SectionHeaderSkeleton />
            <LessonCardSkeleton />
          </View>
          <View style={styles.section}>
            <SectionHeaderSkeleton />
            <TextCardSkeleton lines={2} action />
          </View>
          <View style={styles.section}>
            <SectionHeaderSkeleton withAction={false} />
            <View style={styles.list}>
              <TextCardSkeleton lines={2} />
              <TextCardSkeleton lines={2} />
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.stats}>
            <StatCard label="Today's lessons" value={today.length} />
            <StatCard label="Weekly slots" value={rules.length} />
            <StatCard label="Booked slots" value={booked} />
            <StatCard label="Reports due" value={reportsDue.length} />
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Today's lessons"
              action={
                <Button
                  title="Full schedule"
                  variant="ghost"
                  size="sm"
                  onPress={() => router.navigate("/schedule")}
                />
              }
            />
            {lessonsQuery.isError ? (
              <ErrorView
                error={lessonsQuery.error}
                onRetry={() => void lessonsQuery.refetch()}
              />
            ) : today.length ? (
              <View style={styles.list}>
                {today.map((lesson) => (
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
                title="No lessons today"
                body={
                  rules.length
                    ? "You're all caught up for today. Open the full schedule to see the week ahead."
                    : "Announce your weekly times so students can book them."
                }
                action={
                  rules.length ? (
                    <Button
                      title="Open full schedule"
                      size="sm"
                      onPress={() => router.navigate("/schedule")}
                    />
                  ) : (
                    <Button
                      title="Manage weekly availability"
                      size="sm"
                      onPress={() => router.push("/availability")}
                    />
                  )
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
              title="Your weekly times"
              action={
                <Button
                  title="Manage"
                  variant="ghost"
                  size="sm"
                  onPress={() => router.push("/availability")}
                />
              }
            />
            {rules.length ? (
              <View style={styles.list}>
                {rules.slice(0, 4).map((rule) => (
                  <Card key={rule.id}>
                    <View style={styles.ruleRow}>
                      <View style={styles.rulecopy}>
                        <AppText variant="label">
                          {formatWeeklySlot(
                            rule.dayOfWeek,
                            rule.startsAtTime,
                            rule.endsAtTime
                          )}
                        </AppText>
                        <AppText variant="caption" color="muted">
                          {rule.status === "booked"
                            ? "Booked by a student"
                            : "Open for students"}
                        </AppText>
                      </View>
                      <Badge
                        label={rule.status === "booked" ? "Booked" : "Open"}
                        tone={rule.status === "booked" ? "success" : "neutral"}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="time-outline"
                title="No weekly times yet"
                body="Publish the days and hours you teach. Students book any open time and it repeats every week."
                action={
                  <Button
                    title="Publish weekly availability"
                    size="sm"
                    onPress={() => router.push("/availability")}
                  />
                }
              />
            )}
          </View>

          <View style={styles.quickLinks}>
            <Card onPress={() => router.push("/availability")}>
              <AppText variant="h3">Manage weekly availability</AppText>
              <AppText variant="small" color="muted" style={styles.linkBody}>
                Announce the days and times students can book every week.
              </AppText>
            </Card>
          </View>
        </>
      )}
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
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rulecopy: { flex: 1, gap: 2 },
  quickLinks: { marginTop: 26, gap: 12 },
  linkBody: { marginTop: 4 },
});
