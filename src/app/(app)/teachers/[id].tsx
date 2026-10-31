import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  getMyLessonRequests,
  getTeacherProfile,
  requestLessonSlot,
} from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { StarRating } from "@/components/ui/star-rating";
import { RoleGate } from "@/components/ui/role-gate";
import {
  formatDateTime,
  formatLongDate,
  formatTimeRange,
  relativeDay,
} from "@/lib/format";
import { openRequests } from "@/lib/lesson-selectors";

export default function TeacherProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const teacherId = typeof params.id === "string" ? params.id : "";
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const teacherQuery = useQuery({
    queryKey: ["teacher-profile", teacherId],
    queryFn: () => getTeacherProfile(teacherId),
    enabled: Boolean(teacherId),
  });
  const requestsQuery = useQuery({
    queryKey: ["lesson-requests", "student"],
    queryFn: getMyLessonRequests,
  });

  const request = useMutation({
    mutationFn: (slotId: string) => requestLessonSlot(slotId),
    onSuccess: async () => {
      setError("");
      setNotice(
        "Request sent. Your teacher confirms the time first, then the academy approves the lesson."
      );
      await queryClient.invalidateQueries({ queryKey: ["lesson-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
      await queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
    onError: (mutationError) => {
      setNotice("");
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Unable to send the request. Please try again."
      );
    },
  });

  const teacher = teacherQuery.data;
  const open = openRequests(requestsQuery.data ?? []);
  const blocked = open.length > 0;

  const ask = (slotId: string, label: string) => {
    if (blocked) return;
    Alert.alert(
      "Request this lesson?",
      `${label}. Your teacher confirms first, then the academy approves it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send request",
          onPress: () => request.mutate(slotId),
        },
      ]
    );
  };

  return (
    <RoleGate roles={["student"]}>
      <Screen
        edges={["left", "right"]}
        refreshing={teacherQuery.isFetching}
        onRefresh={() => void teacherQuery.refetch()}
      >
        {teacherQuery.isLoading ? (
          <LoadingView label="Loading teacher profile…" />
        ) : teacherQuery.isError ? (
          <ErrorView
            error={teacherQuery.error}
            onRetry={() => void teacherQuery.refetch()}
          />
        ) : teacher ? (
          <>
            <PageHeader
              eyebrow="Teacher profile"
              title={teacher.teacher.fullName}
              subtitle={
                teacher.averageRating != null
                  ? `${teacher.averageRating.toFixed(1)} average rating · ${teacher.reviewCount} reviews`
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

            {blocked ? (
              <View style={styles.block}>
                <Notice
                  tone="warning"
                  title="Finish your current request first"
                  message={`You already have a lesson request awaiting approval for ${formatDateTime(open[0].startsAt)}.`}
                />
              </View>
            ) : null}
            {notice ? (
              <View style={styles.block}>
                <Notice tone="success" message={notice} />
              </View>
            ) : null}
            {error ? (
              <View style={styles.block}>
                <Notice tone="error" message={error} />
              </View>
            ) : null}

            <SectionHeader title="Open lesson times" />
            {teacher.slots.length ? (
              <View style={styles.list}>
                {teacher.slots.map((slot) => (
                  <Card key={slot.id}>
                    <View style={styles.slotRow}>
                      <View style={styles.slotCopy}>
                        <AppText variant="caption" color="gold" weight="700">
                          {relativeDay(slot.startsAt).toUpperCase()}
                        </AppText>
                        <AppText variant="h3">
                          {formatTimeRange(slot.startsAt, slot.endsAt)}
                        </AppText>
                        <AppText variant="caption" color="muted">
                          {formatLongDate(slot.startsAt)}
                        </AppText>
                      </View>
                      <Button
                        title={
                          request.isPending &&
                          request.variables === slot.id
                            ? "Sending…"
                            : "Request"
                        }
                        size="sm"
                        disabled={blocked || request.isPending}
                        loading={
                          request.isPending && request.variables === slot.id
                        }
                        onPress={() =>
                          ask(
                            slot.id,
                            `${formatDateTime(slot.startsAt)} – ${formatTimeRange(slot.startsAt, slot.endsAt)}`
                          )
                        }
                      />
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="time-outline"
                title="No open times right now"
                body="This teacher has not published any lesson times. Check back soon or choose another teacher."
              />
            )}

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
  list: { gap: 10 },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  slotCopy: { flex: 1, gap: 2 },
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
