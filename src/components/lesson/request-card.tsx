import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { LessonRequest } from "@/api/types";
import { formatDateTime } from "@/lib/format";
import { requestStatusLabel, requestStatusTone } from "@/lib/status";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";

type Perspective = "student" | "teacher" | "admin";

export const RequestCard = ({
  request,
  perspective,
  actions,
}: {
  request: LessonRequest;
  perspective: Perspective;
  actions?: ReactNode;
}) => {
  const counterpart =
    perspective === "student"
      ? request.teacherName
      : perspective === "teacher"
        ? request.studentName
        : `${request.studentName} · ${request.teacherName}`;

  const proposal =
    request.initiatedBy === "teacher"
      ? "Proposed by the teacher"
      : request.initiatedBy === "student"
        ? "Requested by the student"
        : "Requested";

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="h3">{formatDateTime(request.startsAt)}</AppText>
          <AppText variant="small" color="muted" style={styles.subtitle}>
            {perspective === "admin" ? counterpart : `With ${counterpart}`}
          </AppText>
          <AppText variant="caption" color="muted">
            {proposal}
          </AppText>
          {request.rejectionReason ? (
            <AppText variant="caption" color="danger" style={styles.reason}>
              Reason: {request.rejectionReason}
            </AppText>
          ) : null}
        </View>
        <Badge
          label={requestStatusLabel[request.status]}
          tone={requestStatusTone[request.status]}
        />
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: { flex: 1, gap: 2 },
  subtitle: { marginTop: 2 },
  reason: { marginTop: 4 },
  actions: { marginTop: 14, flexDirection: "row", gap: 10 },
});
