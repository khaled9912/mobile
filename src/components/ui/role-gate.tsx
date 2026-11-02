import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import type { UserRole } from "@/api/types";
import { AppText } from "./app-text";

const roleName: Record<UserRole, string> = {
  student: "students",
  teacher: "teachers",
  admin: "academy administrators",
  super_admin: "academy administrators",
  support: "support reviewers",
};

export const RoleGate = ({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) => {
  const { role, status } = useAuth();
  const { colors, radius } = useTheme();
  const allowed = role !== null && roles.includes(role);

  useEffect(() => {
    if (status === "authenticated" && !allowed) router.replace("/");
  }, [status, allowed]);

  if (allowed) return <>{children}</>;

  const audience = roles.map((item) => roleName[item]).join(" and ");

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
      ]}
    >
      <Ionicons name="lock-closed-outline" size={26} color={colors.muted} />
      <AppText variant="h3" align="center">
        Not available
      </AppText>
      <AppText variant="small" color="muted" align="center">
        This area is only available to {audience}.
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    margin: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
