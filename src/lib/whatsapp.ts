import { Alert, Linking } from "react-native";

// The academy's WhatsApp account. Keep digits only; wa.me rejects "+" and
// spaces. EXPO_PUBLIC_ACADEMY_WHATSAPP lets staging point elsewhere without
// editing code.
const ACADEMY_WHATSAPP = (
  process.env.EXPO_PUBLIC_ACADEMY_WHATSAPP?.trim() || "201501223115"
).replace(/\D/g, "");
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
  const urls = message
    ? [
        `whatsapp://send?text=${encodeURIComponent(message)}`,
        `https://wa.me/?text=${encodeURIComponent(message)}`,
      ]
    : [
        `whatsapp://send?phone=${ACADEMY_WHATSAPP}&text=${encodeURIComponent(
          DEFAULT_MESSAGE
        )}`,
        `https://wa.me/${ACADEMY_WHATSAPP}?text=${encodeURIComponent(
          DEFAULT_MESSAGE
        )}`,
      ];

  void openFirstAvailable(urls).then((opened) => {
    if (opened) return;
    Alert.alert(
      "WhatsApp not available",
      message
        ? "Install WhatsApp to share the lesson link."
        : "Install WhatsApp to chat with the academy."
    );
  });
};
