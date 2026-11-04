import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { useAppHeaderPresent } from "@/components/navigation/app-header-context";
import { TAB_BAR_OFFSET } from "@/components/navigation/persistent-tab-bar";
import { KeyboardAwareScrollView } from "./keyboard-aware-scroll-view";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  footer?: ReactNode;
  /** Fixed area above the scroll content, e.g. a masthead that stays visible. */
  header?: ReactNode;
};

export const Screen = ({
  children,
  scroll = true,
  keyboard = true,
  refreshing = false,
  onRefresh,
  contentStyle,
  edges = ["top", "left", "right"],
  footer,
  header,
}: Props) => {
  const { colors } = useTheme();
  const appHeaderPresent = useAppHeaderPresent();
  const insets = useSafeAreaInsets();
  const resolvedEdges = appHeaderPresent
    ? edges.filter((edge) => edge !== "top")
    : edges;
  // Screens inside the app shell sit behind the floating tab bar, so their
  // scroll content needs to clear it instead of ending underneath.
  const bottomPadding = footer
    ? 16
    : appHeaderPresent
      ? TAB_BAR_OFFSET + insets.bottom + 12
      : 40;

  const body = scroll ? (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomPadding },
        contentStyle,
      ]}
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        ) : undefined
      }
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={resolvedEdges}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      {header ? (
        <View style={{ backgroundColor: colors.background }}>{header}</View>
      ) : null}
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: 12,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12 },
});
