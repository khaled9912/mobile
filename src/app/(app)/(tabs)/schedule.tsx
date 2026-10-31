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
import { pastLessons, upcomingLessons } from "@/lib/lesson-selectors";
import { isReportDue } from "@/lib/status";

type Filter = "upcoming" | "past" | "all";

export default function ScheduleTab() {
  const { role } = useAuth();
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = isAdminRole(role);
  const [filter, setFilter] = useState<Filter>("upcoming");

  const lessonsQuery = useQuery({ queryKey: ["lessons"], queryFn: getLessons });

  const list = useMemo(() => {
    const lessons = lessonsQuery.data ?? [];
    if (filter === "upcoming") return upcomingLessons(lessons);
    if (filter === "past") return pastLessons(lessons);
    return [...lessons].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }, [filter, lessonsQuery.data]);

  const perspective = isTeacher ? "teacher" : isAdmin ? "admin" : "student";

  if (!role) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={lessonsQuery.isFetching}
      onRefresh={() => void lessonsQuery.refetch()}
    >
      <PageHeader
        eyebrow={isAdmin ? "Academy schedule" : "Your lessons"}
        title="Schedule"
        subtitle={
          isTeacher
            ? "Every lesson confirmed for you, with reports still to write."
            : isAdmin
              ? "All confirmed lessons across the academy."
              : "Your confirmed lessons and their lesson rooms."
        }
      />

      <Segmented
        label="Filter lessons"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
          { value: "all", label: "All" },
        ]}
      />

      <View style={styles.list}>
        {lessonsQuery.isLoading ? (
          <LoadingView label="Loading your schedule…" />
        ) : lessonsQuery.isError ? (
          <ErrorView
            error={lessonsQuery.error}
            onRetry={() => void lessonsQuery.refetch()}
          />
        ) : list.length ? (
          list.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              perspective={perspective}
              action={
                isTeacher && isReportDue(lesson) ? (
                  <Button
                    title="Write lesson report"
                    size="sm"
                    onPress={() => router.push(`/lesson/${lesson.id}`)}
                  />
                ) : isTeacher && lesson.status === "scheduled" ? (
                  <Button
                    title="Open lesson room"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push(`/lesson/${lesson.id}`)}
                  />
                ) : undefined
              }
            />
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title={
              filter === "upcoming"
                ? "No upcoming lessons"
                : filter === "past"
                  ? "No past lessons yet"
                  : "No lessons yet"
            }
            body={
              isStudent
                ? "Book a lesson with a teacher to get started."
                : isTeacher
                  ? "Publish availability so students can request a time."
                  : "Confirmed lessons will appear here."
            }
            action={
              isStudent ? (
                <Button
                  title="Book a lesson"
                  size="sm"
                  onPress={() => router.navigate("/book")}
                />
              ) : isTeacher ? (
                <Button
                  title="Manage availability"
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
  list: { marginTop: 18, gap: 10 },
});
