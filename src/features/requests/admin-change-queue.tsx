import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { ChangeRequestStatus } from "@/api/types";
import { getAdminChangeRequests } from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { TextCardSkeleton } from "@/components/ui/skeleton";
import { ChangeRequestCard } from "@/components/lesson/change-request-card";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

type Filter = ChangeRequestStatus | "all";

export const AdminChangeQueue = () => {
  const [filter, setFilter] = useState<Filter>("all");

  const changesQuery = useQuery({
    queryKey: ["change-requests", "admin", filter],
    queryFn: () =>
      getAdminChangeRequests(filter === "all" ? undefined : filter),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(changesQuery.refetch);

  const changes = changesQuery.data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Academy administration"
        title="Time changes"
        subtitle="Students move their own weekly time and can only pick a slot their teacher published, so the new time is booked the moment they ask. This is the record."
      />

      <Segmented
        label="Change filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "applied", label: "Applied" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Declined" },
        ]}
      />

      <View style={styles.list}>
        {changesQuery.isLoading ? (
          <>
            <TextCardSkeleton lines={3} />
            <TextCardSkeleton lines={3} />
            <TextCardSkeleton lines={3} />
          </>
        ) : changesQuery.isError ? (
          <ErrorView
            error={changesQuery.error}
            onRetry={() => void changesQuery.refetch()}
          />
        ) : changes.length ? (
          changes.map((change) => (
            <ChangeRequestCard
              key={change.id}
              request={change}
              perspective="admin"
            />
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No time changes"
            body={
              filter === "all"
                ? "No weekly time has been moved yet."
                : "Nothing recorded under this filter."
            }
          />
        )}
      </View>

      <Card style={styles.footnote}>
        <AppText variant="caption" color="muted">
          A move deletes the remaining weekly lessons and recreates them at the
          new time, and the old time opens up for other students. You still get
          a notification for every change.
        </AppText>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { marginTop: 18, gap: 10 },
  footnote: { marginTop: 16 },
});
