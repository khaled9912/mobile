import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getContactSubmissions } from "@/api/contact";
import { formatDateTime } from "@/lib/format";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";

export default function ContactSubmissionsScreen() {
  const submissionsQuery = useQuery({
    queryKey: ["admin", "contact-submissions"],
    queryFn: getContactSubmissions,
  });

  const submissions = submissionsQuery.data ?? [];

  return (
    <RoleGate roles={["admin", "super_admin"]}>
      <Screen
        edges={["left", "right"]}
        refreshing={submissionsQuery.isFetching}
        onRefresh={() => void submissionsQuery.refetch()}
      >
        <PageHeader
          eyebrow="Academy administration"
          title="Contact messages"
          subtitle="Messages sent from the public contact form. They are also emailed to the academy inbox."
        />

        {submissionsQuery.isLoading ? (
          <LoadingView label="Loading messages…" />
        ) : submissionsQuery.isError ? (
          <ErrorView
            error={submissionsQuery.error}
            onRetry={() => void submissionsQuery.refetch()}
          />
        ) : submissions.length ? (
          <View style={styles.list}>
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <View style={styles.head}>
                  <View style={styles.copy}>
                    <AppText variant="h3">{submission.name}</AppText>
                    <AppText variant="caption" color="muted">
                      {submission.email}
                    </AppText>
                  </View>
                  <Badge
                    label={submission.status || "new"}
                    tone={submission.status === "new" ? "info" : "neutral"}
                  />
                </View>
                <AppText variant="small" style={styles.message}>
                  {submission.message}
                </AppText>
                <AppText variant="caption" color="muted" style={styles.date}>
                  Sent {formatDateTime(submission.createdAt)}
                </AppText>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="mail-open-outline"
            title="No messages yet"
            body="Messages sent through the contact form will appear here."
          />
        )}
      </Screen>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: { flex: 1, gap: 1 },
  message: { marginTop: 12, lineHeight: 20 },
  date: { marginTop: 10 },
});
