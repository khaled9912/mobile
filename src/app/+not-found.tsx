import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/ui/brand";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen contentStyle={styles.content}>
        <View style={styles.center}>
          <BrandLockup size={68} vertical />
          <AppText variant="h2" align="center" style={styles.title}>
            Page not found
          </AppText>
          <AppText variant="small" color="muted" align="center">
            The screen you followed does not exist in this app.
          </AppText>
          <Button
            title="Go to dashboard"
            onPress={() => router.replace("/")}
            fullWidth
          />
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center" },
  center: { gap: 14, alignItems: "center" },
  title: { marginTop: 18 },
});
