import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import { acceptPolicy, getPolicyState } from "@/api/policy";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/states";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { usePullRefresh } from "@/hooks/use-pull-refresh";

/**
 * The agreement the API holds against this account's first real action. The
 * clause text comes from the backend, so the wording matches the web page and a
 * version bump reaches both clients without a release.
 */
export const PolicyAgreement = () => {
  const { colors, radius, spacing } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["policy-state"],
    queryFn: getPolicyState,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const doc = query.data?.document ?? null;
  const [ticked, setTicked] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  // Ticks belong to the text on screen; a refreshed document starts clean.
  useEffect(() => {
    setTicked([]);
    setConfirmed(false);
  }, [doc?.key, doc?.version]);

  const missing = useMemo(
    () => (doc?.clauses ?? []).filter((clause) => !ticked.includes(clause.id)),
    [doc, ticked]
  );

  const toggle = (id: string) =>
    setTicked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );

  const accept = useMutation({
    mutationFn: () => acceptPolicy(doc!.key, doc!.version, ticked),
    onSuccess: async () => {
      showToast("Agreement accepted. You can continue now.");
      setConfirmed(false);
      setTicked([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["policy-state"] }),
        queryClient.invalidateQueries({ queryKey: ["onboarding"] }),
        queryClient.invalidateQueries({ queryKey: ["availability-rules"] }),
      ]);
    },
    onError: (error) => {
      showToast(
        error instanceof ApiError
          ? error.message
          : "Unable to record your acceptance. Please try again.",
        "error"
      );
      if (error instanceof ApiError && error.status === 409) void query.refetch();
    },
  });

  const { refreshing, onRefresh } = usePullRefresh(query.refetch);

  if (query.isLoading) return <LoadingView label="Loading the agreement…" />;
  if (query.isError)
    return <ErrorView error={query.error} onRetry={() => void query.refetch()} />;

  const state = query.data;
  if (!state?.required || !doc)
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <PageHeader title="Academy agreement" />
        <EmptyState
          title="Nothing to sign"
          body="This account type has no agreement waiting on it."
        />
      </Screen>
    );

  const rtl = doc.language === "ar";
  const align = rtl ? "right" : "left";

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow="Academy agreement"
        title={doc.title}
        subtitle={doc.summary}
      />

      {state.accepted ? (
        <View style={{ gap: spacing.md }}>
          <Notice
            tone="success"
            title={`Version ${doc.version} accepted`}
            message={
              state.acceptedAt
                ? `Signed on ${new Date(state.acceptedAt).toLocaleString()}. The academy will ask again if the rules change.`
                : "Signed. The academy will ask again if the rules change."
            }
          />
          <AppText variant="caption" color="muted" align={align}>
            {doc.clauses.map((clause, index) => `${index + 1}. ${clause.title}`).join("\n")}
          </AppText>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {doc.clauses.map((clause, index) => {
            const on = ticked.includes(clause.id);
            return (
              <Pressable
                key={clause.id}
                accessibilityRole="checkbox"
                accessibilityLabel={clause.title}
                accessibilityState={{ checked: on }}
                onPress={() => toggle(clause.id)}
                style={({ pressed }) => [
                  styles.clause,
                  {
                    borderRadius: radius.lg,
                    borderColor: on ? colors.brand : colors.border,
                    backgroundColor: on ? colors.brandSoft : colors.card,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={on ? "checkbox" : "checkbox-outline"}
                  size={22}
                  color={on ? colors.brand : colors.muted}
                />
                <View style={styles.clauseCopy}>
                  <AppText variant="label" align={align}>
                    {index + 1}. {clause.title}
                  </AppText>
                  <AppText
                    variant="small"
                    color="muted"
                    align={align}
                    style={styles.clauseBody}
                  >
                    {clause.body}
                  </AppText>
                </View>
              </Pressable>
            );
          })}

          <Card>
            <AppText variant="label" align={align}>
              I have read every clause above and agree to them for this account.
            </AppText>
            <Button
              title="Accept and continue"
              onPress={() => accept.mutate()}
              loading={accept.isPending}
              disabled={missing.length > 0 || !confirmed}
              style={styles.confirmButton}
              accessibilityHint="Records your acceptance of the current version"
            />
            <View style={styles.statusRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Confirm you have read every clause"
                accessibilityState={{ checked: confirmed }}
                onPress={() => setConfirmed((current) => !current)}
                style={styles.confirmToggle}
              >
                <Ionicons
                  name={confirmed ? "checkbox" : "checkbox-outline"}
                  size={22}
                  color={confirmed ? colors.brand : colors.muted}
                />
                <AppText variant="small">
                  {confirmed ? "I agree" : "Tick to agree"}
                </AppText>
              </Pressable>
              {missing.length > 0 && (
                <AppText variant="caption" color="muted">
                  {missing.length} of {doc.clauses.length} clauses still need a
                  tick.
                </AppText>
              )}
            </View>
          </Card>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  clause: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  clauseCopy: { flex: 1, gap: 4 },
  clauseBody: { lineHeight: 20 },
  confirmButton: { marginTop: 12 },
  confirmToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusRow: { marginTop: 10, gap: 6 },
});
