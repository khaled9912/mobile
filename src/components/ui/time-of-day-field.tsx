import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { formatTimeOfDay, timeOfDayFromDate } from "@/lib/format";
import { AppText } from "./app-text";
import { Button } from "./button";

type Props = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  hint?: string;
  error?: string;
};

/** Time-of-day picker for weekly availability, where no calendar date applies. */
export const TimeOfDayField = ({
  label,
  value,
  onChange,
  hint,
  error,
}: Props) => {
  const { colors, radius, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const labelValue = formatTimeOfDay(timeOfDayFromDate(value));

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode: "time",
        is24Hour: false,
        onChange: (event, selected) => {
          if (event.type !== "set" || !selected) return;
          const next = new Date();
          next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
          onChange(next);
        },
      });
      return;
    }
    setDraft(value);
    setSheetOpen(true);
  };

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${labelValue}`}
        accessibilityHint="Opens the time picker"
        onPress={open}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: 50,
            paddingHorizontal: 14,
            borderRadius: radius.md,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.input,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name="time-outline" size={19} color={colors.link} />
        <AppText variant="body" style={styles.value}>
          {labelValue}
        </AppText>
        <Ionicons name="chevron-down" size={17} color={colors.muted} />
      </Pressable>
      {hint ? (
        <AppText variant="caption" color="muted">
          {hint}
        </AppText>
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={sheetOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSheetOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close time picker"
              onPress={() => setSheetOpen(false)}
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
            />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <View style={styles.sheetHead}>
                <AppText variant="h3">{label}</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close time picker"
                  hitSlop={10}
                  onPress={() => setSheetOpen(false)}
                >
                  <Ionicons name="close" size={22} color={colors.muted} />
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="time"
                display="spinner"
                themeVariant={scheme}
                onChange={(_, selected) => {
                  if (selected) setDraft(selected);
                }}
              />
              <Button
                title="Set time"
                onPress={() => {
                  const next = new Date();
                  next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
                  onChange(next);
                  setSheetOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  value: { flex: 1 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
