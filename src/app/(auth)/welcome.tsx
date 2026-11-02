import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LaunchIntro } from "@/components/onboarding/launch-intro";
import { WelcomeExperience } from "@/components/onboarding/welcome-experience";
import { markWelcomeSeen } from "@/lib/welcome";
import { useTheme } from "@/providers/theme-provider";

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    markWelcomeSeen();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {ready ? (
        <WelcomeExperience onReplayIntro={() => setReady(false)} />
      ) : (
        <LaunchIntro onDone={() => setReady(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
