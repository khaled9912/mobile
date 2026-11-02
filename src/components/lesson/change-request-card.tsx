import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { LessonChangeRequest } from "@/api/types";
import { formatWeeklySlot } from "@/lib/format";
import { getViewerTimeZone, toViewerWeeklySlotLabel } from "@/lib/weekly-time";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";

type Perspective = "student" | "admin";

const statusLabel = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Declined",
} as const;

const statusTone = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
} as const;

export const ChangeRequestCard = ({
  request,
  perspective,
  actions,
}: {
  request: LessonChangeRequest;
  perspective: Perspective;
  actions?: ReactNode;
}) => {
  const viewerTimeZone = getViewerTimeZone();
  const slotLabel = (
    dayOfWeek: number,
    startsAtTime: string,
    endsAtTime: string
  ) =>
    perspective === "student"
      ? toViewerWeeklySlotLabel(
          { dayOfWeek, startsAtTime, endsAtTime, timeZoneId: request.timeZoneId },
          viewerTimeZone
        )
      : formatWeeklySlot(dayOfWeek, startsAtTime, endsAtTime);

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="h3">
            {slotLabel(
              request.requestedDayOfWeek,
              request.requestedStartsAtTime,
              request.requestedEndsAtTime
            )}
          </AppText>
          <AppText variant="small" color="muted" style={styles.line}>
            Was{" "}
            {slotLabel(
              request.currentDayOfWeek,
              request.currentStartsAtTime,
              request.currentEndsAtTime
            )}
          </AppText>
          <AppText variant="caption" color="muted">
            {perspective === "admin"
              ? `${request.studentName} · ${request.teacherName}`
              : `With ${request.teacherName}`}
          </AppText>
          {request.studentNote ? (
            <AppText variant="caption" color="muted" style={styles.note}>
              “{request.studentNote}”
            </AppText>
          ) : null}
          {request.adminNote ? (
            <AppText variant="caption" color="muted" style={styles.note}>
              Academy: {request.adminNote}
            </AppText>
          ) : null}
        </View>
        <Badge
          label={statusLabel[request.status]}
          tone={statusTone[request.status]}
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
  line: { marginTop: 2 },
  note: { marginTop: 6, lineHeight: 18 },
  actions: { marginTop: 14, flexDirection: "row", gap: 10 },
});
