import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { acceptOpenOffer, getTeacherOpenOffers } from "@/api/scheduling";
import type { OpenStudentOffer } from "@/api/types";
import { useToast } from "@/providers/toast-provider";
import { SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { TextCardSkeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatTime } from "@/lib/format";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { useNow } from "@/hooks/use-now";

export const TeacherOpenOffers = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const now = useNow();
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const offersQuery = useQuery({
    queryKey: ["open-offers", "teacher"],
    queryFn: getTeacherOpenOffers,
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

  const openOffers = offers.filter(
    (offer) =>
      offer.status === "open" && new Date(offer.startsAt).getTime() > now
  );
  const claimedOffers = offers.filter((offer) => offer.status === "claimed");

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["open-offers"] }),
      queryClient.invalidateQueries({ queryKey: ["lessons"] }),
      queryClient.invalidateQueries({ queryKey: ["series"] }),
      queryClient.invalidateQueries({ queryKey: ["teacher-directory"] }),
    ]);
  };

  const accept = useMutation({
    mutationFn: (offerId: string) => acceptOpenOffer(offerId),
    onSuccess: async (result) => {
      setAcceptError(null);
      showToast(
        `${result.offer?.studentName ?? "The student"} booked. The lesson is on your schedule.`
      );
      await invalidate();
    },
    onError: async (error) => {
      setAcceptError(
        error instanceof ApiError
          ? error.message
          : "This time is no longer available."
      );
      await invalidate();
    },
  });

  const confirmAccept = (offer: OpenStudentOffer) => {
    Alert.alert(
      "Accept this time?",
      `${offer.studentName} · ${formatDateTime(
        offer.startsAt
      )} – ${formatTime(offer.endsAt)}.\n\nThis books the lesson on your schedule right away.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept and book",
          onPress: () => {
            setAcceptError(null);
            accept.mutate(offer.id);
          },
        },
      ]
    );
  };

  const error = acceptError || offersQuery.error;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={`Students looking for a teacher (${openOffers.length})`}
      />
      <AppText variant="small" color="muted">
        Unassigned students can offer a one-off time. The first teacher to accept
        books it instantly; everyone else sees that the student picked another
        teacher.
      </AppText>

      {error ? (
        <Notice
          tone="error"
          message={
            error instanceof ApiError
              ? error.message
              : "Unable to load student offers."
          }
        />
      ) : null}

      <View style={styles.list}>
        {offersQuery.isLoading ? (
          <>
            <TextCardSkeleton lines={2} action />
            <TextCardSkeleton lines={2} action />
          </>
        ) : offersQuery.isError ? (
          <ErrorView
            error={offersQuery.error}
            onRetry={() => void offersQuery.refetch()}
          />
        ) : openOffers.length ? (
          openOffers.map((offer) => {
            const accepting =
              accept.isPending && accept.variables === offer.id;
            return (
              <Card key={offer.id}>
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <AppText variant="body" weight="600">
                      {offer.studentName}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {formatDateTime(offer.startsAt)} –{" "}
                      {formatTime(offer.endsAt)}
                    </AppText>
                  </View>
                  <Badge label="New" tone="warning" />
                </View>
                <View style={styles.actions}>
                  <Button
                    title={accepting ? "Booking…" : "Accept and book"}
                    size="sm"
                    icon="checkmark-circle-outline"
                    loading={accepting}
                    disabled={accept.isPending}
                    onPress={() => confirmAccept(offer)}
                  />
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="people-outline"
            title="No open student offers"
            body="You will be notified when a student without a teacher posts a time."
          />
        )}
      </View>

      {claimedOffers.length ? (
        <View style={styles.recent}>
          <SectionHeader title="Recently booked by other teachers" />
          <View style={styles.list}>
            {claimedOffers.map((offer) => (
              <Card key={offer.id}>
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <AppText variant="body" weight="600">
                      {offer.studentName} chose{" "}
                      {offer.claimedByTeacherName ?? "another teacher"}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {formatDateTime(offer.startsAt)} –{" "}
                      {formatTime(offer.endsAt)}
                    </AppText>
                  </View>
                  <Badge label="Booked" tone="info" />
                </View>
              </Card>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 10, marginBottom: 24 },
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: { flex: 1, gap: 3 },
  actions: { marginTop: 12, flexDirection: "row" },
  recent: { gap: 10, marginTop: 8 },
});
