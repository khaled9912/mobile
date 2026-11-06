import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  getMyOpenOffers,
  publishOpenOffer,
  withdrawOpenOffer,
} from "@/api/scheduling";
import type { OpenStudentOffer } from "@/api/types";
import { useToast } from "@/providers/toast-provider";
import { SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { TextCardSkeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatTime } from "@/lib/format";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";

const OPEN_OFFER_LIMIT = 4;
const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
];

const defaultStart = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return date;
};

export const StudentOpenOffers = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [duration, setDuration] = useState("60");
  const endsAt = new Date(startsAt.getTime() + Number(duration) * 60_000);

  const offersQuery = useQuery({
    queryKey: ["open-offers", "student"],
    queryFn: getMyOpenOffers,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const offers = useMemo(
    () =>
      [...(offersQuery.data ?? [])].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      ),
    [offersQuery.data]
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["open-offers"] });

  const publish = useMutation({
    mutationFn: () =>
      publishOpenOffer(startsAt.toISOString(), endsAt.toISOString()),
    onSuccess: async () => {
      showToast("Time offered. All teachers were notified.");
      await invalidate();
    },
    onError: (error) =>
      showToast(
        error instanceof ApiError
          ? error.message
          : "Unable to offer this time. Please try again.",
        "error"
      ),
  });

  const withdraw = useMutation({
    mutationFn: (offerId: string) => withdrawOpenOffer(offerId),
    onSuccess: async () => {
      showToast("Offered time withdrawn.");
      await invalidate();
    },
    onError: (error) =>
      showToast(
        error instanceof ApiError
          ? error.message
          : "Unable to withdraw this time. Please try again.",
        "error"
      ),
  });

  const submit = () => {
    if (startsAt.getTime() <= Date.now()) {
      showToast("Choose a time in the future.", "error");
      return;
    }
    const openCount = offers.filter(
      (offer) =>
        offer.status === "open" &&
        new Date(offer.startsAt).getTime() > Date.now()
    ).length;
    if (openCount >= OPEN_OFFER_LIMIT) {
      showToast(
        `You already have ${OPEN_OFFER_LIMIT} open offers. Withdraw one to add another.`,
        "error"
      );
      return;
    }
    publish.mutate();
  };

  const confirmWithdraw = (offer: OpenStudentOffer) => {
    Alert.alert(
      "Withdraw this offered time?",
      `${formatDateTime(offer.startsAt)} will no longer be offered to teachers.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: () => withdraw.mutate(offer.id),
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Offer a lesson time" />
      <Card>
        <AppText variant="small" color="muted">
          You have no teacher yet. Offer up to {OPEN_OFFER_LIMIT} times and
          every active teacher is notified — the first teacher to accept books
          it on your schedule.
        </AppText>
        <View style={styles.form}>
          <DateTimeField
            label="Starts at"
            value={startsAt}
            onChange={setStartsAt}
            minimumDate={new Date()}
          />
          <Segmented
            label="Lesson length"
            options={DURATION_OPTIONS}
            value={duration}
            onChange={setDuration}
          />
          <AppText variant="caption" color="muted">
            Ends at {formatTime(endsAt.toISOString())}
          </AppText>
          <Button
            title="Offer this time"
            icon="megaphone-outline"
            onPress={submit}
            loading={publish.isPending}
          />
        </View>
      </Card>

      <View style={styles.list}>
        <SectionHeader title="Your offered times" />
        {offersQuery.isLoading ? (
          <>
            <TextCardSkeleton lines={2} />
            <TextCardSkeleton lines={2} />
          </>
        ) : offersQuery.isError ? (
          <ErrorView
            error={offersQuery.error}
            onRetry={() => void offersQuery.refetch()}
          />
        ) : offers.length ? (
          offers.map((offer) => {
            const removing =
              withdraw.isPending && withdraw.variables === offer.id;
            return (
              <Card key={offer.id}>
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <AppText variant="body" weight="600">
                      {formatDateTime(offer.startsAt)} –{" "}
                      {formatTime(offer.endsAt)}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {offer.status === "claimed"
                        ? `Booked with ${
                            offer.claimedByTeacherName ?? "a teacher"
                          }`
                        : offer.status === "withdrawn"
                          ? "Withdrawn"
                          : "All teachers were notified"}
                    </AppText>
                  </View>
                  <Badge
                    label={
                      offer.status === "claimed"
                        ? "Booked"
                        : offer.status === "withdrawn"
                          ? "Withdrawn"
                          : "Open"
                    }
                    tone={
                      offer.status === "claimed"
                        ? "success"
                        : offer.status === "withdrawn"
                          ? "neutral"
                          : "info"
                    }
                  />
                </View>
                {offer.status === "open" ? (
                  <View style={styles.actions}>
                    <Button
                      title={removing ? "Withdrawing…" : "Withdraw"}
                      size="sm"
                      variant="secondary"
                      loading={removing}
                      disabled={withdraw.isPending}
                      onPress={() => confirmWithdraw(offer)}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="megaphone-outline"
            title="No offered times yet"
            body="Add a time above and every teacher is notified right away."
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 22 },
  form: { gap: 14, marginTop: 14 },
  list: { gap: 10, marginTop: 10 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: { flex: 1, gap: 3 },
  actions: { marginTop: 12, flexDirection: "row" },
});
