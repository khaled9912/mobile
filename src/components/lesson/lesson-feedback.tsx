import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type {
  Lesson,
  LessonProgress,
  LessonReport,
  TeacherReview,
  UserRole,
} from "@/api/types";
import { ApiError } from "@/api/client";
import { saveLessonReport, saveLessonReview } from "@/api/lessons";
import { formatDateTime } from "@/lib/format";
import {
  progressLabel,
  progressTone,
} from "@/lib/status";
import { useTheme } from "@/providers/theme-provider";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { StarRating, StarRatingInput } from "@/components/ui/star-rating";

const MAX_LENGTH = 2000;
const MIN_LENGTH = 10;

const progressOptions: LessonProgress[] = [
  "excellent",
  "good",
  "needs_attention",
];

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const ReportContent = ({ report }: { report: LessonReport }) => (
  <View style={styles.stack}>
    <View style={styles.between}>
      <Badge
        label={progressLabel[report.progress]}
        tone={progressTone[report.progress]}
      />
      <AppText variant="caption" color="muted">
        Updated {formatDateTime(report.updatedAt)}
      </AppText>
    </View>
    <View style={styles.stackTight}>
      <AppText variant="eyebrow" color="muted">
        Class summary
      </AppText>
      <AppText>{report.classSummary}</AppText>
    </View>
    <View style={styles.stackTight}>
      <AppText variant="eyebrow" color="muted">
        Feedback about the student
      </AppText>
      <AppText>{report.studentFeedback}</AppText>
    </View>
  </View>
);

const ReviewContent = ({ review }: { review: TeacherReview }) => (
  <View style={styles.stackTight}>
    <View style={styles.starsRow}>
      <StarRating value={review.rating} size={18} />
      <AppText variant="caption" color="muted">
        Updated {formatDateTime(review.updatedAt)}
      </AppText>
    </View>
    {review.comment ? <AppText>{review.comment}</AppText> : null}
  </View>
);

const SectionTitle = ({
  icon,
  title,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  action?: ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.between}>
      <View style={styles.titleRow}>
        <Ionicons name={icon} size={19} color={colors.link} />
        <AppText variant="h3">{title}</AppText>
      </View>
      {action}
    </View>
  );
};

const ProgressPicker = ({
  value,
  onChange,
  disabled,
}: {
  value: LessonProgress;
  onChange: (value: LessonProgress) => void;
  disabled?: boolean;
}) => {
  const { colors, radius } = useTheme();
  return (
    <View style={styles.progressRow} accessibilityRole="radiogroup">
      {progressOptions.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={progressLabel[option]}
            disabled={disabled}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.progressChip,
              {
                borderRadius: radius.pill,
                borderColor: selected ? colors.brand : colors.border,
                backgroundColor: selected ? colors.brandSoft : colors.card,
                opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="700"
              color={selected ? "link" : "muted"}
            >
              {progressLabel[option]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const TeacherReportSection = ({
  lesson,
  report,
  onSaved,
}: {
  lesson: Lesson;
  report: LessonReport | null;
  onSaved: (report: LessonReport) => void;
}) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(!report);
  const [classSummary, setClassSummary] = useState(report?.classSummary ?? "");
  const [studentFeedback, setStudentFeedback] = useState(
    report?.studentFeedback ?? ""
  );
  const [progress, setProgress] = useState<LessonProgress>(
    report?.progress ?? "good"
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      saveLessonReport(lesson.id, {
        classSummary: classSummary.trim(),
        studentFeedback: studentFeedback.trim(),
        progress,
      }),
    onSuccess: (saved) => {
      onSaved(saved);
      setEditing(false);
      setFormError(null);
      setNotice("Your class report has been saved.");
      void queryClient.invalidateQueries({ queryKey: ["lessons"] });
      void queryClient.invalidateQueries({ queryKey: ["lessons", lesson.id] });
      void queryClient.invalidateQueries({ queryKey: ["profile", "reports"] });
    },
    onError: (error) =>
      setFormError(
        errorMessage(
          error,
          "Unable to save the class report. Please try again."
        )
      ),
  });

  const submit = () => {
    setFormError(null);
    setNotice(null);
    if (classSummary.trim().length < MIN_LENGTH) {
      setFormError("Summarize the class in at least 10 characters.");
      return;
    }
    if (studentFeedback.trim().length < MIN_LENGTH) {
      setFormError("Give feedback about the student in at least 10 characters.");
      return;
    }
    mutation.mutate();
  };

  const cancelEdit = () => {
    setClassSummary(report?.classSummary ?? "");
    setStudentFeedback(report?.studentFeedback ?? "");
    setProgress(report?.progress ?? "good");
    setFormError(null);
    setEditing(false);
  };

  if (report && !editing) {
    return (
      <Card>
        <SectionTitle
          icon="clipboard-outline"
          title="Class report"
          action={
            <Button
              title="Edit report"
              variant="secondary"
              size="sm"
              icon="create-outline"
              onPress={() => {
                setNotice(null);
                setEditing(true);
              }}
            />
          }
        />
        <View style={styles.sectionBody}>
          <ReportContent report={report} />
        </View>
        {notice ? (
          <View style={styles.noticeGap}>
            <Notice tone="success" message={notice} />
          </View>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle icon="clipboard-outline" title="Class report required" />
      <AppText variant="small" color="muted" style={styles.lede}>
        Summarize the class and give the student feedback. The report appears in
        the student&apos;s profile and marks the lesson as completed.
      </AppText>

      <View style={styles.form}>
        <TextField
          label="Class summary"
          value={classSummary}
          onChangeText={setClassSummary}
          multiline
          maxLength={MAX_LENGTH}
          editable={!mutation.isPending}
          placeholder="What did you cover in this lesson?"
          hint={`${classSummary.trim().length} / ${MAX_LENGTH} characters`}
        />
        <TextField
          label="Feedback about the student"
          value={studentFeedback}
          onChangeText={setStudentFeedback}
          multiline
          maxLength={MAX_LENGTH}
          editable={!mutation.isPending}
          placeholder="Strengths, areas to improve, and what to practice next."
          hint={`${studentFeedback.trim().length} / ${MAX_LENGTH} characters`}
        />

        <View style={styles.stackTight}>
          <AppText variant="label">Progress</AppText>
          <ProgressPicker
            value={progress}
            onChange={setProgress}
            disabled={mutation.isPending}
          />
        </View>

        {formError ? <Notice tone="error" message={formError} /> : null}

        <View style={styles.actions}>
          <Button
            title={
              mutation.isPending
                ? "Saving…"
                : report
                  ? "Save report"
                  : "Submit report"
            }
            onPress={submit}
            loading={mutation.isPending}
          />
          {report ? (
            <Button
              title="Cancel"
              variant="secondary"
              onPress={cancelEdit}
              disabled={mutation.isPending}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const StudentReviewSection = ({
  lesson,
  review,
  onSaved,
}: {
  lesson: Lesson;
  review: TeacherReview | null;
  onSaved: (review: TeacherReview) => void;
}) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(!review);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const trimmed = comment.trim();
      return saveLessonReview(lesson.id, {
        rating,
        ...(trimmed ? { comment: trimmed } : {}),
      });
    },
    onSuccess: (saved) => {
      onSaved(saved);
      setEditing(false);
      setFormError(null);
      setNotice("Thank you — your review has been saved.");
      void queryClient.invalidateQueries({ queryKey: ["lessons"] });
      void queryClient.invalidateQueries({ queryKey: ["lessons", lesson.id] });
      void queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
      void queryClient.invalidateQueries({
        queryKey: ["teacher-profile", lesson.teacherId],
      });
    },
    onError: (error) =>
      setFormError(
        errorMessage(error, "Unable to save your review. Please try again.")
      ),
  });

  const submit = () => {
    setFormError(null);
    setNotice(null);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setFormError("Choose a rating from 1 to 5 stars.");
      return;
    }
    mutation.mutate();
  };

  const cancelEdit = () => {
    setRating(review?.rating ?? 0);
    setComment(review?.comment ?? "");
    setFormError(null);
    setEditing(false);
  };

  if (review && !editing) {
    return (
      <Card>
        <SectionTitle
          icon="chatbubble-ellipses-outline"
          title="Your review"
          action={
            <Button
              title="Update"
              variant="secondary"
              size="sm"
              icon="create-outline"
              onPress={() => {
                setNotice(null);
                setEditing(true);
              }}
            />
          }
        />
        <View style={styles.sectionBody}>
          <ReviewContent review={review} />
        </View>
        {notice ? (
          <View style={styles.noticeGap}>
            <Notice tone="success" message={notice} />
          </View>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle icon="chatbubble-ellipses-outline" title="Rate this lesson" />
      <AppText variant="small" color="muted" style={styles.lede}>
        Your rating helps other students choose a teacher.
      </AppText>

      <View style={styles.form}>
        <View style={styles.stackTight}>
          <AppText variant="label">Your rating</AppText>
          <StarRatingInput value={rating} onChange={setRating} />
        </View>

        <TextField
          label="Comment (optional)"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={MAX_LENGTH}
          editable={!mutation.isPending}
          placeholder="What went well? What could be better?"
          hint={`${comment.trim().length} / ${MAX_LENGTH} characters`}
        />

        {formError ? <Notice tone="error" message={formError} /> : null}

        <View style={styles.actions}>
          <Button
            title={
              mutation.isPending
                ? "Saving…"
                : review
                  ? "Save review"
                  : "Submit review"
            }
            onPress={submit}
            loading={mutation.isPending}
          />
          {review ? (
            <Button
              title="Cancel"
              variant="secondary"
              onPress={cancelEdit}
              disabled={mutation.isPending}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const ReadOnlyPanel = ({
  icon,
  title,
  empty,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  empty: string;
  children?: ReactNode;
}) => (
  <Card>
    <SectionTitle icon={icon} title={title} />
    <View style={styles.sectionBody}>
      {children ?? (
        <AppText variant="small" color="muted">
          {empty}
        </AppText>
      )}
    </View>
  </Card>
);

/** Post-lesson report (teacher) and review (student) panel. */
export const LessonFeedback = ({
  lesson,
  role,
}: {
  lesson: Lesson;
  role: UserRole | null;
}) => {
  const [savedReport, setSavedReport] = useState<LessonReport | null>(null);
  const [savedReview, setSavedReview] = useState<TeacherReview | null>(null);
  const report = savedReport ?? lesson.report;
  const review = savedReview ?? lesson.review;

  if (role === "teacher") {
    return (
      <View style={styles.stackLoose}>
        <TeacherReportSection
          lesson={lesson}
          report={report}
          onSaved={setSavedReport}
        />
        {review ? (
          <ReadOnlyPanel
            icon="chatbubble-ellipses-outline"
            title="Student review"
            empty=""
          >
            <ReviewContent review={review} />
          </ReadOnlyPanel>
        ) : null}
      </View>
    );
  }

  if (role === "student") {
    return (
      <View style={styles.stackLoose}>
        <ReadOnlyPanel
          icon="clipboard-outline"
          title="Class report"
          empty="Your teacher's report for this class will appear here once it is submitted."
        >
          {report ? <ReportContent report={report} /> : undefined}
        </ReadOnlyPanel>
        <StudentReviewSection
          lesson={lesson}
          review={review}
          onSaved={setSavedReview}
        />
      </View>
    );
  }

  return (
    <View style={styles.stackLoose}>
      <ReadOnlyPanel
        icon="clipboard-outline"
        title="Class report"
        empty="The teacher has not submitted a report yet."
      >
        {report ? <ReportContent report={report} /> : undefined}
      </ReadOnlyPanel>
      <ReadOnlyPanel
        icon="chatbubble-ellipses-outline"
        title="Student review"
        empty="The student has not reviewed this lesson yet."
      >
        {review ? <ReviewContent review={review} /> : undefined}
      </ReadOnlyPanel>
    </View>
  );
};

const styles = StyleSheet.create({
  stack: { gap: 14 },
  stackTight: { gap: 6 },
  stackLoose: { gap: 14 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBody: { marginTop: 14 },
  noticeGap: { marginTop: 14 },
  lede: { marginTop: 6, lineHeight: 19 },
  form: { marginTop: 16, gap: 16 },
  progressRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  progressChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
