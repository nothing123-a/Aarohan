import { Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * Security Deposits List Page.
 * TODO: Implement with data table when backend is connected.
 */
export default function SecurityDepositListPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="Security Deposits"
        description="Manage security deposits and their linked FDRs"
      />
      <EmptyState
        icon={<Shield size={32} />}
        title="No security deposits found"
        description="Security deposits linked to FDRs will appear here"
      />
    </div>
  );
}
