import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "./app-text";

const Star = ({
  filled,
  size,
  color,
}: {
  filled: boolean;
  size: number;
  color: string;
}) => (
  <Ionicons
    name={filled ? "star" : "star-outline"}
    size={size}
    color={color}
    accessibilityElementsHidden
  />
);

export const StarRating = ({
  value,
  size = 14,
  showValue = false,
}: {
  value: number;
  size?: number;
  showValue?: boolean;
}) => {
  const { colors } = useTheme();
  const rounded = Math.round(value * 2) / 2;
  return (
    <View
      style={styles.row}
      accessibilityLabel={`${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          filled={star <= rounded}
          size={size}
          color={colors.gold}
        />
      ))}
      {showValue ? (
        <AppText variant="caption" color="muted">
          {value.toFixed(1)}
        </AppText>
      ) : null}
    </View>
  );
};

export const StarRatingInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
          accessibilityState={{ selected: star === value }}
          hitSlop={6}
          onPress={() => onChange(star)}
        >
          <Star filled={star <= value} size={30} color={colors.gold} />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
});
