import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import { login, requestOtp, verifyOtp } from "@/api/auth";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import {
  isNumericCode,
  isValidEmail,
  isValidPhone,
  normalizePhone,
} from "@/lib/validation";
import {
  getDeviceCountry,
  isRegistrationAllowed,
} from "@/lib/registration";

type Mode = "email" | "phone";

export default function LoginScreen() {
  const { applySession, restoreError } = useAuth();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const registrationBlocked = !isRegistrationAllowed(getDeviceCountry());

  const [mode, setMode] = useState<Mode>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  useEffect(() => {
    if (!restoreError) return;
    showToast(`We could not check your session. ${restoreError}`, "warning");
  }, [restoreError, showToast]);

  const switchMode = (next: Mode) => setMode(next);

  const fail = (message: string) => showToast(message, "error");

  const errorText = (error: unknown, fallback: string) =>
    error instanceof ApiError ? error.message : fallback;

  const handleEmailSignIn = async () => {
    if (loading) return;
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      fail("Enter your email address.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      fail("Enter a valid email address.");
      return;
    }
    if (!trimmedPassword) {
      fail("Enter your password.");
      return;
    }

    setLoading(true);
    try {
      const user = await login(trimmedEmail, trimmedPassword);
      if (!user.isActive) {
        fail("This account is deactivated. Contact the academy.");
        return;
      }
      applySession(user);
      router.replace("/");
    } catch (error) {
      fail(errorText(error, "Unable to sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (phoneLoading) return;
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      fail(
        "Enter your full number with country code, for example +962 7 9000 0000."
      );
      return;
    }
    setPhoneLoading(true);
    try {
      const result = await requestOtp(normalized);
      setSentTo(normalized);
      setCodeSent(true);
      setNeedsName(false);
      setDevCode(result.devCode ?? null);
    } catch (error) {
      fail(errorText(error, "Unable to send the code. Please try again."));
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (phoneLoading) return;
    if (!isNumericCode(code.trim())) {
      fail("Enter the numeric code you received.");
      return;
    }
    if (needsName && fullName.trim().length < 2) {
      fail("Enter your full name to finish creating your account.");
      return;
    }
    if (needsName && fullName.includes("@")) {
      fail("Enter your name, not an email address.");
      return;
    }
    if (!sentTo) {
      fail("Request a new code to continue.");
      return;
    }
    setPhoneLoading(true);
    try {
      const result = await verifyOtp(
        sentTo,
        code.trim(),
        needsName ? fullName.trim() : undefined,
        getDeviceCountry() ?? undefined
      );
      if (result.requiresProfile) {
        setNeedsName(true);
        return;
      }
      if (!result.user) {
        fail("We could not sign you in. Please try again.");
        return;
      }
      if (!result.user.isActive) {
        fail("This account is deactivated. Contact the academy.");
        return;
      }
      applySession(result.user);
      router.replace("/");
    } catch (error) {
      fail(errorText(error, "Unable to verify the code. Please try again."));
    } finally {
      setPhoneLoading(false);
    }
  };

  const resetPhoneFlow = () => {
    setCodeSent(false);
    setNeedsName(false);
    setCode("");
    setFullName("");
    setDevCode(null);
    setSentTo("");
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with email or your mobile number to reach your lessons."
    >
      <Segmented
        label="Sign-in method"
        value={mode}
        onChange={switchMode}
        options={[
          { value: "email", label: "Email" },
          { value: "phone", label: "Mobile number" },
        ]}
      />

      {mode === "email" ? (
        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            placeholder="you@example.com"
          />
          <View style={styles.passwordSlot}>
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secure
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={() => void handleEmailSignIn()}
            />
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Forgot your password"
              onPress={() => router.push("/forgot-password")}
              hitSlop={8}
              style={styles.forgot}
            >
              <AppText variant="caption" weight="700" color="link">
                Forgot password?
              </AppText>
            </Pressable>
          </View>
          <Button
            title={loading ? "Signing in…" : "Sign in"}
            onPress={() => void handleEmailSignIn()}
            loading={loading}
            fullWidth
          />
          <AppText variant="caption" color="muted" align="center">
            Staff and admin accounts sign in with email and password.
          </AppText>
        </View>
      ) : !codeSent ? (
        <View style={styles.form}>
          <TextField
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+962 7 9000 0000"
            hint="Include the country code. We will send a one-time code by WhatsApp or SMS."
          />
          <Button
            title={phoneLoading ? "Sending code…" : "Send code"}
            onPress={() => void handleSendCode()}
            loading={phoneLoading}
            fullWidth
          />
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.sentRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.link} />
            <AppText variant="caption" color="muted" style={styles.sentText}>
              Sent to {sentTo}.
            </AppText>
          </View>
          <TextField
            label="Verification code"
            value={code}
            onChangeText={(next) => setCode(next.replace(/\D/g, ""))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={8}
            placeholder="1234"
            returnKeyType="done"
            onSubmitEditing={() => void handleVerifyCode()}
          />
          {devCode ? (
            <Notice
              tone="info"
              title="Development code"
              message={`Use ${devCode} to sign in. This code is only returned by the development API.`}
            />
          ) : null}
          {needsName ? (
            <TextField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              textContentType="name"
              hint="No account uses this number yet, so a student account will be created."
              returnKeyType="done"
              onSubmitEditing={() => void handleVerifyCode()}
            />
          ) : null}
          <Button
            title={
              phoneLoading
                ? "Verifying…"
                : needsName
                  ? "Create account & sign in"
                  : "Verify & sign in"
            }
            onPress={() => void handleVerifyCode()}
            loading={phoneLoading}
            fullWidth
          />
          <Button
            title="Use a different number"
            variant="ghost"
            size="sm"
            onPress={resetPhoneFlow}
          />
        </View>
      )}

      {registrationBlocked ? null : (
        <View style={styles.footer}>
          <AppText variant="small" color="muted">
            New here?
          </AppText>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Create an account"
            onPress={() => router.push("/signup")}
            hitSlop={8}
          >
            <AppText variant="small" weight="700" color="link">
              Create account
            </AppText>
          </Pressable>
        </View>
      )}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="About Ana Quran"
        onPress={() => router.replace("/welcome")}
        hitSlop={8}
        style={styles.about}
      >
        <AppText variant="caption" color="muted">
          About Ana Quran
        </AppText>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  passwordSlot: { gap: 8 },
  forgot: { alignSelf: "flex-end", marginTop: -2 },
  sentRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sentText: { flex: 1 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  about: { alignSelf: "center", marginTop: -4 },
});
