import { StyleSheet, View } from "react-native";
import { WelcomeExperience } from "@/components/onboarding/welcome-experience";
import { useTheme } from "@/providers/theme-provider";

export default function WelcomeScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WelcomeExperience />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
