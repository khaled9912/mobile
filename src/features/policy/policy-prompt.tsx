import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getPolicyState } from "@/api/policy";
import { useAuth } from "@/providers/auth-provider";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";

/**
 * The standing reminder that an account has not signed its agreement yet. The
 * API also refuses the actions behind that agreement, so this is the friendly
 * route to the same place rather than the enforcement itself.
 */
export const PolicyPrompt = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["policy-state"],
    queryFn: getPolicyState,
    enabled: user?.role === "teacher" || user?.role === "student",
    refetchInterval: LIVE_SYNC_INTERVAL,
    staleTime: 60_000,
  });

  const state = query.data;
  if (!state?.required || state.accepted) return null;

  return (
    <View style={styles.block}>
      <Notice
        tone="warning"
        title={state.document?.title ?? "Academy agreement"}
        message="Tick each clause to sign it. Until then the academy cannot publish your times, finish your setup, or open a lesson room for you."
      />
      <Button
        title="Review and accept"
        variant="secondary"
        onPress={() => router.push("/policy")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: 8, marginBottom: 16 },
});
