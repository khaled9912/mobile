import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "./app-text";

type Option<T extends string> = { value: T; label: string };

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) => {
  const { colors, radius } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[
        styles.wrapper,
        { borderColor: colors.border, borderRadius: radius.md },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              {
                backgroundColor: selected ? colors.brand : "transparent",
                borderRadius: radius.sm,
              },
            ]}
          >
            <AppText
              variant="label"
              color={selected ? "onBrand" : "muted"}
              weight="700"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    minHeight: 40,
  },
});
