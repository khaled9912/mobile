import { Redirect } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { LoadingView } from "@/components/ui/states";
import { useAuth, isAdminRole } from "@/providers/auth-provider";
import { StudentHome } from "@/features/dashboard/student-home";
import { TeacherHome } from "@/features/dashboard/teacher-home";
import { AdminHome } from "@/features/dashboard/admin-home";

export default function HomeTab() {
  const { role, status } = useAuth();

  if (status === "restoring") {
    return (
      <Screen scroll={false}>
        <LoadingView label="Preparing your dashboard…" />
      </Screen>
    );
  }

  // Support reviewers have no dashboard: their work starts in the queue.
  if (role === "support") return <Redirect href="/reviews" />;
  if (role === "teacher") return <TeacherHome />;
  if (isAdminRole(role)) return <AdminHome />;
  return <StudentHome />;
}
