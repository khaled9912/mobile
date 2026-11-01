import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "@/components/ui/app-text";
import {
  clearApiDebugEntries,
  hydrateApiDebug,
  setApiDebugEnabled,
  useApiDebugEnabled,
  useApiDebugEntries,
  type ApiDebugEntry,
} from "@/lib/api-debug";

const stringify = (value: unknown) => {
  if (value === null || value === undefined) return "No body";
  try {
    return JSON.stringify(value, null, 2) ?? "No body";
  } catch {
    return String(value);
  }
};

const statusLabel = (entry: ApiDebugEntry) => {
  if (entry.error) return "ERR";
  return entry.status === null ? "…" : String(entry.status);
};

const detailLabel = (entry: ApiDebugEntry) => {
  if (entry.error) return entry.error;
  if (entry.status === null) return "In flight";
  return `${entry.status} · ${entry.durationMs ?? 0} ms`;
};

const EntryRow = ({
  entry,
  expanded,
  onToggle,
}: {
  entry: ApiDebugEntry;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const { colors, radius } = useTheme();
  const tone = entry.error
    ? colors.danger
    : entry.status === null
      ? colors.muted
      : entry.status >= 500
        ? colors.danger
        : entry.status >= 400
          ? colors.warning
          : colors.success;

  return (
    <View
      style={[
        styles.entry,
        { borderColor: colors.border, borderRadius: radius.md },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${entry.method} ${entry.path}, ${detailLabel(entry)}`}
        accessibilityHint="Shows the request and response bodies"
        onPress={onToggle}
        style={({ pressed }) => [styles.entryHead, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.statusPill, { backgroundColor: `${tone}22` }]}>
          <Text style={[styles.statusText, { color: tone }]}>
            {statusLabel(entry)}
          </Text>
        </View>
        <View style={styles.entryCopy}>
          <AppText variant="caption" numberOfLines={1}>
            <AppText variant="caption" weight="700">
              {entry.method}
            </AppText>{" "}
            {entry.path}
          </AppText>
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {detailLabel(entry)} ·{" "}
            {new Date(entry.startedAt).toLocaleTimeString()}
          </AppText>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.muted}
        />
      </Pressable>

      {expanded ? (
        <View style={[styles.details, { borderTopColor: colors.border }]}>
          {entry.request !== null ? (
            <>
              <AppText variant="caption" color="muted" weight="700">
                REQUEST
              </AppText>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator
                style={[
                  styles.codeBlock,
                  { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm },
                ]}
              >
                <Text style={[styles.code, { color: colors.text }]}>
                  {stringify(entry.request)}
                </Text>
              </ScrollView>
            </>
          ) : null}
          <AppText variant="caption" color="muted" weight="700">
            RESPONSE
          </AppText>
          {entry.error ? (
            <AppText variant="small" color="danger">
              {entry.error}
            </AppText>
          ) : (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={[
                styles.codeBlock,
                { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm },
              ]}
            >
              <Text style={[styles.code, { color: colors.text }]}>
                {stringify(entry.response)}
              </Text>
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
};

export const ApiDebugOverlay = () => {
  const enabled = useApiDebugEnabled();
  const entries = useApiDebugEntries();
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    void hydrateApiDebug();
  }, []);

  const toggleEntry = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!enabled) return null;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.fabWrapper, { bottom: insets.bottom + 84 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open API debugger"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.text,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="terminal-outline" size={16} color={colors.background} />
          <Text style={[styles.fabLabel, { color: colors.background }]}>API</Text>
          {entries.length > 0 ? (
            <View style={[styles.count, { backgroundColor: colors.brand }]}>
              <Text style={styles.countText}>
                {entries.length > 99 ? "99+" : entries.length}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close API debugger"
            onPress={() => setOpen(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: insets.bottom + 12,
                borderRadius: radius.lg,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitle}>
                <AppText variant="h3">API debugger</AppText>
                <AppText variant="caption" color="muted">
                  {entries.length} request{entries.length === 1 ? "" : "s"} · tap
                  one for the bodies
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Collapse API debugger"
                hitSlop={10}
                onPress={() => setOpen(false)}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-down" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.controls}>
              <View style={styles.toggle}>
                <Switch
                  value={enabled}
                  onValueChange={(value) => {
                    if (!value) setOpen(false);
                    void setApiDebugEnabled(value);
                  }}
                  trackColor={{ true: colors.brand, false: colors.border }}
                  thumbColor={colors.card}
                  accessibilityLabel="Enable API debugger"
                />
                <AppText variant="caption" color="muted">
                  Recording
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear logged requests"
                onPress={clearApiDebugEntries}
                style={({ pressed }) => [
                  styles.clear,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="trash-outline" size={14} color={colors.text} />
                <AppText variant="caption" weight="700">
                  Clear
                </AppText>
              </Pressable>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator
            >
              {entries.length === 0 ? (
                <AppText variant="small" color="muted" align="center">
                  No requests yet. Use the app and they will appear here.
                </AppText>
              ) : (
                entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    expanded={expanded.has(entry.id)}
                    onToggle={() => toggleEntry(entry.id)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabWrapper: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "74%",
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: { flex: 1, gap: 2 },
  iconButton: { padding: 4 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 10,
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  clear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  list: { maxHeight: 440 },
  listContent: { gap: 8, paddingBottom: 8 },
  entry: { borderWidth: StyleSheet.hairlineWidth * 2, overflow: "hidden" },
  entryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusPill: {
    minWidth: 38,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: "center",
  },
  statusText: { fontSize: 10, fontWeight: "800" },
  entryCopy: { flex: 1, gap: 2 },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  codeBlock: { padding: 10, maxHeight: 220 },
  code: {
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 15,
  },
});
