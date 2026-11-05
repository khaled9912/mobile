import { useTheme } from "@/providers/theme-provider";
import { AppText } from "@/components/ui/app-text";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

const ARCH =
  "M 26.5 354 L 26.5 200 C 27 186 31 170 39 158 C 47 146 58 138 64 124 C 68 114 68 104 70 96 C 82 78 140 48 139.5 30 C 139 48 198 78 209 96 C 211 104 211 114 215 124 C 221 138 232 146 240 158 C 248 170 252 186 252.5 200 L 252.5 354 Z";
const PAGE_LEFT =
  "M 139.5 164 C 118 165 84 168 66 176 C 61 177.5 58 181 58 186 L 58 266 C 58 276 54 282 48 285 C 78 291 112 295 139.5 292 Z";
const PAGE_RIGHT =
  "M 139.5 164 C 161 165 195 168 213 176 C 218 177.5 221 181 221 186 L 221 266 C 221 276 225 282 231 285 C 201 291 167 295 139.5 292 Z";
const SPINE = "M 139.5 171 L 139.5 290";

export const BrandMark = ({
  size = 48,
  color,
  fill: fillColor,
}: {
  size?: number;
  /** Override the stroke, e.g. white over the video stage. */
  color?: string;
  fill?: string;
}) => {
  const { colors, scheme } = useTheme();
  const stroke = color ?? (scheme === "dark" ? "#bfe3c6" : "#217a34");
  const fill = fillColor ?? (scheme === "dark" ? colors.card : "#f2faf3");
  const width = (size * 242) / 340;

  return (
    <View style={{ width, height: size }}>
      <Svg
        width={width}
        height={size}
        viewBox="18 22 242 340"
        accessibilityLabel="Ana Quran logo"
      >
        <Path
          d={ARCH}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={PAGE_LEFT}
          fill={fill}
          stroke={stroke}
          strokeWidth={7}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={PAGE_RIGHT}
          fill={fill}
          stroke={stroke}
          strokeWidth={7}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={SPINE}
          fill="none"
          stroke={stroke}
          strokeWidth={7}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

export const BrandLockup = ({
  size = 44,
  vertical = false,
}: {
  size?: number;
  vertical?: boolean;
}) => {
  return (
    <View
      style={{
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        gap: vertical ? 10 : 10,
      }}
    >
      <BrandMark size={size} />
      <View style={{ alignItems: vertical ? "center" : "flex-start" }}>
        <AppText variant="h3" style={{ fontSize: vertical ? 24 : 18 }}>
          Ana Quran
        </AppText>
        {vertical ? (
          <AppText variant="caption" color="muted">
            Quran & Arabic Academy
          </AppText>
        ) : null}
      </View>
    </View>
  );
};
