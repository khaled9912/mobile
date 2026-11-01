import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import {
  bookWeeklySlots,
  getTeacherProfile,
} from "@/api/scheduling";
import type { WeeklyRule } from "@/api/types";
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
import { useTheme } from "@/providers/theme-provider";
import {
  formatDateTime,
  formatWeeklySlot,
  formatWeeklyTimeRange,
  weekdayLabel,
} from "@/lib/format";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

export default function TeacherProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const teacherId = typeof params.id === "string" ? params.id : "";
  const queryClient = useQueryClient();
  const { colors, radius } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const teacherQuery = useQuery({
    queryKey: ["teacher-profile", teacherId],
    queryFn: () => getTeacherProfile(teacherId),
    enabled: Boolean(teacherId),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(teacherQuery.refetch);

  const book = useMutation({
    mutationFn: (ruleIds: string[]) => bookWeeklySlots(ruleIds),
    onSuccess: async (result) => {
      setError("");
      setSelected([]);
      setNotice(
        `${result.series.length} weekly ${
          result.series.length === 1 ? "time is" : "times are"
        } yours. They repeat every week — ask the academy if you need to change one.${
          result.lessons.some((lesson) => lesson.isTrial)
            ? " Your first lesson is a trial."
            : ""
        }`
      );
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] });
      await queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
      await queryClient.invalidateQueries({ queryKey: ["series"] });
      await queryClient.invalidateQueries({ queryKey: ["change-requests"] });
    },
    onError: (mutationError) => {
      setNotice("");
      setError(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Unable to book these times. Please try again."
      );
    },
  });

  const teacher = teacherQuery.data;

  const grouped = useMemo(() => {
    const rules = teacher?.slots ?? [];
    return DAY_ORDER.map((day) => ({
      day,
      rules: rules
        .filter((rule) => rule.dayOfWeek === day)
        .sort((a, b) => a.startsAtTime.localeCompare(b.startsAtTime)),
    })).filter((group) => group.rules.length > 0);
  }, [teacher?.slots]);

  const toggle = (rule: WeeklyRule) => {
    setNotice("");
    setError("");
    if (rule.status !== "available") return;
    setSelected((current) =>
      current.includes(rule.id)
        ? current.filter((id) => id !== rule.id)
        : [...current, rule.id]
    );
  };

  const confirmBook = () => {
    if (!selected.length || !teacher) return;
    const labels = (teacher.slots ?? [])
      .filter((rule) => selected.includes(rule.id))
      .map((rule) => formatWeeklySlot(rule.dayOfWeek, rule.startsAtTime, rule.endsAtTime))
      .join("\n");
    Alert.alert(
      `Book ${selected.length} weekly ${
        selected.length === 1 ? "time" : "times"
      }?`,
      `${labels}\n\nThese repeat every week and are yours until the academy changes them.${
        teacher.hasLessons ? "" : "\n\nYour first lesson is a trial."
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book",
          onPress: () => book.mutate(selected),
        },
      ]
    );
  };

  return (
    <RoleGate roles={["student"]}>
      <Screen
        edges={["left", "right"]}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {teacherQuery.isLoading ? (
          <LoadingView label="Loading teacher profile…" />
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
            {!teacher.hasLessons ? (
              <View style={styles.block}>
                <Notice
                  tone="info"
                  title="First lesson is a trial"
                  message="Your first booked lesson is flagged as a trial, at no extra step."
                />
              </View>
            ) : null}

            {teacher.series.length ? (
              <View style={styles.section}>
                <SectionHeader title="Your weekly times" />
                <View style={styles.list}>
                  {teacher.series.map((series) => (
                    <Card key={series.id}>
                      <View style={styles.ruleRow}>
                        <View style={styles.ruleCopy}>
                          <AppText variant="h3">
                            {formatWeeklySlot(
                              series.dayOfWeek,
                              series.startsAtTime,
                              series.endsAtTime
                            )}
                          </AppText>
                          <AppText variant="caption" color="muted">
                            Repeats every week. Ask the academy to move it.
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
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionHeader
                title="Weekly availability"
                action={
                  selected.length ? (
                    <Badge
                      label={`${selected.length} selected`}
                      tone="info"
                    />
                  ) : undefined
                }
              />
              {grouped.length ? (
                <View style={styles.list}>
                  {grouped.map((group) => (
                    <View key={group.day} style={styles.dayGroup}>
                      <AppText variant="caption" color="gold" weight="700">
                        {weekdayLabel(group.day).toUpperCase()}
                      </AppText>
                      {group.rules.map((rule) => {
                        const chosen = selected.includes(rule.id);
                        const open = rule.status === "available";
                        const yours = rule.status === "yours";
                        return (
                          <Pressable
                            key={rule.id}
                            accessibilityRole="checkbox"
                            accessibilityLabel={formatWeeklySlot(
                              rule.dayOfWeek,
                              rule.startsAtTime,
                              rule.endsAtTime
                            )}
                            accessibilityState={{
                              checked: chosen,
                              disabled: !open,
                            }}
                            disabled={!open}
                            onPress={() => toggle(rule)}
                            style={({ pressed }) => [
                              styles.ruleCard,
                              {
                                borderRadius: radius.lg,
                                borderColor: chosen
                                  ? colors.success
                                  : colors.border,
                                backgroundColor: chosen
                                  ? colors.successSoft
                                  : colors.card,
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.check,
                                {
                                  borderColor: chosen
                                    ? colors.brand
                                    : colors.border,
                                  backgroundColor: chosen
                                    ? colors.brand
                                    : "transparent",
                                },
                              ]}
                            >
                              {chosen ? (
                                <Ionicons
                                  name="checkmark"
                                  size={15}
                                  color={colors.onBrand}
                                />
                              ) : null}
                            </View>
                            <View style={styles.ruleCopy}>
                              <AppText variant="h3">
                                {formatWeeklyTimeRange(
                                  rule.startsAtTime,
                                  rule.endsAtTime
                                )}
                              </AppText>
                              <AppText variant="caption" color="muted">
                                {yours
                                  ? "Already booked by you"
                                  : open
                                    ? "Open — repeats every week"
                                    : "Booked by another student"}
                              </AppText>
                            </View>
                            {yours ? (
                              <Badge label="Yours" tone="success" />
                            ) : open ? null : (
                              <Badge label="Booked" tone="neutral" />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="time-outline"
                  title="No weekly times yet"
                  body="This teacher has not announced a weekly schedule. Check back soon or choose another teacher."
                />
              )}
            </View>

            {teacher.slots.some((rule) => rule.status === "available") ? (
              <View style={styles.bookBar}>
                <Button
                  title={
                    book.isPending
                      ? "Booking…"
                      : selected.length
                        ? `Book ${selected.length} weekly ${
                            selected.length === 1 ? "time" : "times"
                          }`
                        : "Select weekly times"
                  }
                  loading={book.isPending}
                  disabled={!selected.length || book.isPending}
                  onPress={confirmBook}
                />
                <AppText variant="caption" color="muted" style={styles.bookHint}>
                  Your selection locks instantly and repeats every week.
                </AppText>
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
  dayGroup: { gap: 8 },
  ruleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ruleCopy: { flex: 1, gap: 2 },
  bookBar: { marginTop: 22, gap: 8 },
  bookHint: { textAlign: "center" },
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
