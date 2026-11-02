import { useMemo, useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { getLessons } from "@/api/lessons";
import { useAuth, isAdminRole } from "@/providers/auth-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { LessonCard } from "@/components/lesson/lesson-card";
import { AppText } from "@/components/ui/app-text";
import {
  cancelledLessons,
  COMPLETED_PAGE_SIZE,
  countCompletedLessons,
  pastLessons,
  upcomingDayPage,
  upcomingLessons,
} from "@/lib/lesson-selectors";
import { relativeDay } from "@/lib/format";
import { isLessonJoinable, isReportDue } from "@/lib/status";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

type Filter = "upcoming" | "past" | "cancelled";

export default function ScheduleTab() {
  const { role } = useAuth();
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = isAdminRole(role);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [completedLimit, setCompletedLimit] = useState(COMPLETED_PAGE_SIZE);
  const [upcomingDays, setUpcomingDays] = useState(1);

  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const lessons = lessonsQuery.data ?? [];
  // Computed on render so the "today" page advances at local midnight.
  const upcomingPage = upcomingDayPage(lessons, upcomingDays);
  const list =
    filter === "upcoming"
      ? upcomingPage.lessons
      : filter === "cancelled"
        ? cancelledLessons(lessons)
        : pastLessons(lessons, { windowDays: 7, completedLimit });

  const totalCompleted = useMemo(
    () => countCompletedLessons(lessonsQuery.data ?? []),
    [lessonsQuery.data]
  );
  const hasMoreCompleted =
    filter === "past" && totalCompleted > completedLimit;
  const hasMoreUpcoming = filter === "upcoming" && upcomingPage.hasMore;
  const nextDayLabel = upcomingPage.nextDay
    ? relativeDay(new Date(upcomingPage.nextDay).toISOString())
    : null;

  // Offer "change time" once per weekly series, on its next lesson.
  const firstOfSeries = useMemo(() => {
    const seen = new Map<string, string>();
    for (const lesson of upcomingLessons(lessonsQuery.data ?? [])) {
      if (lesson.seriesId && !seen.has(lesson.seriesId)) {
        seen.set(lesson.seriesId, lesson.id);
      }
    }
    return seen;
  }, [lessonsQuery.data]);

  const perspective = isTeacher ? "teacher" : isAdmin ? "admin" : "student";
  const { refreshing, onRefresh } = usePullRefresh(lessonsQuery.refetch);

  if (!role) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow={isAdmin ? "Academy schedule" : "Your lessons"}
        title="Schedule"
        subtitle={
          isTeacher
            ? "Your weekly lessons and the reports still to write."
            : isAdmin
              ? "All booked lessons across the academy."
              : "Your weekly lessons and their lesson rooms."
        }
      />

      <Segmented
        label="Filter lessons"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
          { value: "cancelled", label: "Cancelled" },
        ]}
      />
      <AppText variant="caption" color="muted" style={styles.windowNote}>
        {filter === "upcoming"
          ? "Showing one lesson day at a time."
          : filter === "past"
            ? "Showing the last 7 days · completed lessons load four at a time."
            : "Showing cancelled lessons within one week of today."}
      </AppText>

      <View style={styles.list}>
        {lessonsQuery.isLoading ? (
          <LoadingView label="Loading your schedule…" />
        ) : lessonsQuery.isError ? (
          <ErrorView
            error={lessonsQuery.error}
            onRetry={() => void lessonsQuery.refetch()}
          />
        ) : list.length ? (
          <>
            {list.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                perspective={perspective}
                action={
                  (isTeacher || isStudent) && isLessonJoinable(lesson) ? (
                    <Button
                      title={isTeacher ? "Open lesson room" : "Attend lesson"}
                      size="sm"
                      onPress={() => router.push(`/lesson/${lesson.id}`)}
                    />
                  ) : isTeacher && isReportDue(lesson) ? (
                    <Button
                      title="Write lesson report"
                      size="sm"
                      onPress={() => router.push(`/lesson/${lesson.id}`)}
                    />
                  ) : isStudent &&
                    lesson.seriesId &&
                    firstOfSeries.get(lesson.seriesId) === lesson.id ? (
                    <Button
                      title="Change weekly time"
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        router.push(`/change-time/${lesson.seriesId}`)
                      }
                    />
                  ) : undefined
                }
              />
            ))}
            {hasMoreUpcoming ? (
              <Button
                title={`Load more${nextDayLabel ? ` · ${nextDayLabel}` : ""}`}
                variant="secondary"
                onPress={() => setUpcomingDays((value) => value + 1)}
              />
            ) : null}
            {hasMoreCompleted ? (
              <Button
                title="Load more completed lessons"
                variant="secondary"
                onPress={() =>
                  setCompletedLimit((value) => value + COMPLETED_PAGE_SIZE)
                }
              />
            ) : null}
          </>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title={
              filter === "upcoming"
                ? "No upcoming lessons"
                : filter === "past"
                  ? "No lessons in the last 7 days"
                  : "No cancelled lessons"
            }
            body={
              filter === "cancelled"
                ? "Cancelled lessons from the past or next week will appear here."
                : isStudent
                  ? "Book weekly lessons with a teacher to get started."
                  : isTeacher
                    ? "Publish your weekly availability so students can book."
                    : "Booked lessons will appear here."
            }
            action={
              filter === "cancelled" ? undefined : isStudent ? (
                <Button
                  title="Book weekly lessons"
                  size="sm"
                  onPress={() => router.navigate("/book")}
                />
              ) : isTeacher ? (
                <Button
                  title="Manage weekly availability"
                  size="sm"
                  onPress={() => router.push("/availability")}
                />
              ) : undefined
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  windowNote: { marginTop: 10 },
  list: { marginTop: 18, gap: 10 },
});
