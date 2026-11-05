import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "@/components/ui/app-text";

export type ToastTone = "success" | "error" | "info" | "warning";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
};

const meta: Record<
  ToastTone,
  {
    icon: keyof typeof Ionicons.glyphMap;
    colorKey: "info" | "success" | "danger" | "warning";
  }
> = {
  info: { icon: "information-circle-outline", colorKey: "info" },
  success: { icon: "checkmark-circle", colorKey: "success" },
  error: { icon: "alert-circle", colorKey: "danger" },
  warning: { icon: "warning", colorKey: "warning" },
};

const VISIBLE_MS = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const nextId = useRef(0);
  const activeId = useRef(0);

  const hideToast = useCallback(() => {
    const id = activeId.current;
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // A toast shown mid-fade-out owns the screen now; leave it alone.
      if (finished)
        setToast((current) => (current?.id === id ? null : current));
    });
  }, [progress]);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const trimmed = message.trim();
      if (!trimmed) return;
      nextId.current += 1;
      activeId.current = nextId.current;
      setToast({ id: nextId.current, message: trimmed, tone });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    progress.stopAnimation();
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(hideToast, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, progress, hideToast]);

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, hideToast }),
    [showToast, hideToast]
  );

  const config = toast ? meta[toast.tone] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && config ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.host,
            {
              top: insets.top + 8,
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors[config.colorKey],
                borderRadius: radius.md,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Ionicons
              name={config.icon}
              size={20}
              color={colors[config.colorKey]}
            />
            <AppText variant="small" style={styles.text}>
              {toast.message}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider.");
  return value;
};

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 5000,
    elevation: 50,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  text: { flex: 1, paddingTop: 1 },
});
