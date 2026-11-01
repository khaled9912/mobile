import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  getMyChangeRequests,
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
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";
import {
  formatWeeklySlot,
  formatWeeklyTimeRange,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
} from "@/lib/format";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";

const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

export default function ChangeTimeScreen() {
  const params = useLocalSearchParams<{ seriesId?: string }>();
  const seriesId = typeof params.seriesId === "string" ? params.seriesId : "";
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const seriesQuery = useQuery({
    queryKey: ["series"],
    queryFn: getMySeries,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const series = (seriesQuery.data ?? []).find((item) => item.id === seriesId);
  const teacherId = series?.teacherId ?? "";

  const teacherQuery = useQuery({
    queryKey: ["teacher-profile", teacherId],
    queryFn: () => getTeacherProfile(teacherId),
    enabled: Boolean(teacherId),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const changesQuery = useQuery({
    queryKey: ["change-requests", "student"],
    queryFn: getMyChangeRequests,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const pending = (changesQuery.data ?? []).find(
    (change) => change.status === "pending" && change.seriesId === seriesId
  );

  const available = useMemo(() => {
    const rules = teacherQuery.data?.slots ?? [];
    return rules
      .filter((rule) => rule.status === "available")
      .sort(
        (a, b) =>
          (DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)) ||
          a.startsAtTime.localeCompare(b.startsAtTime)
      );
  }, [teacherQuery.data]);

  const submit = useMutation({
    mutationFn: (ruleId: string) =>
      series
        ? requestTimeChange(series.id, ruleId, note)
        : Promise.reject(new Error("This weekly time no longer exists.")),
    onSuccess: async () => {
      setError("");
      setNotice(
        "Request sent. The academy will confirm the new time with your teacher and update your weekly lessons."
      );
      await queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["series"] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] });
      setSelected(null);
      setNote("");
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

  const renderRule = (rule: WeeklyRule) => {
    const isSelected = selected === rule.id;
    return (
      <Card
        key={rule.id}
        onPress={() => setSelected(isSelected ? null : rule.id)}
        accessibilityLabel={`${formatWeeklySlot(
          rule.dayOfWeek,
          rule.startsAtTime,
          rule.endsAtTime
        )}`}
      >
        <View style={styles.ruleRow}>
          <View style={styles.rulecopy}>
            <AppText variant="h3">
              {WEEKDAY_LABELS[rule.dayOfWeek]}
            </AppText>
            <AppText variant="small" color="muted">
              {formatWeeklyTimeRange(rule.startsAtTime, rule.endsAtTime)}
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

  const grouped = available.reduce<Record<number, WeeklyRule[]>>(
    (acc, rule) => {
      (acc[rule.dayOfWeek] ??= []).push(rule);
      return acc;
    },
    {}
  );

  return (
    <RoleGate roles={["student"]}>
      <Screen>
        <PageHeader
          eyebrow="Weekly lessons"
          title="Change your time"
          subtitle="Pick a new weekly time. The academy will check it with your teacher, then move your lessons."
        />

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
        {pending ? (
          <View style={styles.block}>
            <Notice
              tone="warning"
              title="A change is already being reviewed"
              message={`You asked to move this weekly time to ${formatWeeklySlot(
                pending.requestedDayOfWeek,
                pending.requestedStartsAtTime,
                pending.requestedEndsAtTime
              )}. Wait for the academy to respond first.`}
            />
          </View>
        ) : null}

        {seriesQuery.isLoading ? (
          <LoadingView label="Loading your weekly time…" />
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
                  series.dayOfWeek,
                  series.startsAtTime,
                  series.endsAtTime
                )}
              </AppText>
              <AppText variant="caption" color="muted">
                With {series.teacherName} · repeats every{" "}
                {WEEKDAY_SHORT[series.dayOfWeek]}
              </AppText>
            </Card>

            <View style={styles.section}>
              <SectionHeader title="Choose a new time" />
              {teacherQuery.isLoading ? (
                <LoadingView label="Loading available times…" />
              ) : teacherQuery.isError ? (
                <ErrorView
                  error={teacherQuery.error}
                  onRetry={() => void teacherQuery.refetch()}
                />
              ) : available.length ? (
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
              ) : (
                <EmptyState
                  icon="time-outline"
                  title="No other times available"
                  body={`${series.teacherName} has not announced any other weekly times right now.`}
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
                <Button
                  title={submit.isPending ? "Sending…" : "Request this time"}
                  loading={submit.isPending}
                  disabled={!selected || Boolean(pending) || submit.isPending}
                  onPress={() => selected && submit.mutate(selected)}
                />
                <AppText variant="caption" color="muted">
                  Your current weekly time stays booked until the academy
                  approves the change.
                </AppText>
              </View>
            ) : null}
          </>
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  section: { marginTop: 24, gap: 12 },
  list: { gap: 18 },
  day: { gap: 8 },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rulecopy: { flex: 1, gap: 2 },
});
