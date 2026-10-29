import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Public & Auth Supporting Pages
import LandingPage from "@/pages/public/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import AccessDeniedPage from "@/pages/auth/AccessDeniedPage";

// Authenticated Application Pages
import DashboardPage from "@/pages/dashboard/DashboardPage";
import FDRListPage from "@/pages/fdr/FDRListPage";
import FDRDetailPage from "@/pages/fdr/FDRDetailPage";
import FDRSubmitPage from "@/pages/fdr/FDRSubmitPage";
import VerificationPage from "@/pages/verification/VerificationPage";
import AlertsPage from "@/pages/alerts/AlertsPage";
import RenewalsPage from "@/pages/renewals/RenewalsPage";
import ReleaseRequestsPage from "@/pages/releases/ReleaseRequestsPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import AuditLogsPage from "@/pages/audit/AuditLogsPage";
import InstitutionsPage from "@/pages/institutions/InstitutionsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import NotificationsPage from "@/pages/notifications/NotificationsPage";
import WeeklyStatementsPage from "@/pages/statements/WeeklyStatementsPage";
import AccountAggregatorPage from "@/pages/account-aggregator/AccountAggregatorPage";

// Other & Showcase Pages
import SecurityDepositListPage from "@/pages/security-deposit/SecurityDepositListPage";
import RequestsPage from "@/pages/admin/RequestsPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import DesignSystemShowcasePage from "@/pages/design-system/DesignSystemShowcasePage";
import NotFoundPage from "@/pages/NotFoundPage";

// ─── React Query Client ────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

// ─── App Router ────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ─── Public Routes (No Dashboard Sidebar) ─────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* ─── Authenticated Routes (With Shared Layout) ────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Core Sections — accessible to all authenticated users */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/fdr" element={<FDRListPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/monitoring" element={<AlertsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* FDR new must precede /:id to avoid "new" matching as an id */}
                <Route element={<ProtectedRoute allowedRoles={["institution_representative", "depositor"]} />}>
                  <Route path="/fdr/new" element={<FDRSubmitPage />} />
                  <Route path="/renewals" element={<RenewalsPage />} />
                </Route>

                {/* FDR detail — all authenticated roles */}
                <Route path="/fdr/:id" element={<FDRDetailPage />} />

                {/* Release & Refund Claims — all roles (backend enforces institution isolation & permissions) */}
                <Route path="/release-requests" element={<ReleaseRequestsPage />} />
                <Route path="/refund-requests" element={<ReleaseRequestsPage />} />

                {/* Verification workbench — scrutiny officers and approving authority only */}
                <Route element={<ProtectedRoute allowedRoles={["scrutiny_officer", "officer", "verifier", "approving_authority"]} />}>
                  <Route path="/verification" element={<VerificationPage />} />
                </Route>

                {/* Treasury Intelligence & AA Telemetry — Approving Authority, Scrutiny Officer, Admin */}
                <Route element={<ProtectedRoute allowedRoles={["approving_authority", "scrutiny_officer", "officer", "verifier", "admin"]} />}>
                  <Route path="/statements" element={<WeeklyStatementsPage />} />
                  <Route path="/account-aggregator" element={<AccountAggregatorPage />} />
                </Route>

                {/* Audit logs — Approving Authority and Admin */}
                <Route element={<ProtectedRoute allowedRoles={["approving_authority", "admin"]} />}>
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                </Route>

                {/* Admin-only routes */}
                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/institutions" element={<InstitutionsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Additional / Showcase */}
                <Route path="/security-deposits" element={<SecurityDepositListPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/design-system" element={<DesignSystemShowcasePage />} />
              </Route>
            </Route>

            {/* ─── 404 Catch-All ───────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
