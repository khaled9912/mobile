import { Text, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/providers/theme-provider";
import type { ThemeColors } from "@/theme/tokens";

type Variant =
  | "eyebrow"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "small"
  | "caption"
  | "label"
  | "button";

type Props = TextProps & {
  variant?: Variant;
  color?: keyof ThemeColors | string;
  weight?: TextStyle["fontWeight"];
  align?: TextStyle["textAlign"];
};

export const AppText = ({
  variant = "body",
  color = "text",
  weight,
  align,
  style,
  ...rest
}: Props) => {
  const { colors, typography } = useTheme();
  const palette = typography[variant === "caption" ? "small" : variant];
  const resolvedColor = color in colors ? colors[color as keyof ThemeColors] : color;

  return (
    <Text
      {...rest}
      allowFontScaling
      style={[
        palette,
        { color: resolvedColor },
        variant === "caption" && { fontSize: 12 },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
};
