import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getReviewQueue,
  type ReviewFilter,
  type ReviewFlag,
  type ReviewQueueItem,
} from "@/api/reviews";
import { canReviewLessons, useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { TextCardSkeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/ui/role-gate";
import { formatDateTime } from "@/lib/format";

const filterOptions: { value: ReviewFilter; label: string }[] = [
  { value: "unreviewed", label: "Open" },
  { value: "draft", label: "Drafts" },
  { value: "submitted", label: "Done" },
  { value: "flagged", label: "Flagged" },
  { value: "all", label: "All" },
];

const flagLabel: Record<ReviewFlag, string> = {
  phone: "Phone number",
  email: "Email address",
  platform: "Chat app",
  offplatform: "Off-platform",
};

const QueueCard = ({ lesson }: { lesson: ReviewQueueItem }) => {
  const { colors, spacing } = useTheme();
  const statusBadge =
    lesson.reviewStatus === "submitted"
      ? { label: "Submitted", tone: "success" as const }
      : lesson.reviewStatus === "draft"
        ? { label: "Draft", tone: "warning" as const }
        : { label: "Not reviewed", tone: "neutral" as const };

  return (
    <Card
      onPress={() => router.push(`/reviews/${lesson.lessonId}`)}
      accessibilityLabel={`Review ${lesson.teacherName} with ${lesson.studentName}`}
    >
      <View style={styles.row}>
        <AppText variant="h3" style={styles.flex}>
          {lesson.teacherName} with {lesson.studentName}
        </AppText>
        {lesson.flaggedSegments > 0 ? (
          <Badge label={`${lesson.flaggedSegments} flagged`} tone="warning" />
        ) : null}
      </View>
      <AppText variant="small" color="muted" style={{ marginTop: 4 }}>
        {formatDateTime(lesson.startsAt)} · {lesson.lessonStatus}
      </AppText>
      <View style={[styles.badges, { marginTop: spacing.sm }]}>
        <Badge label={statusBadge.label} tone={statusBadge.tone} />
        {lesson.reviewAverage !== null ? (
          <Badge
            label={`${lesson.reviewAverage.toFixed(1)} / 5`}
            tone="info"
          />
        ) : null}
        <Badge label={`${lesson.segments} segments`} />
      </View>
      {lesson.flagReasons.length > 0 ? (
        <AppText
          variant="caption"
          style={{ color: colors.warning, marginTop: spacing.sm }}
        >
          {lesson.flagReasons.map((flag) => flagLabel[flag] ?? flag).join(", ")}
        </AppText>
      ) : null}
      {lesson.reviewerName ? (
        <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>
          Reviewed by {lesson.reviewerName}
        </AppText>
      ) : null}
    </Card>
  );
};

export default function ReviewsTab() {
  const { role } = useAuth();
  const { spacing } = useTheme();
  const allowed = canReviewLessons(role);
  const [filter, setFilter] = useState<ReviewFilter>("unreviewed");

  const queueQuery = useQuery({
    queryKey: ["reviews", "queue", filter],
    queryFn: () => getReviewQueue(filter),
    enabled: allowed,
  });

  return (
    <RoleGate roles={["support", "admin", "super_admin"]}>
      <Screen
        refreshing={queueQuery.isRefetching}
        onRefresh={() => void queueQuery.refetch()}
      >
        <PageHeader
          title="Lesson reviews"
          eyebrow="Support"
          subtitle="Read the transcript, score the lesson and record the gaps to follow up."
          right={
            <Button
              title="Weekly digest"
              variant="secondary"
              size="sm"
              icon="stats-chart-outline"
              onPress={() => router.push("/reviews/weekly")}
            />
          }
        />
        <Segmented
          label="Review queue filter"
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
        <View style={{ height: spacing.lg }} />

        {queueQuery.isLoading ? (
          <View style={{ gap: spacing.md }}>
            <TextCardSkeleton lines={3} />
            <TextCardSkeleton lines={3} />
            <TextCardSkeleton lines={3} />
          </View>
        ) : queueQuery.isError ? (
          <ErrorView
            error={queueQuery.error}
            onRetry={() => void queueQuery.refetch()}
          />
        ) : (queueQuery.data ?? []).length === 0 ? (
          <EmptyState
            icon="reader-outline"
            title={
              filter === "unreviewed"
                ? "Nothing waiting for review"
                : "No lessons match this filter"
            }
            body="Lessons appear here once their transcript has been captured."
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {(queueQuery.data ?? []).map((lesson) => (
              <QueueCard key={lesson.lessonId} lesson={lesson} />
            ))}
          </View>
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
