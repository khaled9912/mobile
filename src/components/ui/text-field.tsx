import { useRef, useState, type ComponentRef } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/providers/theme-provider";
import { useKeyboardAwareField } from "./keyboard-aware-scroll-view";
import { AppText } from "./app-text";

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  secure?: boolean;
  multiline?: boolean;
};

export const TextField = ({
  label,
  error,
  hint,
  secure = false,
  multiline = false,
  style,
  ...rest
}: Props) => {
  const { colors, radius } = useTheme();
  const keyboardAware = useKeyboardAwareField();
  const fieldRef = useRef<ComponentRef<typeof View>>(null);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View ref={fieldRef} style={styles.wrapper}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.danger : focused ? colors.brand : colors.border,
            borderRadius: radius.md,
            minHeight: multiline ? 118 : 50,
          },
        ]}
      >
        <TextInput
          {...rest}
          accessible
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.muted}
          selectionColor={colors.brand}
          secureTextEntry={secure && !revealed}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(event) => {
            setFocused(true);
            if (fieldRef.current) keyboardAware?.focusField(fieldRef.current);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            if (fieldRef.current) keyboardAware?.blurField(fieldRef.current);
            rest.onBlur?.(event);
          }}
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.multiline,
            style,
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setRevealed((value) => !value)}
            style={styles.eye}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" style={styles.hint}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="muted" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 14 },
  inputRow: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  multiline: { paddingTop: 12, minHeight: 110 },
  eye: { paddingLeft: 10, paddingVertical: 10 },
  hint: { paddingHorizontal: 2 },
});
