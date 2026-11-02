import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";
import { WeeklyAvailabilityEditor } from "@/features/availability/weekly-availability-editor";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function AdminTeacherAvailabilityScreen() {
  const params = useLocalSearchParams<{
    teacherId?: string | string[];
    name?: string | string[];
  }>();
  const teacherId = first(params.teacherId);
  const teacherName = first(params.name);

  return (
    <RoleGate roles={["admin", "super_admin"]}>
      {teacherId ? (
        <WeeklyAvailabilityEditor
          mode="admin"
          teacherId={teacherId}
          teacherName={teacherName}
        />
      ) : (
        <Screen>
          <EmptyState
            icon="calendar-outline"
            title="Choose a teacher"
            body="Open a teacher from the People tab to manage their weekly availability."
          />
        </Screen>
      )}
    </RoleGate>
  );
}
