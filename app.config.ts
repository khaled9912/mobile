import type { ExpoConfig } from "expo/config";

/**
 * The API and Jitsi hosts live here so production builds never depend on a
 * developer's local .env. Override with EXPO_PUBLIC_* when targeting staging.
 */
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "https://anaquran.runasp.net";
const jitsiDomain =
  process.env.EXPO_PUBLIC_JITSI_DOMAIN?.trim() || "meet.jit.si";

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
    predictiveBackGestureEnabled: true,
    adaptiveIcon: {
      backgroundColor: "#fbfaf6",
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
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
        backgroundColor: "#fbfaf6",
        dark: {
          backgroundColor: "#1a3a52",
          image: "./assets/splash-icon-dark.png",
        },
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
        defaultChannel: "lesson-reminders",
      },
    ],
  ],
  extra: {
    apiUrl,
    jitsiDomain,
  },
};

export default config;
