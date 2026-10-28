import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/fdr": "FDR Central Registry",
  "/fdr/new": "Submit New FDR",
  "/verification": "Document & Lien Verification",
  "/alerts": "Maturity & Expiry Alerts",
  "/monitoring": "Maturity Timeline & Monitoring Register",
  "/notifications": "Observation & System Notifications",
  "/renewals": "Renewal & Replacement Management",
  "/release-requests": "Release & Refund Requests",
  "/reports": "Reports & Financial Analytics",
  "/audit-logs": "Audit Logs",
  "/institutions": "Institution & Bank Management",
  "/settings": "System Settings",
  "/profile": "Officer Profile",
  "/design-system": "Design System Showcase",
};

export function AppLayout() {
  const { pathname } = useLocation();

  const matchedKey = Object.keys(PAGE_TITLES).find(
    (key) => pathname === key || (key !== "/" && pathname.startsWith(key + "/"))
  );

  const pageTitle = matchedKey ? PAGE_TITLES[matchedKey] : "FDR Portal";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
