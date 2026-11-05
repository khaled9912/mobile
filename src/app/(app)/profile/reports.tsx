import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getMyReports } from "@/api/profile";
import { useAuth, isAdminRole } from "@/providers/auth-provider";
import { formatDateTime } from "@/lib/format";
import { progressLabel, progressTone } from "@/lib/status";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { TextCardSkeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 10;

export default function LessonReportsScreen() {
  const { role } = useAuth();
  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const isAdmin = isAdminRole(role);

  const reportsQuery = useInfiniteQuery({
    queryKey: ["profile", "reports"],
    queryFn: ({ pageParam }) => getMyReports(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore
        ? allPages.reduce((count, page) => count + page.items.length, 0)
        : undefined,
  });

  const reports = reportsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Screen
      edges={["left", "right"]}
      refreshing={
        reportsQuery.isRefetching && !reportsQuery.isFetchingNextPage
      }
      onRefresh={() => void reportsQuery.refetch()}
    >
      <PageHeader
        eyebrow="Your account"
        title={isTeacher ? "Reports you submitted" : "Lesson reports"}
        subtitle={
          isTeacher
            ? "Each finished lesson needs a report. This is your complete history."
            : isStudent
              ? "What your teachers shared after each lesson."
              : isAdmin
                ? "Lesson reports shared across the academy."
                : "Feedback recorded after each lesson."
        }
      />

      {reportsQuery.isLoading ? (
        <View style={styles.list}>
          <TextCardSkeleton lines={4} action />
          <TextCardSkeleton lines={4} action />
          <TextCardSkeleton lines={4} action />
        </View>
      ) : reportsQuery.isError && !reports.length ? (
        <ErrorView
          error={reportsQuery.error}
          onRetry={() => void reportsQuery.refetch()}
        />
      ) : reports.length ? (
        <View style={styles.list}>
          {reports.map((report) => (
            <Card key={report.id}>
              <View style={styles.head}>
                <Badge
                  label={progressLabel[report.progress]}
                  tone={progressTone[report.progress]}
                />
                <AppText variant="caption" color="muted">
                  {formatDateTime(report.startsAt)}
                </AppText>
              </View>

              <AppText variant="small" color="muted" style={styles.people}>
                {isTeacher
                  ? `Student: ${report.studentName}`
                  : isStudent
                    ? `Teacher: ${report.teacherName}`
                    : `${report.teacherName} with ${report.studentName}`}
              </AppText>

              <AppText variant="h3" style={styles.summary}>
                {report.classSummary}
              </AppText>
              <AppText variant="small" style={styles.feedback}>
                {report.studentFeedback}
              </AppText>

              <Button
                title="Open lesson"
                variant="secondary"
                size="sm"
                icon="arrow-forward-outline"
                onPress={() => router.push(`/lesson/${report.lessonId}`)}
                style={styles.action}
              />
            </Card>
          ))}

          {reportsQuery.hasNextPage ? (
            <Button
              title={
                reportsQuery.isFetchingNextPage ? "Loading…" : "Load more"
              }
              variant="secondary"
              onPress={() => void reportsQuery.fetchNextPage()}
              loading={reportsQuery.isFetchingNextPage}
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          icon="document-text-outline"
          title={
            isTeacher ? "No reports submitted yet" : "No lesson reports yet"
          }
          body={
            isTeacher
              ? "Finish a lesson and submit its report to see it here."
              : isAdmin
                ? "Lesson reports are written by teachers for their students."
                : "After a lesson, your teacher's report will appear here."
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  people: { marginTop: 10 },
  summary: { marginTop: 6, lineHeight: 24 },
  feedback: { marginTop: 8, lineHeight: 21 },
  action: { marginTop: 14, alignSelf: "flex-start" },
});
