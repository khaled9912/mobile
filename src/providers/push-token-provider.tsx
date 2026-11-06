import { useEffect, useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/providers/auth-provider";
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "@/api/lesson-operations";
import { ensureNotificationChannel } from "@/lib/notification-channels";

const PUSH_TOKEN_KEY = "anaquran.push-token.v1";

const readStoredToken = async () => {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const storeToken = async (token: string | null) => {
  try {
    if (token) await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    // The in-memory session still registers; only restart persistence is lost.
  }
};

const projectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

/**
 * Registers this install for server-sent push notifications. Best-effort: a
 * denied permission, a simulator, or a build without an EAS project id simply
 * leaves local lesson reminders in charge.
 */
export const PushTokenProvider = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  const unregistering = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      if (status !== "unauthenticated" || unregistering.current) return;
      unregistering.current = true;
      void (async () => {
        const token = await readStoredToken();
        if (token) {
          await unregisterDeviceToken({
            token,
            platform: Platform.OS,
          }).catch(() => {});
        }
        await storeToken(null);
        unregistering.current = false;
      })();
      return;
    }

    unregistering.current = false;
    let cancelled = false;

    void (async () => {
      try {
        // Android 13 only shows the permission prompt once a channel exists,
        // and the token is useless if the channel the server names is missing.
        await ensureNotificationChannel();

        let permission = await Notifications.getPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          });
        }
        if (!permission.granted || cancelled) return;

        const id = projectId();
        if (!id) return;

        const token = (await Notifications.getExpoPushTokenAsync({ projectId: id }))
          .data;
        if (!token || cancelled) return;

        await registerDeviceToken({ token, platform: Platform.OS });
        await storeToken(token);
      } catch {
        // Push is optional; reminders and in-app notifications still work.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return <>{children}</>;
};
