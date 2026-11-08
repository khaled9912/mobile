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
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "@/components/ui/app-text";
import type { ThemeScheme } from "@/theme/tokens";

export type ToastTone = "success" | "error" | "info" | "warning";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
  leaving: boolean;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const VISIBLE_MS = 5000;

const ICONS: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  warning: "warning",
  info: "information-circle-outline",
};

// Keep in sync with FE/src/providers/toast-provider.tsx (same shape, same palette).
const PALETTE: Record<
  ThemeScheme,
  Record<ToastTone, { bg: string; fg: string; border: string }>
> = {
  light: {
    success: { bg: "#e9f4ea", fg: "#1f6b2c", border: "#1f6b2c59" },
    error: { bg: "#fbefec", fg: "#9a554c", border: "#9a554c66" },
    warning: { bg: "#fbf3e4", fg: "#9a6b1f", border: "#9a6b1f66" },
    info: { bg: "#e8f1f5", fg: "#2d6b86", border: "#2d6b8659" },
  },
  dark: {
    success: { bg: "#12241f", fg: "#8fd39a", border: "#8fd39a66" },
    error: { bg: "#2a1513", fg: "#f0a79e", border: "#f0a79e66" },
    warning: { bg: "#2a2113", fg: "#e8c07a", border: "#e8c07a66" },
    info: { bg: "#1c3a52", fg: "#9cc9de", border: "#9cc9de59" },
  },
};

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastCardProps = {
  toast: ToastState;
  scheme: ThemeScheme;
  onDismiss: (id: number) => void;
  onRemoved: (id: number) => void;
};

const ToastCard = ({ toast, scheme, onDismiss, onRemoved }: ToastCardProps) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (!toast.leaving) return;
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onRemoved(toast.id);
    });
  }, [toast.leaving, toast.id, progress, onRemoved]);

  const palette = PALETTE[scheme][toast.tone];

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
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
      <Ionicons name={ICONS[toast.tone]} size={20} color={palette.fg} />
      <AppText style={[styles.text, { color: palette.fg }]}>
        {toast.message}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={8}
        onPress={() => onDismiss(toast.id)}
        style={styles.close}
      >
        <Ionicons name="close" size={16} color={palette.fg} />
      </Pressable>
    </Animated.View>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, leaving: true } : toast
      )
    );
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const trimmed = message.trim();
      if (!trimmed) return;
      nextId.current += 1;
      const id = nextId.current;
      // Repeated failures during one action should not stack up.
      setToasts((current) => [
        ...current.filter((toast) => toast.message !== trimmed),
        { id, message: trimmed, tone, leaving: false },
      ]);
      setTimeout(() => dismissToast(id), VISIBLE_MS);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        accessibilityLiveRegion="polite"
        style={[styles.host, { top: insets.top + 16 }]}
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            scheme={scheme}
            onDismiss={dismissToast}
            onRemoved={removeToast}
          />
        ))}
      </View>
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
    gap: 8,
    zIndex: 5000,
    elevation: 50,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  close: {
    opacity: 0.6,
    padding: 2,
  },
});
