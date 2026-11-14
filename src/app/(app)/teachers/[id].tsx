import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getTeacherProfile } from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView } from "@/components/ui/states";
import {
  PageHeaderSkeleton,
  SectionHeaderSkeleton,
  TextCardSkeleton,
} from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { RoleGate } from "@/components/ui/role-gate";
import { formatDateTime, formatWeeklySlot } from "@/lib/format";
import { getViewerTimeZone, toViewerWeeklyTime } from "@/lib/weekly-time";
import { TimeZoneNote } from "@/components/student/time-zone-note";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export default function TeacherProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const teacherId = typeof params.id === "string" ? params.id : "";

  const teacherQuery = useQuery({
    queryKey: ["teacher-profile", teacherId],
    queryFn: () => getTeacherProfile(teacherId),
    enabled: Boolean(teacherId),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(teacherQuery.refetch);

  const teacher = teacherQuery.data;
  const viewerTimeZone = getViewerTimeZone();

  return (
    <RoleGate roles={["student"]}>
      <Screen
        edges={["left", "right"]}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {teacherQuery.isLoading ? (
          <>
            <PageHeaderSkeleton titleLines={1} />
            <View style={styles.section}>
              <SectionHeaderSkeleton withAction={false} />
              <TextCardSkeleton lines={3} />
              <TextCardSkeleton lines={3} />
              <TextCardSkeleton lines={3} />
            </View>
          </>
        ) : teacherQuery.isError ? (
          <ErrorView
            error={teacherQuery.error}
            onRetry={() => void teacherQuery.refetch()}
          />
        ) : teacher?.teacher ? (
          <>
            <PageHeader
              eyebrow="Teacher profile"
              title={teacher.teacher.fullName}
              subtitle={
                teacher.averageRating != null
                  ? `${teacher.averageRating.toFixed(1)} average rating · ${
                      teacher.reviewCount
                    } reviews`
                  : "New teacher at Ana Quran"
              }
              right={
                <Avatar
                  name={teacher.teacher.fullName}
                  avatarUrl={teacher.teacher.avatarUrl}
                  size={64}
                />
              }
            />

            {teacher.averageRating != null ? (
              <StarRating value={teacher.averageRating} size={18} showValue />
            ) : null}

            {!teacher.hasLessons ? (
              <View style={styles.block}>
                <Notice
                  tone="info"
                  title="First lesson is a trial"
                  message="Your first lesson is flagged as a trial. There is no extra step to take."
                />
              </View>
            ) : null}

            {teacher.series.length ? (
              <View style={styles.section}>
                <SectionHeader title="Your weekly times" />
                <TimeZoneNote
                  zone={viewerTimeZone}
                  sourceZone={teacher.series[0]?.timeZoneId}
                />
                <View style={styles.list}>
                  {teacher.series.map((series) => {
                    const local = toViewerWeeklyTime(series, viewerTimeZone);
                    return (
                      <Card key={series.id}>
                        <View style={styles.ruleRow}>
                          <View style={styles.ruleCopy}>
                            <AppText variant="h3">
                              {formatWeeklySlot(
                                local.dayOfWeek,
                                local.startsAtTime,
                                local.endsAtTime
                              )}
                            </AppText>
                            <AppText variant="caption" color="muted">
                              Repeats every week. Move it any time.
                            </AppText>
                          </View>
                          <Button
                            title="Change time"
                            size="sm"
                            variant="secondary"
                            onPress={() =>
                              router.push(`/change-time/${series.id}`)
                            }
                          />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.reviews}>
              <SectionHeader title="Student reviews" />
              {teacher.reviews?.length ? (
                <View style={styles.list}>
                  {teacher.reviews.map((review) => (
                    <Card key={review.id}>
                      <View style={styles.reviewHead}>
                        <StarRating value={review.rating} size={14} />
                        <Badge
                          label={formatDateTime(review.createdAt)}
                          tone="neutral"
                        />
                      </View>
                      {review.comment ? (
                        <AppText variant="small" style={styles.comment}>
                          {review.comment}
                        </AppText>
                      ) : null}
                      <AppText variant="caption" color="muted">
                        {review.studentName}
                      </AppText>
                    </Card>
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="chatbubble-ellipses-outline"
                  title="No reviews yet"
                  body="Reviews appear after students complete a lesson with this teacher."
                />
              )}
            </View>
          </>
        ) : (
          <ErrorView error={new Error("Teacher not found.")} />
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 14 },
  section: { marginTop: 26, gap: 12 },
  list: { gap: 10 },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ruleCopy: { flex: 1, gap: 2 },
  reviews: { marginTop: 28, gap: 12 },
  reviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  comment: { marginTop: 6, marginBottom: 8, lineHeight: 20 },
});
