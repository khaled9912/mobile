import { useAuth } from "@/providers/auth-provider";
import { StudentRequests } from "@/features/requests/student-requests";
import { TeacherRequests } from "@/features/requests/teacher-requests";
import { AdminApprovals } from "@/features/requests/admin-approvals";
import { Screen } from "@/components/ui/screen";
import { LoadingView } from "@/components/ui/states";

export default function RequestsTab() {
  const { role } = useAuth();

  if (!role) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }
  if (role === "teacher") return <TeacherRequests />;
  if (role === "admin" || role === "super_admin") return <AdminApprovals />;
  return <StudentRequests />;
}
