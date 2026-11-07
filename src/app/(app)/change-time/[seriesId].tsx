import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  endWeeklySeries,
  getMySeries,
  getTeacherProfile,
  requestTimeChange,
} from "@/api/scheduling";
import type { WeeklyRule } from "@/api/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView } from "@/components/ui/states";
import {
  SectionHeaderSkeleton,
  TextCardSkeleton,
} from "@/components/ui/skeleton";
import { RoleGate } from "@/components/ui/role-gate";
import {
  formatWeeklySlot,
  formatWeeklyTimeRange,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
} from "@/lib/format";
import { getViewerTimeZone, toViewerWeeklyTime } from "@/lib/weekly-time";
import { TimeZoneNote } from "@/components/student/time-zone-note";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";

const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

export default function ChangeTimeScreen() {
  const params = useLocalSearchParams<{ seriesId?: string }>();
  const seriesId = typeof params.seriesId === "string" ? params.seriesId : "";
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const seriesQuery = useQuery({
    queryKey: ["series"],
    queryFn: getMySeries,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const series = (seriesQuery.data ?? []).find((item) => item.id === seriesId);
  const teacherId = series?.teacherId ?? "";
  const viewerTimeZone = getViewerTimeZone();
  const seriesLocal = series
    ? toViewerWeeklyTime(series, viewerTimeZone)
    : null;

  const teacherQuery = useQuery({
    queryKey: ["teacher-profile", teacherId],
    queryFn: () => getTeacherProfile(teacherId),
    enabled: Boolean(teacherId),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const available = (teacherQuery.data?.slots ?? [])
    .filter((rule) => rule.status === "available")
    .map((rule) => ({ rule, local: toViewerWeeklyTime(rule, viewerTimeZone) }))
    .sort(
      (a, b) =>
        DAY_ORDER.indexOf(a.local.dayOfWeek) -
          DAY_ORDER.indexOf(b.local.dayOfWeek) ||
        a.local.startsAtTime.localeCompare(b.local.startsAtTime)
    );

  const submit = useMutation({
    mutationFn: (ruleId: string) =>
      series
        ? requestTimeChange(series.id, ruleId, note)
        : Promise.reject(new Error("This weekly time no longer exists.")),
    onSuccess: async () => {
      showToast("Your weekly time is changed. Upcoming lessons are on it now.");
      await queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["series"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] });
      setSelected(null);
      setNote("");
    },
    onError: (mutationError) => {
      showToast(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Unable to send the request. Please try again.",
        "error"
      );
    },
  });

  const endSeries = useMutation({
    mutationFn: () =>
      series
        ? endWeeklySeries(series.id)
        : Promise.reject(new Error("This weekly time no longer exists.")),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["series"] }),
        queryClient.invalidateQueries({ queryKey: ["change-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["lessons"] }),
        queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] }),
      ]);
      showToast("Weekly lessons ended. Your teacher has been notified.");
      router.navigate("/book");
    },
    onError: (mutationError) => {
      showToast(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Unable to end the weekly time. Please try again.",
        "error"
      );
    },
  });

  const confirmEndSeries = () => {
    if (!series) return;
    Alert.alert(
      "End these weekly lessons?",
      `This cancels your future lessons with ${series.teacherName} and lets your teacher know. You can book a new weekly time at any time.`,
      [
        { text: "Keep my weekly time", style: "cancel" },
        {
          text: "End weekly lessons",
          style: "destructive",
          onPress: () => endSeries.mutate(),
        },
      ]
    );
  };

  const renderRule = ({
    rule,
    local,
  }: {
    rule: WeeklyRule;
    local: ReturnType<typeof toViewerWeeklyTime>;
  }) => {
    const isSelected = selected === rule.id;
    return (
      <Card
        key={rule.id}
        onPress={() => setSelected(isSelected ? null : rule.id)}
        style={
          isSelected
            ? { borderColor: colors.brand, borderWidth: 2 }
            : undefined
        }
        accessibilityLabel={`${formatWeeklySlot(
          local.dayOfWeek,
          local.startsAtTime,
          local.endsAtTime
        )}`}
      >
        <View style={styles.ruleRow}>
          <View style={styles.rulecopy}>
            <AppText variant="h3">{WEEKDAY_LABELS[local.dayOfWeek]}</AppText>
            <AppText variant="small" color="muted">
              {formatWeeklyTimeRange(local.startsAtTime, local.endsAtTime)}
            </AppText>
          </View>
          <Badge
            label={isSelected ? "Selected" : "Available"}
            tone={isSelected ? "success" : "neutral"}
          />
        </View>
      </Card>
    );
  };

  const grouped = available.reduce<
    Record<number, (typeof available)[number][]>
  >((acc, entry) => {
    (acc[entry.local.dayOfWeek] ??= []).push(entry);
    return acc;
  }, {});

  return (
    <RoleGate roles={["student"]}>
      <Screen
        footer={
          series && available.length ? (
            <View style={styles.actionBar}>
              <Button
                title={submit.isPending ? "Moving…" : "Move to this time"}
                loading={submit.isPending}
                disabled={!selected || submit.isPending}
                onPress={() => selected && submit.mutate(selected)}
              />
              <AppText variant="caption" color="muted" style={styles.hint}>
                Your lessons move to the new time right away. Your teacher and
                the academy are told about it.
              </AppText>
            </View>
          ) : null
        }
      >
        <PageHeader
          eyebrow="Weekly lessons"
          title="Change your time"
          subtitle="Pick any open weekly time your teacher publishes. Your lessons move as soon as you choose it."
        />

        {seriesQuery.isLoading ? (
          <>
            <SectionHeaderSkeleton withAction={false} />
            <TextCardSkeleton lines={3} />
          </>
        ) : seriesQuery.isError ? (
          <ErrorView
            error={seriesQuery.error}
            onRetry={() => void seriesQuery.refetch()}
          />
        ) : !series ? (
          <EmptyState
            icon="calendar-outline"
            title="Weekly time not found"
            body="This weekly lesson may no longer be active."
            action={
              <Button
                title="Open schedule"
                size="sm"
                onPress={() => router.navigate("/schedule")}
              />
            }
          />
        ) : (
          <>
            <SectionHeader title="Current weekly time" />
            <Card>
              <AppText variant="h3">
                {formatWeeklySlot(
                  seriesLocal?.dayOfWeek ?? series.dayOfWeek,
                  seriesLocal?.startsAtTime ?? series.startsAtTime,
                  seriesLocal?.endsAtTime ?? series.endsAtTime
                )}
              </AppText>
              <AppText variant="caption" color="muted">
                With {series.teacherName} · repeats every{" "}
                {WEEKDAY_SHORT[seriesLocal?.dayOfWeek ?? series.dayOfWeek]}
              </AppText>
              <View style={styles.note}>
                <TimeZoneNote
                  zone={viewerTimeZone}
                  sourceZone={series.timeZoneId}
                />
              </View>
            </Card>

            <View style={styles.section}>
              <SectionHeader title="Choose a new time" />
              {teacherQuery.isLoading ? (
                <View style={styles.list}>
                  <TextCardSkeleton lines={3} />
                  <TextCardSkeleton lines={3} />
                  <TextCardSkeleton lines={3} />
                </View>
              ) : teacherQuery.isError ? (
                <ErrorView
                  error={teacherQuery.error}
                  onRetry={() => void teacherQuery.refetch()}
                />
              ) : available.length ? (
                <>
                  <TimeZoneNote
                    zone={viewerTimeZone}
                    sourceZone={
                      available[0]?.rule.timeZoneId ?? series.timeZoneId
                    }
                  />
                  <View style={styles.list}>
                    {DAY_ORDER.filter((day) => grouped[day]?.length).map(
                      (day) => (
                        <View key={day} style={styles.day}>
                          <AppText variant="label" color="muted">
                            {WEEKDAY_LABELS[day]}
                          </AppText>
                          {grouped[day].map(renderRule)}
                        </View>
                      )
                    )}
                  </View>
                </>
              ) : (
                <EmptyState
                  icon="time-outline"
                  title="No other times available"
                  body={`${series.teacherName} has not announced any other weekly times right now. You can look for another teacher, or end this weekly time.`}
                  action={
                    <View style={styles.actions}>
                      <Button
                        title="Browse other teachers"
                        onPress={() => router.navigate("/book")}
                      />
                      <Button
                        title="End weekly lessons"
                        variant="danger"
                        loading={endSeries.isPending}
                        disabled={endSeries.isPending}
                        onPress={confirmEndSeries}
                      />
                    </View>
                  }
                />
              )}
            </View>

            {available.length ? (
              <View style={styles.section}>
                <TextField
                  label="Note for the academy (optional)"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Anything they should know about the new time?"
                  multiline
                />
              </View>
            ) : null}
          </>
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 12 },
  actionBar: { gap: 10 },
  hint: { textAlign: "center" },
  list: { gap: 18 },
  day: { gap: 8 },
  note: { marginTop: 10 },
  actions: { gap: 10, alignSelf: "stretch" },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rulecopy: { flex: 1, gap: 2 },
});
