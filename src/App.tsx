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
                {/* Core Sections */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/fdr" element={<FDRListPage />} />
                <Route path="/fdr/new" element={<FDRSubmitPage />} />
                <Route path="/fdr/:id" element={<FDRDetailPage />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/renewals" element={<RenewalsPage />} />
                <Route path="/release-requests" element={<ReleaseRequestsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/institutions" element={<InstitutionsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Additional / Admin Routes */}
                <Route path="/security-deposits" element={<SecurityDepositListPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/design-system" element={<DesignSystemShowcasePage />} />

                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="/admin/users" element={<UserManagementPage />} />
                </Route>
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
