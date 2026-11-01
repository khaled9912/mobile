import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import {
  deleteAvailability,
  getMyAvailability,
  publishAvailability,
} from "@/api/scheduling";
import type { AvailabilitySlotStatus } from "@/api/types";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";
import {
  formatDateTime,
  formatLongDate,
  formatTimeRange,
  relativeDay,
} from "@/lib/format";
import type { Tone } from "@/lib/status";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

const MAX_SLOT_MINUTES = 240;

const durations = [30, 45, 60, 90, 120, 180, 240] as const;

const durationLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours} hours`;
};

const slotStatusLabel: Record<AvailabilitySlotStatus, string> = {
  available: "Open",
  requested: "Requested",
  booked: "Booked",
  unavailable: "Unavailable",
};

const slotStatusTone: Record<AvailabilitySlotStatus, Tone> = {
  available: "success",
  requested: "warning",
  booked: "info",
  unavailable: "neutral",
};

const nextHalfHour = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (date.getMinutes() === 0 && date <= new Date()) {
    date.setHours(date.getHours() + 1);
  }
  return date;
};

export default function TeacherAvailabilityScreen() {
  const queryClient = useQueryClient();
  const { colors, radius } = useTheme();
  const [start, setStart] = useState(nextHalfHour);
  const [duration, setDuration] = useState<number>(60);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ["availability", "teacher"],
    queryFn: getMyAvailability,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(slotsQuery.refetch);

  const end = useMemo(
    () => new Date(start.getTime() + duration * 60 * 1000),
    [start, duration]
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["availability"] });

  const publish = useMutation({
    mutationFn: (input: { startsAt: string; endsAt: string }) =>
      publishAvailability(input.startsAt, input.endsAt),
    onSuccess: async (slot) => {
      setFormError(null);
      setNotice(
        `Published ${formatDateTime(slot.startsAt)} – ${formatTimeRange(
          slot.startsAt,
          slot.endsAt
        )}.`
      );
      setStart(new Date(slot.endsAt));
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: ["teacher-directory"],
      });
    },
    onError: (error) => {
      setNotice(null);
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to publish this slot. Please try again."
      );
    },
  });

  const remove = useMutation({
    mutationFn: (slotId: string) => deleteAvailability(slotId),
    onSuccess: async () => {
      setFormError(null);
      setNotice("Slot removed.");
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: ["teacher-directory"],
      });
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to remove this slot. Please try again."
      ),
  });

  const slots = [...(slotsQuery.data ?? [])].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt)
  );

  const submit = () => {
    setNotice(null);
    setFormError(null);
    if (start.getTime() <= Date.now()) {
      setFormError("Choose a start time in the future.");
      return;
    }
    if (duration > MAX_SLOT_MINUTES) {
      setFormError("A slot can last up to 4 hours.");
      return;
    }
    publish.mutate({
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
  };

  const confirmRemove = (slotId: string, label: string) => {
    Alert.alert(
      "Remove this slot?",
      `${label} will no longer be offered to students.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => remove.mutate(slotId),
        },
      ]
    );
  };

  return (
    <RoleGate roles={["teacher"]}>
      <Screen edges={["left", "right"]} refreshing={refreshing} onRefresh={onRefresh}>
        <PageHeader
          eyebrow="Teacher portal"
          title="Manage availability"
          subtitle="Publish the exact lesson times your students can request. Only open slots can be removed."
        />

        <Card>
          <SectionHeader title="Publish a time slot" />
          <View style={styles.form}>
            <DateTimeField
              label="Starts at"
              value={start}
              onChange={setStart}
              minimumDate={new Date()}
              hint="Times are shown in your device's time zone."
            />

            <View style={styles.durationBlock}>
              <AppText variant="label">Duration</AppText>
              <View style={styles.durationRow} accessibilityRole="radiogroup">
                {durations.map((minutes) => {
                  const selected = minutes === duration;
                  return (
                    <Pressable
                      key={minutes}
                      accessibilityRole="radio"
                      accessibilityLabel={durationLabel(minutes)}
                      accessibilityState={{ selected }}
                      onPress={() => setDuration(minutes)}
                      style={({ pressed }) => [
                        styles.durationChip,
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
                        {durationLabel(minutes)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.summary}>
              <Ionicons name="time-outline" size={17} color={colors.muted} />
              <AppText variant="small" color="muted">
                {formatLongDate(start.toISOString())} ·{" "}
                {formatTimeRange(start.toISOString(), end.toISOString())}
              </AppText>
            </View>

            {formError ? <Notice tone="error" message={formError} /> : null}
            {notice ? <Notice tone="success" message={notice} /> : null}

            <Button
              title="Publish availability"
              onPress={submit}
              loading={publish.isPending}
              icon="add-circle-outline"
            />
          </View>
        </Card>

        <View style={styles.listSection}>
          <SectionHeader title={`Published slots (${slots.length})`} />
          {slotsQuery.isLoading ? (
            <LoadingView label="Loading your availability…" />
          ) : slotsQuery.isError ? (
            <ErrorView
              error={slotsQuery.error}
              onRetry={() => void slotsQuery.refetch()}
            />
          ) : slots.length ? (
            <View style={styles.list}>
              {slots.map((slot) => {
                const deleting =
                  remove.isPending && remove.variables === slot.id;
                return (
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
                      <Badge
                        label={slotStatusLabel[slot.status]}
                        tone={slotStatusTone[slot.status]}
                      />
                    </View>
                    {slot.status === "available" ? (
                      <View style={styles.slotActions}>
                        <Button
                          title={deleting ? "Removing…" : "Remove"}
                          variant="danger"
                          size="sm"
                          icon="trash-outline"
                          loading={deleting}
                          disabled={remove.isPending}
                          onPress={() =>
                            confirmRemove(
                              slot.id,
                              `${formatDateTime(slot.startsAt)} – ${formatTimeRange(
                                slot.startsAt,
                                slot.endsAt
                              )}`
                            )
                          }
                        />
                      </View>
                    ) : (
                      <AppText variant="caption" color="muted" style={styles.locked}>
                        {slot.status === "requested"
                          ? "A student has requested this time."
                          : slot.status === "booked"
                            ? "This slot became a lesson."
                            : "This slot is not offered."}
                      </AppText>
                    )}
                  </Card>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No availability published"
              body="Publish a time above so students can request a lesson with you."
            />
          )}
        </View>
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  durationBlock: { gap: 8 },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: 8 },
  listSection: { marginTop: 28, gap: 12 },
  list: { gap: 10 },
  slotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  slotCopy: { flex: 1, gap: 2 },
  slotActions: { marginTop: 12, flexDirection: "row" },
  locked: { marginTop: 12 },
});
