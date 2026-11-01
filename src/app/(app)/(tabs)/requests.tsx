import { useAuth, isAdminRole } from "@/providers/auth-provider";
import { StudentChangeRequests } from "@/features/requests/student-change-requests";
import { AdminChangeQueue } from "@/features/requests/admin-change-queue";
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
  if (isAdminRole(role)) return <AdminChangeQueue />;
  if (role === "student") return <StudentChangeRequests />;

  return (
    <Screen>
      <LoadingView />
    </Screen>
  );
}
