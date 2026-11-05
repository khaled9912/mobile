import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import {
  deleteTeacherAvailabilityAsAdmin,
  deleteWeeklyAvailability,
  getMyAvailabilityRules,
  getTeacherAvailabilityAsAdmin,
  publishTeacherAvailabilityAsAdmin,
  publishWeeklyAvailability,
} from "@/api/scheduling";
import type { WeeklyRule } from "@/api/types";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { TimeOfDayField } from "@/components/ui/time-of-day-field";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { TextCardSkeleton } from "@/components/ui/skeleton";
import {
  WEEKDAY_SHORT,
  dateFromTimeOfDay,
  formatWeeklyTimeRange,
  timeOfDayFromDate,
  weekdayLabel,
} from "@/lib/format";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
const DEFAULT_DAYS = [6, 0, 1, 2, 3, 4];
const MAX_SLOT_MINUTES = 240;

const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

type Props = {
  mode: "self" | "admin";
  teacherId?: string;
  teacherName?: string;
};

export const WeeklyAvailabilityEditor = ({
  mode,
  teacherId,
  teacherName,
}: Props) => {
  const isAdmin = mode === "admin";
  const queryClient = useQueryClient();
  const { colors, radius } = useTheme();
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [start, setStart] = useState(() => dateFromTimeOfDay("17:00"));
  const [end, setEnd] = useState(() => dateFromTimeOfDay("18:00"));
  const [timeZoneOverride, setTimeZoneOverride] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const localTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const rulesQuery = useQuery({
    queryKey: [
      "availability-rules",
      isAdmin ? "admin" : "teacher",
      isAdmin ? teacherId : null,
    ],
    queryFn: () =>
      isAdmin && teacherId
        ? getTeacherAvailabilityAsAdmin(teacherId)
        : getMyAvailabilityRules(),
    enabled: isAdmin ? Boolean(teacherId) : true,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(rulesQuery.refetch);

  const rules = useMemo(
    () =>
      [...(rulesQuery.data ?? [])].sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek) ||
          a.startsAtTime.localeCompare(b.startsAtTime)
      ),
    [rulesQuery.data]
  );

  const timeZoneId = isAdmin
    ? timeZoneOverride || rules[0]?.timeZoneId || localTimeZone
    : localTimeZone;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["availability-rules"] });
    await queryClient.invalidateQueries({ queryKey: ["assigned-teacher"] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-directory"] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
    await queryClient.invalidateQueries({ queryKey: ["teachers"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "teachers"] });
  };

  const publish = useMutation({
    mutationFn: () => {
      const input = {
        daysOfWeek: days,
        startsAtTime: timeOfDayFromDate(start),
        endsAtTime: timeOfDayFromDate(end),
        timeZoneId,
      };
      if (isAdmin && teacherId) {
        return publishTeacherAvailabilityAsAdmin(teacherId, input);
      }
      return publishWeeklyAvailability(input);
    },
    onSuccess: async (created) => {
      setFormError(null);
      setNotice(
        `Announced ${created.length} weekly ${
          created.length === 1 ? "time" : "times"
        }. Students can book ${created.length === 1 ? "it" : "them"} now.`
      );
      await invalidate();
    },
    onError: (error) => {
      setNotice(null);
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to announce these times. Please try again."
      );
    },
  });

  const remove = useMutation({
    mutationFn: (ruleId: string) => {
      if (isAdmin && teacherId) {
        return deleteTeacherAvailabilityAsAdmin(teacherId, ruleId);
      }
      return deleteWeeklyAvailability(ruleId);
    },
    onSuccess: async () => {
      setFormError(null);
      setNotice("Weekly time removed.");
      await invalidate();
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to remove this time. Please try again."
      ),
  });

  const toggleDay = (day: number) => {
    setNotice(null);
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day]
    );
  };

  const submit = () => {
    setNotice(null);
    setFormError(null);
    if (isAdmin && !teacherId) {
      setFormError("Choose a teacher first.");
      return;
    }
    if (!days.length) {
      setFormError("Choose at least one weekday.");
      return;
    }
    const duration = minutesOf(end) - minutesOf(start);
    if (duration <= 0) {
      setFormError("The end time must be after the start time.");
      return;
    }
    if (duration > MAX_SLOT_MINUTES) {
      setFormError("A weekly slot can last up to 4 hours.");
      return;
    }
    publish.mutate();
  };

  const confirmRemove = (rule: WeeklyRule) => {
    Alert.alert(
      "Remove this weekly time?",
      `${weekdayLabel(rule.dayOfWeek)} · ${formatWeeklyTimeRange(
        rule.startsAtTime,
        rule.endsAtTime
      )} will no longer be offered.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => remove.mutate(rule.id),
        },
      ]
    );
  };

  const summary = days.length
    ? `${days
        .slice()
        .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
        .map((day) => WEEKDAY_SHORT[day])
        .join(", ")} · ${timeOfDayFromDate(start)} – ${timeOfDayFromDate(end)}`
    : isAdmin
      ? "Choose the days this teacher teaches."
      : "Choose the days you teach.";

  return (
    <Screen
      edges={["left", "right"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <PageHeader
        eyebrow={isAdmin ? "Academy administration" : "Teacher portal"}
        title="Weekly availability"
        subtitle={
          isAdmin
            ? `Announce weekly times${
                teacherName ? ` for ${teacherName}` : ""
              } on their behalf. A student's booking is instant and repeats every week.`
            : "Announce the weekly times you teach. A student's booking is instant and repeats every week."
        }
      />

      <Card>
        <SectionHeader title="Announce weekly times" />
        <View style={styles.form}>
          <View style={styles.dayBlock}>
            <AppText variant="label">Days</AppText>
            <View style={styles.dayRow} accessibilityRole="group">
              {DAY_ORDER.map((day) => {
                const selected = days.includes(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="checkbox"
                    accessibilityLabel={weekdayLabel(day)}
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleDay(day)}
                    style={({ pressed }) => [
                      styles.dayChip,
                      {
                        borderRadius: radius.pill,
                        borderColor: selected ? colors.brand : colors.border,
                        backgroundColor: selected
                          ? colors.brandSoft
                          : colors.card,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="700"
                      color={selected ? "link" : "muted"}
                    >
                      {WEEKDAY_SHORT[day]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="caption" color="muted">
              A student books the whole window as one weekly lesson.
            </AppText>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <TimeOfDayField
                label="Starts at"
                value={start}
                onChange={setStart}
              />
            </View>
            <View style={styles.timeField}>
              <TimeOfDayField label="Ends at" value={end} onChange={setEnd} />
            </View>
          </View>

          {isAdmin ? (
            <TextField
              label="Teacher's time zone"
              value={timeZoneId}
              onChangeText={setTimeZoneOverride}
              placeholder="e.g. Africa/Cairo"
              autoCapitalize="none"
              autoCorrect={false}
              hint="Defaults to this teacher's existing zone."
            />
          ) : null}

          <View style={styles.summary}>
            <Ionicons name="repeat-outline" size={17} color={colors.muted} />
            <View style={styles.summaryCopy}>
              <AppText variant="small" weight="600">
                {summary}
              </AppText>
              <AppText variant="caption" color="muted">
                Repeats every week · times are in {timeZoneId}
              </AppText>
            </View>
          </View>

          {formError ? <Notice tone="error" message={formError} /> : null}
          {notice ? <Notice tone="success" message={notice} /> : null}

          <Button
            title="Announce availability"
            onPress={submit}
            loading={publish.isPending}
            icon="add-circle-outline"
          />
        </View>
      </Card>

      <View style={styles.listSection}>
        <SectionHeader title={`Announced times (${rules.length})`} />
        {rulesQuery.isLoading ? (
          <View style={styles.list}>
            <TextCardSkeleton lines={3} action />
            <TextCardSkeleton lines={3} action />
            <TextCardSkeleton lines={3} action />
          </View>
        ) : rulesQuery.isError ? (
          <ErrorView
            error={rulesQuery.error}
            onRetry={() => void rulesQuery.refetch()}
          />
        ) : rules.length ? (
          <View style={styles.list}>
            {DAY_ORDER.map((day) => {
              const dayRules = rules.filter((rule) => rule.dayOfWeek === day);
              if (!dayRules.length) return null;
              return (
                <View key={day} style={styles.dayGroup}>
                  <AppText variant="caption" color="gold" weight="700">
                    {weekdayLabel(day).toUpperCase()}
                  </AppText>
                  {dayRules.map((rule) => {
                    const booked = rule.status !== "available";
                    const removing =
                      remove.isPending && remove.variables === rule.id;
                    return (
                      <Card key={rule.id}>
                        <View style={styles.ruleRow}>
                          <View style={styles.ruleCopy}>
                            <AppText variant="h3">
                              {formatWeeklyTimeRange(
                                rule.startsAtTime,
                                rule.endsAtTime
                              )}
                            </AppText>
                            <AppText variant="caption" color="muted">
                              {booked
                                ? "Booked by a student — repeats weekly."
                                : "Open for a student to book."}
                            </AppText>
                          </View>
                          <Badge
                            label={booked ? "Booked" : "Open"}
                            tone={booked ? "info" : "success"}
                          />
                        </View>
                        {booked ? null : (
                          <View style={styles.ruleActions}>
                            <Button
                              title={removing ? "Removing…" : "Remove"}
                              variant="danger"
                              size="sm"
                              icon="trash-outline"
                              loading={removing}
                              disabled={remove.isPending}
                              onPress={() => confirmRemove(rule)}
                            />
                          </View>
                        )}
                      </Card>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No weekly times announced"
            body={
              isAdmin
                ? "Announce this teacher's days and hours above. Students can then book a time instantly."
                : "Announce your days and hours above. Students can then book a time instantly."
            }
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  form: { gap: 16 },
  dayBlock: { gap: 8 },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  timeRow: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1 },
  summary: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryCopy: { flex: 1, gap: 2 },
  listSection: { marginTop: 28, gap: 12 },
  list: { gap: 18 },
  dayGroup: { gap: 8 },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  ruleCopy: { flex: 1, gap: 2 },
  ruleActions: { marginTop: 12, flexDirection: "row" },
});
