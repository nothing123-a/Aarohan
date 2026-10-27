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

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch notifications
  const { data: notifRes, isLoading, refetch } = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: async () => {
      const res = await notificationService.getAll(unreadOnly);
      return res.data;
    },
  });

  const notifications = (notifRes?.data || []) as AppNotification[];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
