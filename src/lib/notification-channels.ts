import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications";
import { Platform } from "react-native";

/**
 * Server pushes name this channel, so it must exist before the first one
 * arrives: Android drops a notification whose channel is unknown. The id is
 * versioned on purpose — Android refuses to change an existing channel, so
 * editing the settings below needs a new id or installed phones keep the old
 * behaviour. Keep it in sync with `PushOptions` in the API.
 */
export const DEFAULT_NOTIFICATION_CHANNEL_ID = "academy-notifications";

let ensured = false;

/** Creates the channel Android uses for ordinary academy notifications. */
export const ensureNotificationChannel = async () => {
  if (Platform.OS !== "android" || ensured) return;
  try {
    await Notifications.setNotificationChannelAsync(
      DEFAULT_NOTIFICATION_CHANNEL_ID,
      {
        name: "Academy updates",
        description:
          "Bookings, lesson changes, reports, payments and academy notices",
        // HIGH is what makes a notification slide in over the screen with its
        // sound instead of waiting in the tray; only calls rank above it.
        importance: AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      }
    );
    ensured = true;
  } catch {
    // A channel that already exists cannot be edited; delivery still works.
  }
};
