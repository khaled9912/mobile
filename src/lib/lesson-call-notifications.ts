import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";

/**
 * Android reads volume, vibration and lockscreen behaviour from the channel,
 * never from the payload, so the loud ring only exists once this channel has
 * been created on the device.
 *
 * The id is versioned on purpose: Android refuses to change a channel that
 * already exists, so any edit to the settings below needs a new id or phones
 * that ran the app once keep the old behaviour forever.
 */
export const LESSON_CALL_CHANNEL_ID = "lesson-calls-2";

/** res/raw/lesson_call.wav, copied there by the expo-notifications plugin. */
export const LESSON_CALL_SOUND = "lesson_call.wav";

/** A ring stops on its own; nobody should be chased by a call for an hour. */
export const RING_TIMEOUT_MS = 45_000;

/** A call this old was not answered, so it belongs to the history, not a ring. */
export const RING_WINDOW_MS = 90_000;

/**
 * A foreground notification is only a call if it carries the ring file. The
 * typed union predates custom sounds, so the value is read as text.
 */
export const isLessonCall = (notification: Notifications.Notification) =>
  (notification.request.content.sound as unknown as string) === LESSON_CALL_SOUND;

let channelEnsured = false;

export const ensureLessonCallChannel = async () => {
  if (Platform.OS !== "android" || channelEnsured) return;
  try {
    await Notifications.setNotificationChannelAsync(LESSON_CALL_CHANNEL_ID, {
      name: "Lesson calls",
      description:
        "Rings when your teacher or student calls you into a lesson that is already running",
      importance: AndroidImportance.MAX,
      sound: LESSON_CALL_SOUND,
      vibrationPattern: [0, 500, 400, 500, 400],
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      // Only honoured when the user grants Do-Not-Disturb access; harmless
      // otherwise and the reason a call can still be heard during Focus.
      bypassDnd: true,
      // No custom audioAttributes: a communication-request usage routes the
      // sound to the ringer stream, which is silent whenever the phone is on
      // vibrate or silent. The default notification usage stays audible.
    });
    channelEnsured = true;
  } catch {
    // Android refuses changes to an existing channel; the ring still shows.
  }
};

/** The same file the notification asks for, so in-app matches the push. */
const RING_SOURCE = require("../../assets/sounds/lesson_call.wav");

/**
 * Plays the ring from inside the app, the way a phone dialer does. This path
 * survives the two things that silence an OS notification: a build whose
 * `res/raw` copy of the ring is missing (the name resolves to nothing) and a
 * ringer set to silent. Callers must stop the returned handle.
 */
export const startCallRinger = () => {
  let player: AudioPlayer | null = null;
  let cancelled = false;

  void (async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "duckOthers",
        allowsRecording: false,
        shouldPlayInBackground: false,
      });
      if (cancelled) return;
      const next = createAudioPlayer(RING_SOURCE);
      next.loop = true;
      next.volume = 1;
      next.play();
      player = next;
    } catch {
      // Expo Go has no audio module; the banner and haptics still ring.
    }
  })();

  return () => {
    cancelled = true;
    const current = player;
    player = null;
    if (!current) return;
    try {
      current.pause();
      current.remove();
    } catch {
      // Already released.
    }
    // The audio mode is deliberately left alone: pressing "Join the lesson"
    // stops the ring at the same moment Jitsi configures its own session, and
    // rewriting it here would race with the call.
  };
};

/**
 * Repeated notification-bump haptics. The OS sound may be silenced by a switch
 * or Focus mode, and this is the one alert that survives both without asking
 * Apple for a special entitlement.
 */
export const startCallHaptics = () => {
  if (Platform.OS === "web") return () => {};
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const buzz = () => {
    if (stopped) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {}
    );
    timer = setTimeout(buzz, 1_400);
  };
  buzz();
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };
};
