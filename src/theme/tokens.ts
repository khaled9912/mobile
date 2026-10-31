export type ThemeScheme = "light" | "dark";

export type ThemeColors = {
  background: string;
  card: string;
  surfaceMuted: string;
  border: string;
  text: string;
  muted: string;
  brand: string;
  brandPressed: string;
  onBrand: string;
  link: string;
  brandSoft: string;
  gold: string;
  goldSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  info: string;
  infoSoft: string;
  input: string;
  overlay: string;
  tabBar: string;
  shadow: string;
};

const light: ThemeColors = {
  background: "#fbfaf6",
  card: "#ffffff",
  surfaceMuted: "#f2f5ee",
  border: "#e5e9df",
  text: "#173b35",
  muted: "#6b7c73",
  brand: "#217a34",
  brandPressed: "#19622a",
  onBrand: "#ffffff",
  link: "#217a34",
  brandSoft: "#e8f2e9",
  gold: "#a7773e",
  goldSoft: "#f7efe2",
  danger: "#9a554c",
  dangerSoft: "#fbefec",
  warning: "#9a6b1f",
  warningSoft: "#fbf3e4",
  success: "#1f6b2c",
  successSoft: "#e9f4ea",
  info: "#2d6b86",
  infoSoft: "#e8f1f5",
  input: "#ffffff",
  overlay: "rgba(23, 59, 53, 0.45)",
  tabBar: "#ffffff",
  shadow: "#173b35",
};

const dark: ThemeColors = {
  background: "#142c3f",
  card: "#1c3a52",
  surfaceMuted: "#1a3449",
  border: "#33536e",
  text: "#f2f6f4",
  muted: "#b7c9d3",
  brand: "#2f8442",
  brandPressed: "#256f37",
  onBrand: "#ffffff",
  link: "#8fd39a",
  brandSoft: "rgba(143, 211, 154, 0.14)",
  gold: "#d9b37c",
  goldSoft: "rgba(217, 179, 124, 0.14)",
  danger: "#f0a79e",
  dangerSoft: "rgba(240, 167, 158, 0.12)",
  warning: "#e8c07a",
  warningSoft: "rgba(232, 192, 122, 0.12)",
  success: "#8fd39a",
  successSoft: "rgba(143, 211, 154, 0.12)",
  info: "#9cc9de",
  infoSoft: "rgba(156, 201, 222, 0.12)",
  input: "#172f44",
  overlay: "rgba(0, 0, 0, 0.55)",
  tabBar: "#10283a",
  shadow: "#000000",
};

export const palettes: Record<ThemeScheme, ThemeColors> = { light, dark };

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  eyebrow: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  h1: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.4 },
  h2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  small: { fontSize: 13, fontWeight: "400" as const },
  label: { fontSize: 14, fontWeight: "600" as const },
  button: { fontSize: 15, fontWeight: "700" as const },
} as const;
