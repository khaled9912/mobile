import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { formatDateTime } from "@/lib/format";
import { AppText } from "./app-text";
import { Button } from "./button";

type Props = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  hint?: string;
  error?: string;
};

/**
 * One control for a full date and time. Android chains the native date and
 * time dialogs; iOS shows a spinner sheet so nothing floats over the form.
 */
export const DateTimeField = ({
  label,
  value,
  onChange,
  minimumDate,
  hint,
  error,
}: Props) => {
  const { colors, radius, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const openAndroid = () => {
    setDraft(value);
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      minimumDate,
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== "set" || !selectedDate) return;
        const next = new Date(value);
        next.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );
        DateTimePickerAndroid.open({
          value: next,
          mode: "time",
          is24Hour: false,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== "set" || !selectedTime) return;
            next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            onChange(next);
          },
        });
      },
    });
  };

  const open = () => {
    if (Platform.OS === "android") {
      openAndroid();
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
        accessibilityLabel={`${label}: ${formatDateTime(value.toISOString())}`}
        accessibilityHint="Opens the date and time picker"
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
        <Ionicons name="calendar-outline" size={19} color={colors.link} />
        <AppText variant="body" style={styles.value}>
          {formatDateTime(value.toISOString())}
        </AppText>
        <Ionicons name="chevron-down" size={17} color={colors.muted} />
      </Pressable>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : hint ? (
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
              accessibilityLabel="Close date picker"
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
                  accessibilityLabel="Close date picker"
                  hitSlop={10}
                  onPress={() => setSheetOpen(false)}
                >
                  <Ionicons name="close" size={22} color={colors.muted} />
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="datetime"
                display="spinner"
                minimumDate={minimumDate}
                themeVariant={scheme}
                onChange={(_, selected) => {
                  if (selected) setDraft(selected);
                }}
              />
              <Button
                title="Set date and time"
                onPress={() => {
                  onChange(draft);
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
