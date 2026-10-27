import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * User Management Page — admin only.
 * TODO: Implement user CRUD with role assignment.
 */
export default function UserManagementPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="User Management"
        description="Manage portal users and their roles"
      />
      <EmptyState
        icon={<Users size={32} />}
        title="No users found"
        description="System users will appear here"
      />
    </div>
  );
}
