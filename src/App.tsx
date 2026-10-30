import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageLoader } from "@/components/shared/LoadingStates";

// Public & Auth Supporting Pages (Immediate load for zero-latency login)
import LandingPage from "@/pages/public/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import AccessDeniedPage from "@/pages/auth/AccessDeniedPage";
import NotFoundPage from "@/pages/NotFoundPage";

// Authenticated Application Pages (Lazy loaded so initial /login load is instant)
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const FDRListPage = lazy(() => import("@/pages/fdr/FDRListPage"));
const FDRDetailPage = lazy(() => import("@/pages/fdr/FDRDetailPage"));
const FDRSubmitPage = lazy(() => import("@/pages/fdr/FDRSubmitPage"));
const VerificationPage = lazy(() => import("@/pages/verification/VerificationPage"));
const AlertsPage = lazy(() => import("@/pages/alerts/AlertsPage"));
const RenewalsPage = lazy(() => import("@/pages/renewals/RenewalsPage"));
const ReleaseRequestsPage = lazy(() => import("@/pages/releases/ReleaseRequestsPage"));
const RefundApplicationFormPage = lazy(() => import("@/pages/releases/RefundApplicationFormPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const AuditLogsPage = lazy(() => import("@/pages/audit/AuditLogsPage"));
const InstitutionsPage = lazy(() => import("@/pages/institutions/InstitutionsPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));
const WeeklyStatementsPage = lazy(() => import("@/pages/statements/WeeklyStatementsPage"));
const AccountAggregatorPage = lazy(() => import("@/pages/account-aggregator/AccountAggregatorPage"));
const TreasuryPage = lazy(() => import("@/pages/authority/TreasuryPage"));
const OfficerSupervisionPage = lazy(() => import("@/pages/authority/OfficerSupervisionPage"));
const FinalApprovalsPage = lazy(() => import("@/pages/authority/FinalApprovalsPage"));
const RefundSanctionsPage = lazy(() => import("@/pages/authority/RefundSanctionsPage"));

// Other & Showcase Pages
const SecurityDepositListPage = lazy(() => import("@/pages/security-deposit/SecurityDepositListPage"));
const RequestsPage = lazy(() => import("@/pages/admin/RequestsPage"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
const DesignSystemShowcasePage = lazy(() => import("@/pages/design-system/DesignSystemShowcasePage"));

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
                {/* Core Sections — wrapped in Suspense for smooth code-split loading */}
                <Route
                  path="/dashboard"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/fdr"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <FDRListPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlertsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlertsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ReportsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProfilePage />
                    </Suspense>
                  }
                />

                {/* FDR new must precede /:id to avoid "new" matching as an id */}
                <Route element={<ProtectedRoute allowedRoles={["institution_representative", "depositor"]} />}>
                  <Route
                    path="/fdr/new"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <FDRSubmitPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/renewals"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <RenewalsPage />
                      </Suspense>
                    }
                  />
                </Route>

                {/* FDR detail — all authenticated roles */}
                <Route
                  path="/fdr/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <FDRDetailPage />
                    </Suspense>
                  }
                />

                {/* Release & Refund Claims */}
                <Route
                  path="/release-requests"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ReleaseRequestsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/release-requests/new"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RefundApplicationFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/refund-requests"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ReleaseRequestsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/refund-requests/new"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RefundApplicationFormPage />
                    </Suspense>
                  }
                />

                {/* Verification workbench */}
                <Route element={<ProtectedRoute allowedRoles={["scrutiny_officer", "officer", "verifier", "approving_authority"]} />}>
                  <Route
                    path="/verification"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <VerificationPage />
                      </Suspense>
                    }
                  />
                </Route>

                {/* Treasury Intelligence & AA Telemetry */}
                <Route element={<ProtectedRoute allowedRoles={["approving_authority", "scrutiny_officer", "officer", "verifier", "admin"]} />}>
                  <Route
                    path="/statements"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <WeeklyStatementsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/account-aggregator"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AccountAggregatorPage />
                      </Suspense>
                    }
                  />
                </Route>

                {/* Audit logs */}
                <Route element={<ProtectedRoute allowedRoles={["approving_authority", "admin"]} />}>
                  <Route
                    path="/audit-logs"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AuditLogsPage />
                      </Suspense>
                    }
                  />
                </Route>

                {/* Admin & Approving Authority management & policy routes */}
                <Route element={<ProtectedRoute allowedRoles={["admin", "approving_authority"]} />}>
                  <Route
                    path="/treasury"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <TreasuryPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/officers"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <OfficerSupervisionPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/approvals"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <FinalApprovalsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/refund-sanctions"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <RefundSanctionsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <UserManagementPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/institutions"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <InstitutionsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <SettingsPage />
                      </Suspense>
                    }
                  />
                </Route>

                {/* Additional / Showcase */}
                <Route
                  path="/security-deposits"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SecurityDepositListPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <RequestsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/design-system"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <DesignSystemShowcasePage />
                    </Suspense>
                  }
                />
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
