import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getReviewWorkspace,
  saveQualityReview,
  type LessonQualityReview,
  type ReviewFlag,
  type ReviewMetrics,
  type ReviewSegment,
  type ReviewStatus,
} from "@/api/reviews";
import { canReviewLessons, useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView } from "@/components/ui/states";
import {
  PageHeaderSkeleton,
  SectionHeaderSkeleton,
  TextCardSkeleton,
} from "@/components/ui/skeleton";
import { RoleGate } from "@/components/ui/role-gate";
import { formatDateTime } from "@/lib/format";

const flagLabel: Record<ReviewFlag, string> = {
  phone: "Phone number",
  email: "Email address",
  platform: "Chat app",
  offplatform: "Off-platform",
};

const offset = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return null;
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const duration = (seconds: number | null) => {
  if (seconds === null) return "—";
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
};

const scoreFields = [
  {
    key: "teachingClarity",
    label: "Teaching clarity",
    hint: "Clear explanation at the student's level",
  },
  {
    key: "studentPractice",
    label: "Student practice",
    hint: "Enough recitation and answers from the student",
  },
  {
    key: "correctionQuality",
    label: "Correction quality",
    hint: "Mistakes corrected accurately and kindly",
  },
  {
    key: "engagement",
    label: "Engagement",
    hint: "Student attentive and encouraged",
  },
] as const;

type ScoreKey = (typeof scoreFields)[number]["key"];

const ScoreRow = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null;
  onChange: (value: number) => void;
}) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="caption" color="muted">
        {hint}
      </AppText>
      <View style={[styles.scoreRow, { marginTop: spacing.xs }]}>
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score;
          return (
            <Pressable
              key={score}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${score} out of 5`}
              accessibilityState={{ selected }}
              onPress={() => onChange(score)}
              style={[
                styles.scoreButton,
                {
                  borderRadius: radius.md,
                  borderColor: selected ? colors.brand : colors.border,
                  backgroundColor: selected ? colors.brand : colors.input,
                },
              ]}
            >
              <AppText
                variant="label"
                weight="700"
                color={selected ? colors.onBrand : colors.text}
              >
                {score}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const MetricCell = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metricCell}>
    <AppText variant="h3">{value}</AppText>
    <AppText variant="caption" color="muted">
      {label}
    </AppText>
  </View>
);

const MetricsCard = ({ metrics }: { metrics: ReviewMetrics }) => {
  const { colors, radius, spacing } = useTheme();
  const teacher = metrics.teacherTalkPercent;
  const student = metrics.studentTalkPercent;
  return (
    <Card>
      <View style={styles.metricGrid}>
        <MetricCell label="Segments" value={String(metrics.segments)} />
        <MetricCell
          label="Recorded"
          value={duration(metrics.recordedSeconds)}
        />
        <MetricCell label="Flagged" value={String(metrics.flaggedSegments)} />
        <MetricCell
          label="Turns T / S"
          value={`${metrics.teacherSegments} / ${metrics.studentSegments}`}
        />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <AppText variant="caption" color="muted">
          Estimated talk balance from word count (not a clock)
        </AppText>
        {teacher === null || student === null ? (
          <AppText variant="small" color="muted" style={{ marginTop: 4 }}>
            Speaker labels were not recognised.
          </AppText>
        ) : (
          <>
            <View style={[styles.balanceLabels, { marginTop: 6 }]}>
              <AppText variant="caption" weight="700">
                Teacher {teacher}%
              </AppText>
              <AppText variant="caption" weight="700">
                Student {student}%
              </AppText>
            </View>
            <View
              style={[
                styles.balanceTrack,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.pill,
                  marginTop: 4,
                },
              ]}
            >
              <View
                style={{
                  width: `${teacher}%`,
                  backgroundColor: colors.brand,
                }}
              />
              <View
                style={{
                  width: `${student}%`,
                  backgroundColor: colors.link,
                  opacity: 0.55,
                }}
              />
            </View>
          </>
        )}
      </View>
      {metrics.flagReasons.length > 0 ? (
        <View style={[styles.badges, { marginTop: spacing.sm }]}>
          {metrics.flagReasons.map((flag) => (
            <Badge
              key={flag}
              label={flagLabel[flag] ?? flag}
              tone="warning"
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
};

const SegmentRow = ({ segment }: { segment: ReviewSegment }) => {
  const { colors, radius, spacing } = useTheme();
  const flagged = segment.flags.length > 0;
  const time = offset(segment.atSeconds);
  return (
    <View
      style={[
        styles.segment,
        {
          backgroundColor: flagged ? colors.warningSoft : colors.card,
          borderColor: flagged ? colors.warning : colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.segmentHeader}>
        <AppText variant="label" weight="700">
          {segment.speaker}
        </AppText>
        {time ? (
          <AppText variant="caption" color="muted">
            {time}
          </AppText>
        ) : null}
        {segment.flags.map((flag) => (
          <Badge
            key={flag}
            label={flagLabel[flag] ?? flag}
            tone="warning"
          />
        ))}
      </View>
      <AppText variant="small" style={{ marginTop: 4 }}>
        {segment.text}
      </AppText>
    </View>
  );
};

function ReviewForm({
  lessonId,
  review,
  onSaved,
}: {
  lessonId: string;
  review: LessonQualityReview | null;
  onSaved: (status: ReviewStatus) => void;
}) {
  const { spacing } = useTheme();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<ScoreKey, number | null>>({
    teachingClarity: review?.teachingClarity ?? null,
    studentPractice: review?.studentPractice ?? null,
    correctionQuality: review?.correctionQuality ?? null,
    engagement: review?.engagement ?? null,
  });
  const [strengths, setStrengths] = useState(review?.strengths ?? "");
  const [gaps, setGaps] = useState(review?.gaps ?? "");
  const [teacherAction, setTeacherAction] = useState(
    review?.teacherAction ?? ""
  );
  const [studentAction, setStudentAction] = useState(
    review?.studentAction ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (status: ReviewStatus) =>
      saveQualityReview(lessonId, {
        ...scores,
        strengths: strengths.trim() || null,
        gaps: gaps.trim() || null,
        teacherAction: teacherAction.trim() || null,
        studentAction: studentAction.trim() || null,
        status,
      }),
    onSuccess: async (_, status) => {
      setError(null);
      await queryClient.invalidateQueries({
        queryKey: ["reviews", "workspace", lessonId],
      });
      await queryClient.invalidateQueries({ queryKey: ["reviews", "queue"] });
      onSaved(status);
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "The review could not be saved."
      );
    },
  });

  const handleSave = (status: ReviewStatus) => {
    setError(null);
    if (status === "submitted") {
      if (Object.values(scores).some((value) => value === null)) {
        setError("Score all four areas before submitting.");
        return;
      }
      if (gaps.trim().length < 3) {
        setError("Describe at least one gap before submitting.");
        return;
      }
    }
    mutation.mutate(status);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader
        title="Rubric"
        action={
          review ? (
            <Badge
              label={review.status === "submitted" ? "Submitted" : "Draft"}
              tone={review.status === "submitted" ? "success" : "warning"}
            />
          ) : null
        }
      />

      <Card>
        <View style={{ gap: spacing.lg }}>
          {scoreFields.map((field) => (
            <ScoreRow
              key={field.key}
              label={field.label}
              hint={field.hint}
              value={scores[field.key]}
              onChange={(value) =>
                setScores((current) => ({ ...current, [field.key]: value }))
              }
            />
          ))}
        </View>
      </Card>

      <TextField
        label="What went well"
        value={strengths}
        onChangeText={setStrengths}
        multiline
        maxLength={2000}
        placeholder="Keep this specific so the teacher can repeat it."
      />
      <TextField
        label="Gaps to work on *"
        value={gaps}
        onChangeText={setGaps}
        multiline
        maxLength={2000}
        placeholder="Required to submit. What did the lesson miss?"
      />
      <TextField
        label="Teacher action for next lesson"
        value={teacherAction}
        onChangeText={setTeacherAction}
        multiline
        maxLength={1000}
        placeholder="One concrete change the teacher can make."
      />
      <TextField
        label="Student action for this week"
        value={studentAction}
        onChangeText={setStudentAction}
        multiline
        maxLength={1000}
        placeholder="What the student should practise."
      />

      {error ? <Notice tone="error" message={error} /> : null}

      <View style={{ gap: spacing.sm }}>
        <Button
          title="Submit review"
          icon="send-outline"
          loading={mutation.isPending}
          onPress={() => handleSave("submitted")}
          fullWidth
        />
        <Button
          title="Save draft"
          icon="save-outline"
          variant="secondary"
          disabled={mutation.isPending}
          onPress={() => handleSave("draft")}
          fullWidth
        />
      </View>
    </View>
  );
}

export default function LessonReviewScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const lessonId = typeof params.id === "string" ? params.id : "";
  const { role } = useAuth();
  const { spacing } = useTheme();
  const { showToast } = useToast();
  const allowed = canReviewLessons(role);

  const workspaceQuery = useQuery({
    queryKey: ["reviews", "workspace", lessonId],
    queryFn: () => getReviewWorkspace(lessonId),
    enabled: allowed && lessonId.length > 0,
  });

  const workspace = workspaceQuery.data;

  return (
    <RoleGate roles={["support", "admin", "super_admin"]}>
      <Screen
        refreshing={workspaceQuery.isRefetching}
        onRefresh={() => void workspaceQuery.refetch()}
      >
        {workspaceQuery.isLoading ? (
          <>
            <PageHeaderSkeleton titleLines={1} />
            <View style={{ gap: spacing.lg }}>
              <TextCardSkeleton lines={4} />
              <TextCardSkeleton lines={6} />
            </View>
            <View style={{ height: spacing.xl }} />
            <SectionHeaderSkeleton withAction={false} />
            <TextCardSkeleton lines={4} />
          </>
        ) : workspaceQuery.isError || !workspace ? (
          <ErrorView
            error={workspaceQuery.error}
            title="Lesson not available"
            onRetry={() => void workspaceQuery.refetch()}
          />
        ) : (
          <>
            <PageHeader
              eyebrow="Lesson review"
              title={`${workspace.lesson.teacherName} with ${workspace.lesson.studentName}`}
              subtitle={`${formatDateTime(workspace.lesson.startsAt)} · ${workspace.lesson.status}`}
            />

            <MetricsCard metrics={workspace.metrics} />

            <View style={{ height: spacing.xl }} />
            <ReviewForm
              key={`${lessonId}:${workspace.review?.updatedAt ?? "new"}`}
              lessonId={lessonId}
              review={workspace.review}
              onSaved={(status) =>
                showToast(status === "submitted" ? "Review submitted." : "Draft saved.")
              }
            />

            <View style={{ height: spacing.xl }} />
            <SectionHeader title="Transcript" />
            {workspace.segments.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No transcript yet"
                body="This lesson has not been transcribed, so it cannot be reviewed."
              />
            ) : (
              <View style={{ gap: spacing.sm }}>
                {workspace.segments.map((segment) => (
                  <SegmentRow key={segment.id} segment={segment} />
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
  scoreRow: { flexDirection: "row", gap: 8 },
  scoreButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderWidth: 1.5,
  },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  metricCell: { width: "50%", gap: 2 },
  balanceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceTrack: { flexDirection: "row", height: 10, overflow: "hidden" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  segment: { borderWidth: StyleSheet.hairlineWidth * 2, gap: 2 },
  segmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
});
