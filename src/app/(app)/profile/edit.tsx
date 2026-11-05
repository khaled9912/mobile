import { useState } from "react";
import { StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  deleteAvatar,
  updateProfile,
  uploadAvatar,
  type AvatarUpload,
  type UpdateProfileInput,
} from "@/api/profile";
import type { UserProfile } from "@/api/types";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/validation";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type FieldErrors = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
};

const extensionOf = (asset: ImagePicker.ImagePickerAsset) => {
  const source = asset.fileName ?? asset.uri.split("?")[0];
  const match = /\.([a-z0-9]+)$/i.exec(source);
  return match?.[1]?.toLowerCase();
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** Keeps the uploaded file within the API's PNG/JPEG/WebP 2 MB contract. */
async function prepareAvatar(
  asset: ImagePicker.ImagePickerAsset
): Promise<AvatarUpload> {
  const extension = extensionOf(asset);
  const type =
    asset.mimeType && ALLOWED_TYPES.has(asset.mimeType)
      ? asset.mimeType
      : extension
        ? MIME_BY_EXTENSION[extension]
        : undefined;
  const oversized =
    typeof asset.fileSize === "number" && asset.fileSize > MAX_AVATAR_BYTES;

  if (type && !oversized) {
    return {
      uri: asset.uri,
      name:
        asset.fileName?.trim() ||
        `avatar.${extension ?? (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg")}`,
      type,
    };
  }

  // Unsupported formats (for example HEIC) and large photos are converted.
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > 1024) context.resize({ width: 1024 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: 0.72,
    format: SaveFormat.JPEG,
  });

  return { uri: saved.uri, name: "avatar.jpg", type: "image/jpeg" };
}

function EditProfileForm({ profile }: { profile: UserProfile }) {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phoneNumber ?? "");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: (next) => {
      updateUser({ ...next, avatarUrl: avatarPreview || null });
      setFormError(null);
      showToast("Your profile has been updated.");
    },
    onError: (error) => {
      setFormError(
        errorMessage(error, "Unable to save your profile. Please try again.")
      );
    },
  });

  const upload = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (avatarUrl) => {
      const preview = `${avatarUrl}?v=${Date.now()}`;
      setAvatarPreview(preview);
      updateUser({ ...profile, avatarUrl: preview });
      setAvatarError(null);
      showToast("Your profile photo has been updated.");
    },
    onError: (error) => {
      setAvatarError(
        errorMessage(error, "Unable to upload the image. Please try again.")
      );
    },
  });

  const remove = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      setAvatarPreview("");
      updateUser({ ...profile, avatarUrl: null });
      setAvatarError(null);
      showToast("Your profile photo has been removed.");
    },
    onError: (error) => {
      setAvatarError(
        errorMessage(error, "Unable to remove the image. Please try again.")
      );
    },
  });

  const busy = save.isPending || upload.isPending || remove.isPending;

  const choosePhoto = async () => {
    setAvatarError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAvatarError(
          "Allow photo library access to choose a profile picture."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]) return;
      upload.mutate(await prepareAvatar(result.assets[0]));
    } catch {
      setAvatarError("Unable to open your photos. Please try again.");
    }
  };

  const submit = () => {
    const nextErrors: FieldErrors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      nextErrors.fullName = "Enter your full name (at least 2 characters).";
    }
    if (profile.email && !trimmedEmail) {
      nextErrors.email = "Enter the email address for your account.";
    } else if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }
    if (profile.phoneNumber && !trimmedPhone) {
      nextErrors.phoneNumber = "Enter the mobile number for your account.";
    } else if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      nextErrors.phoneNumber =
        "Include the country code, for example +974 5555 1234.";
    }

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input: UpdateProfileInput = { fullName: trimmedName };
    if (trimmedEmail) input.email = trimmedEmail;
    if (trimmedPhone) input.phoneNumber = normalizePhone(trimmedPhone);
    save.mutate(input);
  };

  return (
    <Screen edges={["left", "right"]} keyboard>
      <PageHeader
        eyebrow="Your account"
        title="Edit profile"
        subtitle="This is how your name, contact details, and photo appear across the academy."
      />

      <Card>
        <View style={styles.avatarBlock}>
          <Avatar
            name={fullName}
            avatarUrl={avatarPreview || null}
            size={96}
          />
          <AppText variant="caption" color="muted" align="center">
            PNG, JPEG, or WebP. Up to 2 MB.
          </AppText>
          <View style={styles.avatarActions}>
            <Button
              title={upload.isPending ? "Uploading…" : "Choose photo"}
              variant="secondary"
              size="sm"
              icon="image-outline"
              onPress={() => void choosePhoto()}
              loading={upload.isPending}
              disabled={busy}
            />
            {avatarPreview ? (
              <Button
                title={remove.isPending ? "Removing…" : "Remove photo"}
                variant="danger"
                size="sm"
                icon="trash-outline"
                onPress={() => remove.mutate()}
                loading={remove.isPending}
                disabled={busy}
              />
            ) : null}
          </View>
          {avatarError ? <Notice tone="error" message={avatarError} /> : null}
        </View>
      </Card>

      <Card style={styles.detailsCard}>
        <AppText variant="h3">Account details</AppText>
        <View style={styles.form}>
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            error={errors.fullName}
            maxLength={160}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
            hint="Also used for email sign-in."
            maxLength={254}
          />
          <TextField
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={errors.phoneNumber}
            hint="Include the country code, for example +974 5555 1234. Used for one-time sign-in codes."
            maxLength={20}
          />

          {formError ? <Notice tone="error" message={formError} /> : null}

          <Button
            title={save.isPending ? "Saving…" : "Save changes"}
            onPress={submit}
            loading={save.isPending}
            disabled={busy}
          />
        </View>
      </Card>
    </Screen>
  );
}

export default function EditProfileScreen() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Screen edges={["left", "right"]}>
        <PageHeader eyebrow="Your account" title="Edit profile" />
        <AppText variant="small" color="muted">
          Your profile is loading.
        </AppText>
      </Screen>
    );
  }

  return <EditProfileForm profile={user} />;
}

const styles = StyleSheet.create({
  avatarBlock: { alignItems: "center", gap: 12 },
  avatarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  detailsCard: { marginTop: 16 },
  form: { marginTop: 16, gap: 16 },
});
