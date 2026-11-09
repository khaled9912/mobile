import type { ExpoConfig } from "expo/config";

/**
 * The API and Jitsi hosts live here so production builds never depend on a
 * developer's local .env. Override with EXPO_PUBLIC_* when targeting staging.
 */
const productionApiUrl = "https://anaquran.runasp.net";
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || productionApiUrl;
// Must be the self-hosted Jitsi the web app uses. meet.jit.si requires an
// account before it will create a room, so anonymous lesson joins fail there.
const jitsiDomain =
  process.env.EXPO_PUBLIC_JITSI_DOMAIN?.trim() ||
  "meet.143-47-237-128.sslip.io";

/**
 * Which academy the build talks to. Set EXPO_PUBLIC_APP_ENV=development when
 * pointing a build at a local API; any other API origin (a LAN address, a
 * tunnel) is treated as development too, so a build that forgot the variable
 * cannot silently dress up as production.
 */
const appEnv =
  process.env.EXPO_PUBLIC_APP_ENV?.trim() ||
  (apiUrl.replace(/\/+$/, "") === productionApiUrl
    ? "production"
    : "development");
const isDev = appEnv !== "production";

/**
 * Expo push only reaches a build that knows which EAS project owns its APNs
 * key and FCM credential. `eas init` writes `extra.eas.projectId` into this
 * file; the variable lets CI supply it instead. Until one exists the app
 * stays on local reminders and in-app notifications, which is why the
 * registration code returns early rather than failing.
 */
const easProjectId = process.env.EAS_PROJECT_ID?.trim() || "";
// Firebase hands out google-services.json per app and it cannot be committed.
// Point a build at your copy to turn on Android push:
//   EXPO_GOOGLE_SERVICES_FILE=./google-services.json npx expo prebuild --clean
const googleServicesFile = process.env.EXPO_GOOGLE_SERVICES_FILE?.trim();

const config: ExpoConfig = {
  name: "Ana Quran",
  slug: "ana-quran",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "anaquran",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.anaquran.academy",
    // Without this capability Apple downgrades the call payload's
    // `interruptionLevel: time-sensitive` to a plain alert, so a lesson ring
    // sitting in Focus or a notification summary never surfaces. The App ID in
    // Apple Developer must have "Time Sensitive Notifications" ticked before
    // this builds, or provisioning rejects the entitlement.
    // Critical Alerts is deliberately absent: Apple grants it case by case, and
    // until then an iPhone on the silent switch gets the banner without sound.
    entitlements: {
      "com.apple.developer.usernotifications.time-sensitive": true,
    },
    infoPlist: {
      NSCameraUsageDescription:
        "Ana Quran uses your camera so you can join live lessons with your teacher.",
      NSMicrophoneUsageDescription:
        "Ana Quran uses your microphone so you can speak with your teacher during live lessons.",
      NSPhotoLibraryUsageDescription:
        "Ana Quran lets you choose a photo for your profile picture.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.anaquran.academy",
    // Expo Router's default stack does not consume Android's predictive back
    // gesture, so the system finishes the activity instead of popping history.
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: "#fbfaf6",
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    googleServicesFile: googleServicesFile || undefined,
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "READ_MEDIA_IMAGES",
      "MODIFY_AUDIO_SETTINGS",
      "POST_NOTIFICATIONS",
      "VIBRATE",
      "SCHEDULE_EXACT_ALARM",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    "expo-asset",
    "expo-image",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 220,
        resizeMode: "contain",
        // Launch stays light even on a dark device: a dark splash followed by
        // the light intro read as a flash.
        backgroundColor: "#fbfaf6",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "Ana Quran uses your camera so you can join live lessons with your teacher.",
        microphonePermission:
          "Ana Quran uses your microphone so you can speak with your teacher during live lessons.",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission:
          "Ana Quran uses your microphone so you can speak with your teacher during live lessons.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Ana Quran lets you choose a photo for your profile picture.",
        cameraPermission:
          "Ana Quran uses your camera so you can take a profile picture.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/android-icon-monochrome.png",
        color: "#1a3a52",
        // Must match DEFAULT_NOTIFICATION_CHANNEL_ID in
        // src/lib/notification-channels.ts and the API's PushOptions.
        defaultChannel: "academy-notifications",
        // prebuild copies this into the iOS bundle and Android res/raw, so a
        // push can ring something other than the system default.
        sounds: ["./assets/sounds/lesson_call.wav"],
      },
    ],
    "./plugins/withLessonScreenShare",
    ["./plugins/withDevCleartext", { enabled: isDev }],
  ],
  extra: {
    apiUrl,
    jitsiDomain,
    appEnv,
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
};

export default config;
