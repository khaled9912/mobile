import { RoleGate } from "@/components/ui/role-gate";
import { WeeklyAvailabilityEditor } from "@/features/availability/weekly-availability-editor";

export default function TeacherAvailabilityScreen() {
  return (
    <RoleGate roles={["teacher"]}>
      <WeeklyAvailabilityEditor mode="self" />
    </RoleGate>
  );
}
