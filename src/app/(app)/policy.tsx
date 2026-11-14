import { RoleGate } from "@/components/ui/role-gate";
import { PolicyAgreement } from "@/features/policy/policy-agreement";

export default function PolicyScreen() {
  return (
    <RoleGate roles={["teacher", "student"]}>
      <PolicyAgreement />
    </RoleGate>
  );
}
