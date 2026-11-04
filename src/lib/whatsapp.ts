import { Alert, Linking } from "react-native";

const ACADEMY_WHATSAPP = "201501223115";
const DEFAULT_MESSAGE =
  "Assalamu alaikum, I'd like to know more about Ana Quran lessons.";

/**
 * With no text this opens the academy's WhatsApp chat. With text it opens the
 * WhatsApp share sheet so the user picks who receives it.
 */
export const openWhatsApp = (text?: string) => {
  const url = text
    ? `whatsapp://send?text=${encodeURIComponent(text)}`
    : `https://wa.me/${ACADEMY_WHATSAPP}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  void Linking.openURL(url).catch(() => {
    Alert.alert(
      "WhatsApp not available",
      text
        ? "Install WhatsApp to share the lesson link."
        : "Install WhatsApp to chat with the academy."
    );
  });
};
