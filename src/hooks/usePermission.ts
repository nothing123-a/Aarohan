import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";

/**
 * Hook to check if the current user has a required role.
 * Returns helpers for role-based access control (RBAC).
 */
export function usePermission() {
  const { user, isAuthenticated } = useAuth();

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = user?.role === "admin";
  const isOfficer = user?.role === "officer";
  const isVerifier = user?.role === "verifier";
  const isDepositor = user?.role === "depositor";

  // Can submit new FDRs
  const canSubmitFDR = isAuthenticated && (isDepositor || isOfficer || isAdmin);

  // Can verify submitted FDRs
  const canVerifyFDR = isAuthenticated && (isVerifier || isAdmin);

  // Can approve renewals and releases
  const canApproveRequests = isAuthenticated && (isOfficer || isAdmin);

  // Can manage users and system settings
  const canManageSystem = isAuthenticated && isAdmin;

  return {
    hasRole,
    isAdmin,
    isOfficer,
    isVerifier,
    isDepositor,
    canSubmitFDR,
    canVerifyFDR,
    canApproveRequests,
    canManageSystem,
  };
}
