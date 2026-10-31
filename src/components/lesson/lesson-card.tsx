import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { Lesson } from "@/api/types";
import { formatDateTime, formatTimeRange, relativeDay } from "@/lib/format";
import {
  isReportDue,
  lessonStatusLabel,
  lessonStatusTone,
} from "@/lib/status";
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
  const person =
    perspective === "teacher"
      ? lesson.studentName
      : perspective === "admin"
        ? `${lesson.studentName} · ${lesson.teacherName}`
        : lesson.teacherName;

  return (
    <Card
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      accessibilityLabel={`${formatDateTime(lesson.startsAt)} with ${person}`}
    >
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <AppText variant="caption" color="gold" weight="700">
            {relativeDay(lesson.startsAt).toUpperCase()}
          </AppText>
          <AppText variant="h3" style={styles.title}>
            {formatTimeRange(lesson.startsAt, lesson.endsAt)}
          </AppText>
          <AppText variant="small" color="muted" style={styles.subtitle}>
            {perspective === "teacher" ? "Student" : "Teacher"}: {person}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Badge
          label={lessonStatusLabel[lesson.status]}
          tone={lessonStatusTone[lesson.status]}
        />
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
  title: { marginTop: 1 },
  subtitle: { marginTop: 2 },
  flag: { marginTop: 10 },
  action: { marginTop: 14 },
});
