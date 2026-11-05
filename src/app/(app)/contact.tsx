import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { sendContactMessage } from "@/api/contact";
import { isValidEmail } from "@/lib/validation";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";

type FieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

const MAX_MESSAGE = 3000;

export default function ContactScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: sendContactMessage,
    onSuccess: () => {
      Keyboard.dismiss();
      setMessage("");
      setErrors({});
      setFormError(null);
      showToast("Thank you! Your message has been sent successfully.");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.validationErrors) {
        const mapped: FieldErrors = {};
        for (const [field, messages] of Object.entries(
          error.validationErrors
        )) {
          const key = field.toLowerCase();
          if (
            (key === "name" || key === "email" || key === "message") &&
            messages[0]
          ) {
            mapped[key] = messages[0];
          }
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          setFormError(null);
          return;
        }
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "We could not send your message. Please try again."
      );
    },
  });

  const submit = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const nextErrors: FieldErrors = {};

    if (!trimmedName) {
      nextErrors.name = "Name is required.";
    } else if (trimmedName.length > 120) {
      nextErrors.name = "Name must be 120 characters or fewer.";
    }
    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!trimmedMessage) {
      nextErrors.message = "Message is required.";
    } else if (trimmedMessage.length < 5) {
      nextErrors.message = "Message must be at least 5 characters.";
    }

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    send.mutate({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
    });
  };

  return (
    <Screen edges={["left", "right"]} keyboard>
      <PageHeader
        eyebrow="Ana Quran"
        title="Contact the academy"
        subtitle="Send a message and the academy team will reply by email."
      />

      <Card>
        <View style={styles.form}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            error={errors.name}
            maxLength={120}
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
            maxLength={254}
          />
          <TextField
            label="Message"
            value={message}
            onChangeText={setMessage}
            multiline
            error={errors.message}
            hint={`${message.length} / ${MAX_MESSAGE} characters`}
            maxLength={MAX_MESSAGE}
          />

          {formError ? <Notice tone="error" message={formError} /> : null}

          <Button
            title={send.isPending ? "Sending…" : "Send message"}
            onPress={submit}
            loading={send.isPending}
            icon="send-outline"
          />

          <AppText variant="caption" color="muted" style={styles.footnote}>
            Your message is also recorded for the academy administrators so
            nothing is missed.
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  footnote: { lineHeight: 18 },
});
