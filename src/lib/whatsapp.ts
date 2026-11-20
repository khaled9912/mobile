import { Alert, Linking } from "react-native";

// The academy's WhatsApp username.
// EXPO_PUBLIC_ACADEMY_WHATSAPP_USERNAME lets staging point elsewhere without
// editing code.
const ACADEMY_WHATSAPP_USERNAME = (
  process.env.EXPO_PUBLIC_ACADEMY_WHATSAPP_USERNAME?.trim() || "ana.quran"
).replace(/^@/, "");
const DEFAULT_MESSAGE =
  "Assalamu alaikum, I'd like to know more about Ana Quran lessons.";

const openFirstAvailable = async (urls: string[]) => {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // Try the next scheme; Android and iOS disagree about which one exists.
    }
  }
  return false;
};

/**
 * With no text this opens a chat with the academy account. With text it opens
 * the WhatsApp share sheet so the user picks who receives it.
 */
export const openWhatsApp = (text?: string) => {
  // Pressables call onPress with an event, so only a real string may switch
  // this into share mode; anything else means "chat with the academy".
  const message = typeof text === "string" && text.trim() ? text.trim() : null;

  if (message) {
    // The share sheet is the only thing the private scheme can do without a
    // phone number, so it stays first and wa.me backs it up.
    void openFirstAvailable([
      `whatsapp://send?text=${encodeURIComponent(message)}`,
      `https://wa.me/?text=${encodeURIComponent(message)}`,
    ]).then((opened) => {
      if (!opened) {
        Alert.alert(
          "WhatsApp not available",
          "Install WhatsApp to share the lesson link."
        );
      }
    });
    return;
  }

  void Linking.openURL(
    `https://wa.me/@${ACADEMY_WHATSAPP_USERNAME}?text=${encodeURIComponent(
      DEFAULT_MESSAGE
    )}`
  ).catch(() => {
    Alert.alert(
      "WhatsApp not available",
      "Install WhatsApp to chat with the academy."
    );
  });
};
