import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { Lesson } from "@/api/types";
import { formatDateTime, formatTimeRange, relativeDay, startsInLabel } from "@/lib/format";
import {
  isLessonLive,
  isReportDue,
  lessonStatusLabel,
  lessonStatusTone,
} from "@/lib/status";
import { useNow } from "@/hooks/use-now";
import { useTheme } from "@/providers/theme-provider";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";

type Props = {
  lesson: Lesson;
  perspective: "student" | "teacher" | "admin";
  action?: ReactNode;
  subtitle?: string;
};

export const LessonCard = ({ lesson, perspective, action, subtitle }: Props) => {
  const { colors, radius } = useTheme();
  const now = useNow();
  const live = isLessonLive(lesson, now);
  const countdown =
    lesson.status === "scheduled" && !live
      ? startsInLabel(lesson.startsAt, now)
      : null;
  const person =
    perspective === "teacher"
      ? lesson.studentName
      : perspective === "admin"
        ? `${lesson.studentName} · ${lesson.teacherName}`
        : lesson.teacherName;

  return (
    <Card
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      accessibilityLabel={`${formatDateTime(lesson.startsAt)} with ${person}${live ? ", live now" : ""}`}
      style={live ? { borderColor: colors.success } : undefined}
    >
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <AppText variant="caption" color="gold" weight="700">
            {relativeDay(lesson.startsAt).toUpperCase()}
          </AppText>
          <View style={styles.timeRow}>
            <AppText variant="h3" style={styles.title}>
              {formatTimeRange(lesson.startsAt, lesson.endsAt)}
            </AppText>
            {live ? (
              <View
                style={[
                  styles.livePill,
                  {
                    backgroundColor: colors.successSoft,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <View
                  style={[styles.liveDot, { backgroundColor: colors.success }]}
                />
                <AppText variant="caption" weight="700" color={colors.success}>
                  Live now
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="small" color="muted" style={styles.subtitle}>
            {perspective === "teacher" ? "Student" : "Teacher"}: {person}
          </AppText>
          {countdown ? (
            <AppText variant="caption" weight="700" color="brand">
              {countdown}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText variant="caption" color="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={styles.badges}>
          {lesson.isTrial ? <Badge label="Trial" tone="info" /> : null}
          {live ? null : (
            <Badge
              label={lessonStatusLabel[lesson.status]}
              tone={lessonStatusTone[lesson.status]}
            />
          )}
        </View>
      </View>

      {perspective === "teacher" && lesson.status !== "cancelled" ? (
        isReportDue(lesson) ? (
          <View style={styles.flag}>
            <AppText variant="caption" weight="700" color="warning">
              Lesson report needed
            </AppText>
          </View>
        ) : lesson.report ? (
          <View style={styles.flag}>
            <AppText variant="caption" color="muted">
              Report submitted
            </AppText>
          </View>
        ) : null
      ) : null}

      {action ? <View style={styles.action}>{action}</View> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: { flex: 1, gap: 2 },
  badges: { alignItems: "flex-end", gap: 6 },
  title: { marginTop: 1 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  subtitle: { marginTop: 2 },
  flag: { marginTop: 10 },
  action: { marginTop: 14 },
});
