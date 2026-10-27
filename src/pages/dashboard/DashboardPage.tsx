import { useAuth } from "@/context/AuthContext";
import { InstitutionDashboard } from "./InstitutionDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { ScrutinyOfficerDashboard } from "./ScrutinyOfficerDashboard";
import { ApprovingAuthorityDashboard } from "./ApprovingAuthorityDashboard";
import { PageLoader } from "@/components/shared/LoadingStates";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <PageLoader />;
  }

  switch (user.role) {
    case "institution_representative":
    case "depositor":
      return <InstitutionDashboard user={user} />;

    case "scrutiny_officer":
    case "officer":
    case "verifier":
      return <ScrutinyOfficerDashboard user={user} />;

    case "approving_authority":
      return <ApprovingAuthorityDashboard user={user} />;

    case "admin":
    default:
      return <AdminDashboard user={user} />;
  }
}
