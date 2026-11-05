import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { PillPressable } from "@/components/ui/pill-pressable";
import { TextField } from "@/components/ui/text-field";
import { openWhatsApp } from "@/lib/whatsapp";
import { useTheme } from "@/providers/theme-provider";

const defaultMessage = (url: string) => `Join my Ana Quran lesson room: ${url}`;

// The message is free text, so a user who edits it may drop the link. Send the
// room URL anyway rather than an invite with nowhere to go.
const withLink = (message: string, url: string) => {
  const trimmed = message.trim();
  if (!trimmed) return url;
  return trimmed.includes(url) ? trimmed : `${trimmed}\n${url}`;
};

type Props = {
  visible: boolean;
  shareUrl: string;
  onClose: () => void;
};

export const ShareLessonDrawer = ({ visible, shareUrl, onClose }: Props) => {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState(() => defaultMessage(shareUrl));
  const [copied, setCopied] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The Jitsi host serves the same image its link previews use.
  const origin = shareUrl.match(/^https?:\/\/[^/]+/i)?.[0] ?? "";
  const previewImage = origin ? `${origin}/branding/ana-quran.png` : "";

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const copyLink = () => {
    Clipboard.setString(shareUrl);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  const shareOnWhatsApp = () => {
    openWhatsApp(withLink(message, shareUrl));
    onClose();
  };

  const shareEverywhere = () => {
    const text = withLink(message, shareUrl);
    void Share.share({ title: "Ana Quran lesson room", message: text })
      .then((result) => {
        if (result.action === Share.sharedAction) onClose();
      })
      .catch(() => {});
  };

  // Mounting only while open means the draft starts fresh every time and is
  // discarded if the drawer is dismissed without sharing.
  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close share options"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.xl,
              paddingBottom: insets.bottom + 18,
            },
          ]}
        >
          <View style={styles.header}>
            <View
              style={[styles.penBadge, { backgroundColor: colors.brand }]}
            >
              <Ionicons name="create-outline" size={18} color={colors.onBrand} />
            </View>
            <View style={styles.headerCopy}>
              <AppText variant="h3">Share lesson room</AppText>
              <AppText variant="caption" color="muted">
                Edit the message, then send it.
              </AppText>
            </View>
            <PillPressable
              accessibilityLabel="Close share options"
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="close" size={16} color={colors.text} />
            </PillPressable>
          </View>

          <TextField
            label="Message"
            value={message}
            onChangeText={setMessage}
            multiline
            autoCapitalize="sentences"
            accessibilityHint="Edit the invitation before sharing it"
          />

          <View
            style={[
              styles.linkRow,
              {
                backgroundColor: colors.input,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            <Ionicons name="link-outline" size={16} color={colors.muted} />
            <AppText
              variant="caption"
              color="muted"
              numberOfLines={1}
              selectable
              style={styles.linkText}
            >
              {shareUrl}
            </AppText>
            <PillPressable
              accessibilityLabel={copied ? "Link copied" : "Copy lesson link"}
              onPress={copyLink}
              style={[
                styles.copyButton,
                {
                  backgroundColor: copied
                    ? colors.successSoft
                    : colors.brandSoft,
                  borderColor: copied ? colors.success : colors.brand,
                },
              ]}
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={13}
                color={copied ? colors.success : colors.brand}
              />
              <AppText
                variant="caption"
                weight="700"
                color={copied ? "success" : "brand"}
              >
                {copied ? "Copied" : "Copy"}
              </AppText>
            </PillPressable>
          </View>

          <View
            style={[
              styles.preview,
              {
                backgroundColor: colors.input,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            {previewImage && !previewFailed ? (
              <Image
                source={{ uri: previewImage }}
                style={styles.previewImage}
                contentFit="cover"
                transition={150}
                onError={() => setPreviewFailed(true)}
                accessibilityLabel="Lesson room link preview"
              />
            ) : (
              <View
                style={[
                  styles.previewImage,
                  styles.previewFallback,
                  { backgroundColor: colors.brandSoft },
                ]}
              >
                <Ionicons name="videocam" size={22} color={colors.brand} />
              </View>
            )}
            <View style={styles.previewCopy}>
              <AppText variant="caption" weight="700">
                Ana Quran lesson room
              </AppText>
              <AppText variant="caption" color="muted" numberOfLines={1}>
                Join a live Quran lesson with your teacher on Ana Quran.
              </AppText>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Share on WhatsApp"
              icon="logo-whatsapp"
              fullWidth
              onPress={shareOnWhatsApp}
            />
            <Button
              title="More options"
              icon="share-outline"
              variant="secondary"
              fullWidth
              onPress={shareEverywhere}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  penBadge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 2 },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  linkText: { flex: 1 },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    padding: 8,
  },
  previewImage: { width: 64, height: 48, borderRadius: 10 },
  previewFallback: { alignItems: "center", justifyContent: "center" },
  previewCopy: { flex: 1, gap: 2 },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actions: { gap: 8 },
});
