import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import * as SystemUI from "expo-system-ui";
import {
  palettes,
  radius,
  spacing,
  typography,
  type ThemeColors,
  type ThemeScheme,
} from "@/theme/tokens";
import {
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/storage";

type ThemeContextValue = {
  scheme: ThemeScheme;
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");

  useEffect(() => {
    let active = true;
    void readThemePreference().then((stored) => {
      if (active) setPreferenceState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const scheme: ThemeScheme =
    preference === "system" ? (systemScheme ?? "light") : preference;
  const colors = palettes[scheme];

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writeThemePreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      colors,
      preference,
      setPreference,
      radius,
      spacing,
      typography,
    }),
    [scheme, colors, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside AppThemeProvider.");
  return value;
};
