import { useTheme } from "@/providers/theme-provider";
import { AppText } from "@/components/ui/app-text";
import { Platform, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

const ARCH_OUTER =
  "M 26.5 354 L 26.5 200 C 27 186 31 170 39 158 C 47 146 58 138 64 124 C 68 114 68 104 70 96 C 82 78 140 48 139.5 30 C 139 48 198 78 209 96 C 211 104 211 114 215 124 C 221 138 232 146 240 158 C 248 170 252 186 252.5 200 L 252.5 354 Z";
const ARCH_INNER =
  "M 36 344 L 36 196 C 37 182 41 168 47 158 C 55 146 66 138 72 126 C 76 116 77 106 79 98 C 84 82 141 60 139.5 44 C 138 60 195 82 200 98 C 202 106 203 116 207 126 C 213 138 224 146 232 158 C 238 168 242 182 243 196 L 243 344 Z";
const STACK_LEFT =
  "M 139.5 164 C 118 165 84 168 66 176 C 61 177.5 58 181 58 186 L 58 266 C 58 276 54 282 48 285 C 78 291 112 295 139.5 292";
const STACK_RIGHT =
  "M 139.5 164 C 161 165 195 168 213 176 C 218 177.5 221 181 221 186 L 221 266 C 221 276 225 282 231 285 C 201 291 167 295 139.5 292";
const PAGE_LEFT =
  "M 139.5 164 C 118 165 84 168 66 176 C 61 177.5 58 181 58 186 L 58 266 C 58 276 54 282 48 285 C 78 291 112 295 139.5 292 Z";
const PAGE_RIGHT =
  "M 139.5 164 C 161 165 195 168 213 176 C 218 177.5 221 181 221 186 L 221 266 C 221 276 225 282 231 285 C 201 291 167 295 139.5 292 Z";
const SPINE = "M 139.5 171 L 139.5 290";

const STACKS = [
  { d: STACK_LEFT, offset: "-11,7" },
  { d: STACK_LEFT, offset: "-7,4.5" },
  { d: STACK_LEFT, offset: "-3.5,2.5" },
  { d: STACK_RIGHT, offset: "11,7" },
  { d: STACK_RIGHT, offset: "7,4.5" },
  { d: STACK_RIGHT, offset: "3.5,2.5" },
];

const ARABIC_FONT = Platform.select({
  ios: "Geeza Pro",
  default: "sans-serif",
});
const LATIN_FONT = Platform.select({
  ios: "Helvetica Neue",
  default: "sans-serif",
});

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
  const dark = scheme === "dark";
  const stroke = color ?? (dark ? "#bfe3c6" : "#217a34");
  const ink = color ?? (dark ? "#bfe3c6" : "#3d3d3d");
  const stack = color ?? (dark ? "#bfe3c6" : "#7c7c7c");
  const fill = fillColor ?? (dark ? colors.card : "#ffffff");
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
          d={ARCH_OUTER}
          fill="none"
          stroke={stroke}
          strokeWidth={4.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={ARCH_INNER}
          fill="none"
          stroke={stroke}
          strokeWidth={4.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {STACKS.map(({ d, offset }) => (
          <Path
            key={offset + d.slice(0, 20)}
            d={d}
            transform={`translate(${offset})`}
            fill="none"
            stroke={stack}
            strokeWidth={1.5}
            strokeOpacity={0.7}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <Path
          d={PAGE_LEFT}
          fill={fill}
          stroke={ink}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={PAGE_RIGHT}
          fill={fill}
          stroke={ink}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={SPINE}
          fill="none"
          stroke={ink}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <SvgText
          x={104}
          y={229}
          textAnchor="middle"
          fontFamily={ARABIC_FONT}
          fontSize={38}
          fontWeight="700"
          fill={stroke}
        >
          قرآن
        </SvgText>
        <SvgText
          x={183}
          y={229}
          textAnchor="middle"
          fontFamily={ARABIC_FONT}
          fontSize={38}
          fontWeight="700"
          fill={stroke}
        >
          أنا
        </SvgText>
        <SvgText
          x={99}
          y={259}
          textAnchor="middle"
          fontFamily={LATIN_FONT}
          fontSize={23}
          fontWeight="700"
          letterSpacing={0.4}
          fill={stroke}
        >
          Ana
        </SvgText>
        <SvgText
          x={184}
          y={259}
          textAnchor="middle"
          fontFamily={LATIN_FONT}
          fontSize={23}
          fontWeight="700"
          letterSpacing={0.4}
          fill={stroke}
        >
          Quran
        </SvgText>
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
      {vertical ? (
        <AppText variant="caption" color="muted">
          Quran & Arabic Academy
        </AppText>
      ) : (
        <AppText variant="h3" style={{ fontSize: 18 }}>
          Ana Quran
        </AppText>
      )}
    </View>
  );
};
