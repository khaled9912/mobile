import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppNotification, NotificationKind } from "@/api/types";
import { AppText } from "@/components/ui/app-text";
import { PillPressable } from "@/components/ui/pill-pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { useNotifications } from "@/hooks/use-notifications";
import { useTheme } from "@/providers/theme-provider";

const ICONS: Record<
  NotificationKind,
  { icon: keyof typeof Ionicons.glyphMap; tone: "brand" | "gold" | "info" | "success" }
> = {
  booking: { icon: "calendar", tone: "success" },
  lesson: { icon: "videocam", tone: "brand" },
  request: { icon: "swap-horizontal", tone: "info" },
  report: { icon: "document-text", tone: "gold" },
  payment: { icon: "card", tone: "gold" },
  system: { icon: "notifications", tone: "brand" },
};

const Palette = ({
  kind,
  children,
}: {
  kind: NotificationKind;
  children: (accent: string, soft: string) => ReactNode;
}) => {
  const { colors } = useTheme();
  const { tone } = ICONS[kind] ?? ICONS.system;
  const accent = colors[tone];
  const soft =
    tone === "gold"
      ? colors.goldSoft
      : tone === "info"
        ? colors.infoSoft
        : tone === "success"
          ? colors.successSoft
          : colors.brandSoft;
  return <>{children(accent, soft)}</>;
};

const ctaFor = (link: string | null) => {
  if (!link) return null;
  if (link.startsWith("/lesson/")) return "Open lesson";
  if (link.startsWith("/schedule") || link.startsWith("/teacher/schedule"))
    return "Open schedule";
  return "Open";
};

const NotificationRow = ({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) => {
  const { colors, radius } = useTheme();
  const unread = !item.readAt;
  const meta = ICONS[item.kind] ?? ICONS.system;
  const cta = ctaFor(item.link);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}${cta ? `. ${cta}` : ""}`}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? colors.surfaceMuted
            : unread
              ? colors.brandSoft
              : colors.card,
          borderColor: unread ? colors.brand : colors.border,
          borderRadius: radius.lg,
        },
      ]}
    >
      <Palette kind={item.kind}>
        {(accent, soft) => (
          <View style={[styles.rowIcon, { backgroundColor: soft }]}>
            <Ionicons name={meta.icon} size={18} color={accent} />
          </View>
        )}
      </Palette>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <AppText variant="label" weight="700" style={styles.rowTitle}>
            {item.title}
          </AppText>
          <AppText variant="caption" color="muted">
            {timeAgo(item.createdAt)}
          </AppText>
        </View>
        <AppText variant="caption" color="muted">
          {item.body}
        </AppText>
        {cta ? (
          <View style={styles.rowCta}>
            <AppText variant="caption" weight="700" color="link">
              {cta}
            </AppText>
            <Ionicons name="chevron-forward" size={12} color={colors.link} />
          </View>
        ) : null}
      </View>
      {unread ? (
        <View style={[styles.unreadDot, { backgroundColor: colors.brand }]} />
      ) : null}
    </Pressable>
  );
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const NotificationsSheet = ({ visible, onClose }: Props) => {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    enabled,
    items,
    unread,
    isLoading,
    isError,
    refetch,
    markRead,
    markAllRead,
    markingAll,
  } = useNotifications();

  const open = (item: AppNotification) => {
    if (!item.readAt) markRead(item.id);
    onClose();
    const link = item.link;
    if (link && link.startsWith("/") && !link.startsWith("//")) {
      router.push(link);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close notifications"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.xl,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitle}>
              <AppText variant="h3">Notifications</AppText>
              {unread > 0 ? (
                <View
                  style={[styles.countPill, { backgroundColor: colors.brand }]}
                >
                  <AppText variant="caption" weight="800" color={colors.onBrand}>
                    {unread}
                  </AppText>
                </View>
              ) : null}
            </View>
            <View style={styles.sheetActions}>
              {unread > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark all notifications as read"
                  onPress={() => markAllRead()}
                  disabled={markingAll}
                  hitSlop={8}
                >
                  <AppText variant="caption" weight="700" color="link">
                    {markingAll ? "Marking…" : "Mark all read"}
                  </AppText>
                </Pressable>
              ) : null}
              <PillPressable
                accessibilityLabel="Close notifications"
                onPress={onClose}
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="close" size={16} color={colors.text} />
              </PillPressable>
            </View>
          </View>

          {!enabled ? (
            <View style={styles.empty}>
              <View
                style={[styles.emptyIcon, { backgroundColor: colors.brandSoft }]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={26}
                  color={colors.brand}
                />
              </View>
              <AppText variant="h3" align="center">
                Sign in to see your updates
              </AppText>
              <AppText variant="small" color="muted" align="center">
                Booking confirmations and lesson reminders arrive here.
              </AppText>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingRows}>
              {[0, 1, 2].map((key) => (
                <View key={key} style={styles.loadingRow}>
                  <Skeleton width={38} height={38} radius={19} />
                  <View style={styles.loadingCopy}>
                    <Skeleton width="46%" height={13} />
                    <Skeleton width="86%" height={11} style={styles.loadingGap} />
                  </View>
                </View>
              ))}
            </View>
          ) : isError ? (
            <View style={styles.empty}>
              <AppText variant="h3" align="center">
                Notifications could not load
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Try loading notifications again"
                onPress={() => void refetch()}
                hitSlop={8}
              >
                <AppText variant="caption" weight="700" color="link">
                  Try again
                </AppText>
              </Pressable>
            </View>
          ) : items.length ? (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} onPress={open} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.empty}>
              <View
                style={[styles.emptyIcon, { backgroundColor: colors.brandSoft }]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={26}
                  color={colors.brand}
                />
              </View>
              <AppText variant="h3" align="center">
                You&apos;re all caught up
              </AppText>
              <AppText variant="small" color="muted" align="center">
                Lesson reminders arrive five minutes before each lesson starts.
              </AppText>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export const NotificationsBell = ({ onPress }: { onPress: () => void }) => {
  const { colors } = useTheme();
  const { unread } = useNotifications();

  return (
    <PillPressable accessibilityLabel="Notifications" onPress={onPress}>
      <View style={styles.bell}>
        <Ionicons name="notifications-outline" size={19} color={colors.text} />
        {unread > 0 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.brand, borderColor: colors.card },
            ]}
          >
            <AppText
              variant="caption"
              weight="800"
              color={colors.onBrand}
              style={styles.badgeText}
            >
              {unread > 9 ? "9+" : unread}
            </AppText>
          </View>
        ) : null}
      </View>
    </PillPressable>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: "78%",
    borderWidth: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  sheetTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  countPill: {
    minWidth: 24,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flexGrow: 0 },
  loadingRows: { gap: 10, paddingBottom: 4 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingCopy: { flex: 1 },
  loadingGap: { marginTop: 8 },
  listContent: { gap: 8, paddingBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, gap: 3 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowTitle: { flex: 1 },
  rowCta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 26 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bell: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 1,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, lineHeight: 12 },
});
