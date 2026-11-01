import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMyChangeRequests } from "@/api/scheduling";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
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

  const changes = changesQuery.data ?? [];
  const pending = changes
    .filter((change) => change.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const history = changes
    .filter((change) => change.status !== "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Student portal"
        title="Time changes"
        subtitle="Ask the academy for a different weekly time. Your current time stays booked while they check with your teacher."
      />

      {changesQuery.isLoading ? (
        <LoadingView label="Loading your time changes…" />
      ) : changesQuery.isError ? (
        <ErrorView
          error={changesQuery.error}
          onRetry={() => void changesQuery.refetch()}
        />
      ) : (
        <View style={styles.sections}>
          <View style={styles.section}>
            <SectionHeader title="Awaiting the academy" />
            {pending.length ? (
              <View style={styles.list}>
                {pending.map((change) => (
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
                title="No change waiting"
                body="You can request a different weekly time from any of your booked lessons in the Schedule tab."
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

          {history.length ? (
            <View style={styles.section}>
              <SectionHeader title="History" />
              <View style={styles.list}>
                {history.map((change) => (
                  <ChangeRequestCard
                    key={change.id}
                    request={change}
                    perspective="student"
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Notice
              tone="info"
              title="Your weekly time is permanent"
              message="Booked weekly lessons repeat automatically and stay yours until the academy approves a change."
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
