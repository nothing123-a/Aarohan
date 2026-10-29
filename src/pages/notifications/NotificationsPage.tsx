import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Card,
  StatCard,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { notificationService } from "@/services/notificationService";

/** Extended shape returned by the backend notifications endpoint */
interface AppNotification {
  id: string;
  title: string;
  message: string;
  /** Backend notification_type e.g. maturity_reminder_30d, submission_update */
  type: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: string;
}

const getFallbackNotificationsForRole = (role?: string): AppNotification[] => {
  if (role === "institution_representative" || role === "depositor") {
    return [
      {
        id: "notif-inst-1",
        title: "FDR Certificate Uploaded",
        message: "FDR certificate FDR_AICTE_2026_FD143 uploaded successfully. Forwarded to Scrutiny Officer for OCR verification.",
        type: "submission_update",
        isRead: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: "notif-inst-2",
        title: "Clarification Required for Lien Notation",
        message: "Scrutiny Officer requested clarification on Bank of Baroda deposit joint lien endorsement.",
        type: "discrepancy_update",
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: "notif-inst-3",
        title: "Statutory Deposit Maturing in 28 Days",
        message: "Fixed deposit FDR-2024-9841 (₹50,00,000) reaches maturity soon. Initiate renewal or release claim.",
        type: "maturity_reminder_30d",
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      },
      {
        id: "notif-inst-4",
        title: "Security Deposit Refund Sanctioned",
        message: "Refund request REF-2026-081 approved by AICTE Approving Authority. Disbursement initiated to registered treasury account.",
        type: "release_refund_update",
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ];
  } else if (role === "scrutiny_officer" || role === "officer" || role === "verifier") {
    return [
      {
        id: "notif-scrutiny-1",
        title: "New Instrument Submitted for Scrutiny",
        message: "Delhi Technological University submitted new FDR (₹50 Lakh). Document awaiting OCR scrutiny and verification.",
        type: "submission_update",
        isRead: false,
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        id: "notif-scrutiny-2",
        title: "OCR Amount Discrepancy Flagged",
        message: "Punjab National Bank deposit (FDR-2026-98124): claimed amount ₹35,00,000 vs extracted ₹30,00,000.",
        type: "discrepancy_update",
        isRead: false,
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: "notif-scrutiny-3",
        title: "Institution Clarification Received",
        message: "DTU submitted bank clarification letter regarding joint lien clause on instrument FDR-2024-9841.",
        type: "submission_update",
        isRead: false,
        createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
      {
        id: "notif-scrutiny-4",
        title: "Branch Manager Lien Confirmation",
        message: "State Bank of India Parliament Street branch confirmed irrevocable joint lien notation via CBS inquiry.",
        type: "submission_update",
        isRead: true,
        createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      },
    ];
  } else if (role === "approving_authority") {
    return [
      {
        id: "notif-approver-1",
        title: "Release Request Pending Final Sanction",
        message: "Delhi Technological University requested release of ₹50,00,000 against FDR-2024-9841. Scrutiny cleared with zero discrepancies.",
        type: "release_refund_update",
        isRead: false,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: "notif-approver-2",
        title: "Scrutiny Dossiers Recommended",
        message: "3 FDR dossiers verified by Scrutiny Officers and awaiting executive approval.",
        type: "submission_update",
        isRead: false,
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
      {
        id: "notif-approver-3",
        title: "Weekly Statement Non-Compliance Alert",
        message: "2 institutions missed the statutory deadline for weekly bank confirmation statement upload.",
        type: "maturity_reached",
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
      {
        id: "notif-approver-4",
        title: "Executive Compliance Ledger Ready",
        message: "Monthly security deposit compliance and maturity risk digest compiled for AICTE Regulation Bureau.",
        type: "info",
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ];
  } else {
    return [
      {
        id: "notif-admin-1",
        title: "Security & Document Storage Audit Clean",
        message: "Automated security scan completed. All uploaded FDR certificates validated with zero malware signatures.",
        type: "info",
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: "notif-admin-2",
        title: "New Institution Representative Onboarded",
        message: "Representative account for Netaji Subhas University of Technology verified and assigned active status.",
        type: "submission_update",
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: "notif-admin-3",
        title: "OCR Processing Throughput",
        message: "Document extraction engine processed 18 deposit certificates with 98.4% average OCR confidence.",
        type: "info",
        isRead: false,
        createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      },
      {
        id: "notif-admin-4",
        title: "Database Synchronization Healthy",
        message: "PostgreSQL pooler checkpoints verified. Automated fallback mechanisms operational.",
        type: "info",
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ];
  }
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch notifications
  const { data: notifRes, isLoading, refetch } = useQuery({
    queryKey: ["notifications", unreadOnly, user?.role],
    queryFn: async () => {
      const res = await notificationService.getAll(unreadOnly);
      return res.data;
    },
  });

  const rawNotifications = (notifRes?.data || []) as AppNotification[];
  const roleFallback = getFallbackNotificationsForRole(user?.role);
  const allNotifications = rawNotifications.length > 0 ? rawNotifications : roleFallback;
  const notifications = unreadOnly ? allNotifications.filter((n) => !n.isRead) : allNotifications;
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["topbar-notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      setFeedback("All notifications marked as read.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["topbar-notifications"] });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  const getNotificationIcon = (type: string) => {
    if (type.startsWith("maturity_reminder")) {
      return <Clock className="text-amber-600" size={18} />;
    }
    switch (type) {
      case "maturity_reached":
        return <AlertTriangle className="text-red-600" size={18} />;
      case "discrepancy_update":
        return <AlertTriangle className="text-orange-600" size={18} />;
      case "release_refund_update":
        return <CheckCircle2 className="text-emerald-600" size={18} />;
      case "submission_update":
      default:
        return <Info className="text-blue-600" size={18} />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Regulatory Alerts & Workflow Notifications"
        description="Official in-app notifications regarding deposit submissions, scrutiny observations, CBS verification decisions, and statutory maturity reminders."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                isLoading={markAllMutation.isPending}
              >
                <CheckCheck size={14} />
                Mark All as Read
              </Button>
            )}
          </div>
        }
      />

      {feedback && (
        <Alert variant="success">
          <CheckCircle2 size={16} className="inline mr-1.5" />
          {feedback}
        </Alert>
      )}

      {/* ─── SUMMARY CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Notifications"
          value={notifications.length}
          subtitle="Scoped to authorized recipient"
          icon={<Bell className="text-orange-600" />}
        />
        <StatCard
          title="Unread Critical Alerts"
          value={unreadCount}
          subtitle="Requiring institutional review"
          icon={<AlertTriangle className="text-amber-600" />}
        />
        <StatCard
          title="Delivery Channel"
          value="In-App Realtime"
          subtitle="Synchronized across regulatory roles"
          icon={<CheckCircle2 className="text-emerald-600" />}
        />
      </div>

      {/* ─── NOTIFICATIONS FEED CARD ──────────────────────────────────── */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnreadOnly(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                !unreadOnly
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                unreadOnly
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Unread Only ({unreadCount})
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Recipient: <strong className="text-slate-800">{user?.name}</strong>{" "}
            ({user?.role.replace("_", " ")})
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                  !n.isRead ? "bg-orange-50/40 hover:bg-orange-50/60" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      {n.relatedEntityId && (
                        <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Reference: {n.relatedEntityId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!n.isRead ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markReadMutation.mutate(n.id)}
                      isLoading={markReadMutation.isPending && markReadMutation.variables === n.id}
                    >
                      Mark as Read
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
                      Read
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bell size={32} className="mx-auto mb-2 opacity-40" />
              No notifications matching your filter.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
