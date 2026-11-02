import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@/providers/theme-provider";
import { formatMonthKey } from "@/lib/format";
import type { BillingMonth } from "@/api/billing";
import { AppText } from "./app-text";

export const MonthChips = ({
  months,
  value,
  onChange,
}: {
  months: BillingMonth[];
  value: string;
  onChange: (month: string) => void;
}) => {
  const { colors, radius } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel="Statement month"
    >
      {months.map((entry) => {
        const selected = entry.month === value;
        return (
          <Pressable
            key={entry.month}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={formatMonthKey(entry.month)}
            onPress={() => onChange(entry.month)}
            style={[
              styles.chip,
              {
                borderColor: selected ? colors.brand : colors.border,
                backgroundColor: selected ? colors.brand : colors.card,
                borderRadius: radius.pill,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="700"
              color={selected ? "onBrand" : "muted"}
            >
              {formatMonthKey(entry.month)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
