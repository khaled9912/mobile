import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getWeeklyDigest,
  type TeacherDigest,
} from "@/api/reviews";
import { canReviewLessons, useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";
import { formatDateTime } from "@/lib/format";

const dateOnly = (value: Date) =>
  `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(value.getUTCDate()).padStart(2, "0")}`;

const currentMonday = () => {
  const today = new Date();
  const monday = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return dateOnly(monday);
};

const shiftWeek = (weekStart: string, days: number) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
};

const formatWeek = (weekStart: string, weekEnd: string) => {
  const start = new Date(`${weekStart}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const end = new Date(`${weekEnd}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${start} – ${end}`;
};

const ScoreCell = ({ label, value }: { label: string; value: number | null }) => (
  <View style={styles.scoreCell}>
    <AppText variant="h3">{value === null ? "—" : value}</AppText>
    <AppText variant="caption" color="muted">
      {label}
    </AppText>
  </View>
);

const SummaryCell = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.summaryCell}>
    <AppText variant="h3">{value}</AppText>
    <AppText variant="caption" color="muted">
      {label}
    </AppText>
  </View>
);

const LinkRow = ({
  title,
  subtitle,
  badge,
  onPress,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      android_ripple={{ color: colors.brandSoft }}
      style={({ pressed }) => [
        styles.linkRow,
        {
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.sm + 2,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.flex}>
        <AppText variant="small" weight="700">
          {title}
        </AppText>
        <AppText variant="caption" color="muted">
          {subtitle}
        </AppText>
      </View>
      {badge ? <Badge label={badge} tone="warning" /> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
};

const TeacherCard = ({ teacher }: { teacher: TeacherDigest }) => {
  const { spacing } = useTheme();
  return (
    <Card>
      <View style={styles.teacherHead}>
        <View style={styles.flex}>
          <AppText variant="h3">{teacher.teacherName}</AppText>
          <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
            {teacher.lessons} lesson{teacher.lessons === 1 ? "" : "s"} ·{" "}
            {teacher.reviewed} reviewed · {teacher.unreviewed} pending
            {teacher.flaggedLessons > 0
              ? ` · ${teacher.flaggedLessons} flagged`
              : ""}
          </AppText>
        </View>
        <Badge
          label={teacher.unreviewed > 0 ? "Open" : "Complete"}
          tone={teacher.unreviewed > 0 ? "warning" : "success"}
        />
      </View>

      <View style={[styles.scoreGrid, { marginTop: spacing.md }]}>
        <ScoreCell label="Clarity" value={teacher.avgTeachingClarity} />
        <ScoreCell label="Practice" value={teacher.avgStudentPractice} />
        <ScoreCell label="Correction" value={teacher.avgCorrectionQuality} />
        <ScoreCell label="Engagement" value={teacher.avgEngagement} />
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader title="Follow-up actions" />
        {teacher.actions.length === 0 ? (
          <AppText variant="small" color="muted">
            No gaps or actions recorded from the submitted reviews.
          </AppText>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {teacher.actions.map((action) => (
              <LinkRow
                key={action.lessonId}
                title={`${formatDateTime(action.startsAt)} · ${action.studentName}`}
                subtitle={[
                  action.gaps ? `Gap: ${action.gaps}` : null,
                  action.teacherAction
                    ? `Teacher: ${action.teacherAction}`
                    : null,
                  action.studentAction
                    ? `Student: ${action.studentAction}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n")}
                onPress={() => router.push(`/reviews/${action.lessonId}`)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <SectionHeader title="Not yet reviewed" />
        {teacher.unreviewedLessons.length === 0 ? (
          <AppText variant="small" color="muted">
            Every lesson this week is done.
          </AppText>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {teacher.unreviewedLessons.map((lesson) => (
              <LinkRow
                key={lesson.lessonId}
                title={`${formatDateTime(lesson.startsAt)} · ${lesson.studentName}`}
                subtitle={
                  lesson.flaggedSegments > 0
                    ? `${lesson.flaggedSegments} flagged segment${lesson.flaggedSegments === 1 ? "" : "s"}`
                    : "Transcript ready"
                }
                badge={lesson.reviewStatus === "draft" ? "Draft" : "Open"}
                onPress={() => router.push(`/reviews/${lesson.lessonId}`)}
              />
            ))}
          </View>
        )}
      </View>
    </Card>
  );
};

export default function WeeklyDigestScreen() {
  const { role } = useAuth();
  const { colors, radius, spacing } = useTheme();
  const allowed = canReviewLessons(role);
  const [weekStart, setWeekStart] = useState(currentMonday);

  const digestQuery = useQuery({
    queryKey: ["reviews", "digest", weekStart],
    queryFn: () => getWeeklyDigest(weekStart),
    enabled: allowed,
  });

  const digest = digestQuery.data;

  return (
    <RoleGate roles={["support", "admin", "super_admin"]}>
      <Screen
        refreshing={digestQuery.isRefetching}
        onRefresh={() => void digestQuery.refetch()}
      >
        <PageHeader
          eyebrow="Support"
          title="Weekly digest"
          subtitle="Submitted reviews grouped by teacher, with the actions to pass on and lessons still waiting."
        />

        <View style={[styles.weekRow, { marginBottom: spacing.lg }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            onPress={() => setWeekStart(shiftWeek(weekStart, -7))}
            style={[
              styles.weekButton,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.flex}>
            <AppText variant="label" weight="700" align="center">
              {digest
                ? formatWeek(digest.weekStart, digest.weekEnd)
                : "This week"}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            onPress={() => setWeekStart(shiftWeek(weekStart, 7))}
            style={[
              styles.weekButton,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <Button
          title="This week"
          variant="secondary"
          size="sm"
          onPress={() => setWeekStart(currentMonday())}
          style={{ alignSelf: "flex-start", marginBottom: spacing.lg }}
        />

        {digestQuery.isLoading ? (
          <LoadingView label="Building the digest…" />
        ) : digestQuery.isError || !digest ? (
          <ErrorView
            error={digestQuery.error}
            onRetry={() => void digestQuery.refetch()}
          />
        ) : (
          <>
            <Card style={{ marginBottom: spacing.lg }}>
              <View style={styles.summaryRow}>
                <SummaryCell label="Lessons" value={digest.lessons} />
                <SummaryCell label="Reviewed" value={digest.reviewed} />
                <SummaryCell label="Flagged" value={digest.flaggedLessons} />
              </View>
            </Card>

            {digest.teachers.length === 0 ? (
              <EmptyState
                icon="stats-chart-outline"
                title="No lessons this week"
                body="Lessons appear in the digest once their transcript has been captured."
              />
            ) : (
              <View style={{ gap: spacing.lg }}>
                {digest.teachers.map((teacher) => (
                  <TeacherCard key={teacher.teacherId} teacher={teacher} />
                ))}
              </View>
            )}
          </>
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  weekRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  weekButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  teacherHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  scoreCell: { width: "50%", gap: 2 },
  summaryRow: { flexDirection: "row" },
  summaryCell: { flex: 1, gap: 2, alignItems: "center" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
