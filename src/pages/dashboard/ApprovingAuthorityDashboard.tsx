import TreasuryPage from "@/pages/authority/TreasuryPage";
import type { User } from "@/types";

interface ApprovingAuthorityDashboardProps {
  user: User;
}

export function ApprovingAuthorityDashboard({}: ApprovingAuthorityDashboardProps) {
  return <TreasuryPage />;
}
