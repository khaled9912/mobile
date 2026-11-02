import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, isAdminRole } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import {
  isApiDebugEnabled,
  setApiDebugEnabled,
  useApiDebugEnabled,
} from "@/lib/api-debug";
import type { ThemePreference } from "@/lib/storage";
import type { UserRole } from "@/api/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

const roleLabel: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Administrator",
  super_admin: "Administrator",
  support: "Support reviewer",
};

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const LinkRow = ({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      android_ripple={{ color: colors.brandSoft }}
      style={({ pressed }) => [
        styles.linkRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={[styles.linkIcon, { backgroundColor: colors.brandSoft }]}>
        <Ionicons name={icon} size={19} color={colors.link} />
      </View>
      <View style={styles.linkCopy}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
};

export default function ProfileTab() {
  const { user, signOut } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const debugEnabled = useApiDebugEnabled();
  const versionTaps = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const handleVersionPress = () => {
    versionTaps.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      versionTaps.current = 0;
    }, 2000);

    if (versionTaps.current < 7) return;
    versionTaps.current = 0;
    if (tapTimer.current) clearTimeout(tapTimer.current);

    const next = !isApiDebugEnabled();
    void setApiDebugEnabled(next);
    Alert.alert(
      "API debugger",
      next
        ? "Enabled. A floating API button now shows every request and response."
        : "Disabled. The logged requests were cleared."
    );
  };

  if (!user) {
    return (
      <Screen>
        <PageHeader eyebrow="Your account" title="Profile" />
        <AppText variant="small" color="muted">
          Your profile is loading.
        </AppText>
      </Screen>
    );
  }

  const isTeacher = user.role === "teacher";
  const isStudent = user.role === "student";
  const isAdmin = isAdminRole(user.role);

  const confirmSignOut = () => {
    Alert.alert(
      "Sign out?",
      "You will need to sign in again to use the academy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            setSigningOut(true);
            void signOut().finally(() => setSigningOut(false));
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        subtitle="Your details, account settings, and the people you work with."
      />

      <Card>
        <View style={styles.identity}>
          <Avatar
            name={user.fullName}
            avatarUrl={user.avatarUrl}
            size={76}
          />
          <View style={styles.identityCopy}>
            <AppText variant="h2">{user.fullName || "Your profile"}</AppText>
            <Badge
              label={roleLabel[user.role]}
              tone={isAdmin ? "warning" : isTeacher ? "info" : "success"}
            />
          </View>
        </View>

        <View style={styles.contact}>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={17} color={colors.muted} />
            <AppText variant="small" color={user.email ? "text" : "muted"}>
              {user.email || "No email address on file"}
            </AppText>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={17} color={colors.muted} />
            <AppText
              variant="small"
              color={user.phoneNumber ? "text" : "muted"}
            >
              {user.phoneNumber || "No mobile number on file"}
            </AppText>
          </View>
        </View>

        <Button
          title="Edit profile"
          variant="secondary"
          icon="create-outline"
          onPress={() => router.push("/profile/edit")}
          style={styles.identityButton}
        />
      </Card>

      <SectionHeader title="Account" />
      <Card padded={false}>
        <LinkRow
          icon="person-outline"
          title="Edit profile"
          subtitle="Name, email, mobile number and photo"
          onPress={() => router.push("/profile/edit")}
        />
        <LinkRow
          icon="key-outline"
          title="Change password"
          subtitle="Update the password for email sign-in"
          onPress={() => router.push("/profile/password")}
        />
        <LinkRow
          icon="document-text-outline"
          title="Lesson reports"
          subtitle={
            isTeacher
              ? "Reports you have submitted"
              : isAdmin
                ? "Lesson reports across the academy"
                : "Feedback from your teachers"
          }
          onPress={() => router.push("/profile/reports")}
        />
        <LinkRow
          icon="chatbubble-ellipses-outline"
          title="Contact the academy"
          subtitle="Send a message to the administration"
          onPress={() => router.push("/contact")}
          last
        />
      </Card>

      <SectionHeader title="Shortcuts" />
      <Card padded={false}>
        {isTeacher ? (
          <>
            <LinkRow
              icon="calendar-outline"
              title="My availability"
              subtitle="Publish the weekly times students can book"
              onPress={() => router.push("/availability")}
            />
            <LinkRow
              icon="card-outline"
              title="Monthly earnings"
              subtitle="Completed lessons, EGP payout, and your transfer details"
              onPress={() => router.push("/earnings")}
              last
            />
          </>
        ) : isStudent ? (
          <>
            <LinkRow
              icon="library-outline"
              title="Find a teacher"
              subtitle="Browse teachers and request a lesson"
              onPress={() => router.navigate("/book")}
            />
            <LinkRow
              icon="calendar-outline"
              title="My schedule"
              subtitle="Upcoming and past lessons"
              onPress={() => router.navigate("/schedule")}
            />
            <LinkRow
              icon="card-outline"
              title="Monthly payment"
              subtitle="Lessons due, the dollar account, and payment status"
              onPress={() => router.push("/payments")}
              last
            />
          </>
        ) : (
          <>
            <LinkRow
              icon="people-outline"
              title="Manage people"
              subtitle="Students, teachers and assignments"
              onPress={() => router.navigate("/people")}
            />
            <LinkRow
              icon="mail-open-outline"
              title="Contact messages"
              subtitle="Messages sent through the contact form"
              onPress={() => router.push("/contact-submissions")}
              last
            />
          </>
        )}
      </Card>

      <SectionHeader title="Appearance" />
      <Card>
        <AppText variant="small" color="muted" style={styles.themeHint}>
          Choose how the app looks. System follows your device settings.
        </AppText>
        <Segmented
          label="App theme"
          value={preference}
          onChange={setPreference}
          options={themeOptions}
        />
      </Card>

      <Button
        title={signingOut ? "Signing out…" : "Sign out"}
        variant="danger"
        icon="log-out-outline"
        onPress={confirmSignOut}
        loading={signingOut}
        style={styles.signOut}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`App version ${version}`}
        onPress={handleVersionPress}
        style={styles.version}
      >
        <AppText variant="caption" color="muted" align="center">
          Ana Quran v{version}
        </AppText>
        {debugEnabled ? (
          <AppText variant="caption" color="brand" align="center">
            API debugger enabled
          </AppText>
        ) : null}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  identityCopy: { flex: 1, gap: 6 },
  contact: { marginTop: 18, gap: 8 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  identityButton: { marginTop: 18 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  linkCopy: { flex: 1, gap: 1 },
  themeHint: { marginBottom: 12 },
  signOut: { marginTop: 24 },
  version: { marginTop: 20, alignItems: "center", gap: 2, paddingVertical: 8 },
});
