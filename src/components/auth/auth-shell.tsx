import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/screen";
import { BrandLockup } from "@/components/ui/brand";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/providers/theme-provider";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
};

export const AuthShell = ({
  title,
  subtitle,
  children,
  showBack = false,
}: Props) => {
  const { colors, radius } = useTheme();

  // The masthead sits outside the scroll view, so it stays visible while a
  // long form (or the keyboard) scrolls the fields beneath it.
  const header = (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <BrandLockup size={40} />
    </View>
  );

  return (
    <Screen keyboard contentStyle={styles.content} header={header}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.xl,
          },
        ]}
      >
        <AppText variant="h2" align="center">
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            variant="small"
            color="muted"
            align="center"
            style={styles.subtitle}
          >
            {subtitle}
          </AppText>
        ) : null}
        <View style={styles.body}>{children}</View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 22,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  subtitle: { marginTop: 8, lineHeight: 19 },
  body: { marginTop: 22, gap: 16 },
});
