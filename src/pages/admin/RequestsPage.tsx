import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * Workflow Requests Page — pending renewals, replacements, and releases.
 * TODO: Implement with data table and action buttons.
 */
export default function RequestsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="Workflow Requests"
        description="Review and action pending FDR requests"
      />
      <EmptyState
        icon={<ClipboardList size={32} />}
        title="No pending requests"
        description="Renewal, replacement, and release requests will appear here"
      />
    </div>
  );
}
