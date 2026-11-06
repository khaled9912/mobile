import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMyChangeRequests } from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView } from "@/components/ui/states";
import {
  SectionHeaderSkeleton,
  TextCardSkeleton,
} from "@/components/ui/skeleton";
import { ChangeRequestCard } from "@/components/lesson/change-request-card";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

export const StudentChangeRequests = () => {
  const changesQuery = useQuery({
    queryKey: ["change-requests", "student"],
    queryFn: getMyChangeRequests,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const { refreshing, onRefresh } = usePullRefresh(changesQuery.refetch);

  const changes = [...(changesQuery.data ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Student portal"
        title="Time changes"
        subtitle="You choose any open weekly time your teacher publishes, and your lessons move straight away. This is the record of your changes."
      />

      {changesQuery.isLoading ? (
        <View style={styles.sections}>
          <View style={styles.section}>
            <SectionHeaderSkeleton withAction={false} />
            <View style={styles.list}>
              <TextCardSkeleton lines={3} />
              <TextCardSkeleton lines={3} />
            </View>
          </View>
        </View>
      ) : changesQuery.isError ? (
        <ErrorView
          error={changesQuery.error}
          onRetry={() => void changesQuery.refetch()}
        />
      ) : (
        <View style={styles.sections}>
          <View style={styles.section}>
            <SectionHeader title="Your changes" />
            {changes.length ? (
              <View style={styles.list}>
                {changes.map((change) => (
                  <ChangeRequestCard
                    key={change.id}
                    request={change}
                    perspective="student"
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="mail-open-outline"
                title="No changes yet"
                body="You can move a weekly time from any of your booked lessons in the Schedule tab."
                action={
                  <Button
                    title="Open schedule"
                    size="sm"
                    onPress={() => router.navigate("/schedule")}
                  />
                }
              />
            )}
          </View>

          <View style={styles.section}>
            <Notice
              tone="info"
              title="Your weekly time is yours"
              message="Booked weekly lessons repeat automatically and stay yours until you move them to another open time."
            />
          </View>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  sections: { marginTop: 20, gap: 26 },
  section: { gap: 12 },
  list: { gap: 10 },
});
