import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  AlertTriangle,
  Send,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  Building2,
  Mail,
} from "lucide-react";
import {
  Button,
  Card,
  StatCard,
  DataTable,
  TablePagination,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { monitoringService, type MaturityItem } from "@/services/monitoringService";

export default function AlertsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | "approaching" | "past">("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [sentSuccessMessage, setSentSuccessMessage] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Institution scoping for institution representative
  const isInstitution = user?.role === "institution_representative" || user?.role === "depositor";
  const userInstId = user?.institutionId || (isInstitution ? "inst-001" : undefined);

  // Fetch live maturity register
  const { data: registerRes, isLoading, refetch } = useQuery({
    queryKey: ["maturity-register", userInstId],
    queryFn: async () => {
      const res = await monitoringService.getMaturityRegister(userInstId);
      return res.data.data;
    },
  });

  // Run scheduled deadline check mutation
  const checkMutation = useMutation({
    mutationFn: () => monitoringService.runDeadlineChecks(),
    onSuccess: (res) => {
      const d = res.data.data;
      setCheckResult(
        `Automated check completed. Created ${d.new_notifications_created} in-app reminder(s), skipped ${d.skipped_duplicates} duplicate(s) to maintain idempotency.`
      );
      queryClient.invalidateQueries({ queryKey: ["maturity-register"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setTimeout(() => setCheckResult(null), 8000);
    },
  });

  // Send manual reminder mutation
  const sendMutation = useMutation({
    mutationFn: (instrumentId: string) => monitoringService.sendManualReminder(instrumentId),
    onSuccess: (_, instrumentId) => {
      setSentSuccessMessage(`Regulatory reminder notice dispatched for instrument ID ${instrumentId}.`);
      queryClient.invalidateQueries({ queryKey: ["maturity-register"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setTimeout(() => setSentSuccessMessage(null), 5000);
    },
  });

  const summary = registerRes?.summary || {
    total_monitored: 0,
    approaching_maturity_count: 0,
    past_maturity_count: 0,
    active_long_term_count: 0,
    evaluation_date: "",
  };

  // Determine items based on active tab
  const itemsToFilter = useMemo(() => {
    if (!registerRes) return [];
    if (activeTab === "approaching") return registerRes.approaching_maturity;
    if (activeTab === "past") return registerRes.past_maturity;
    return registerRes.all_monitored;
  }, [registerRes, activeTab]);

  // Apply severity filter
  const filteredRecords = useMemo(() => {
    return itemsToFilter.filter((r) => {
      if (filterSeverity === "all") return true;
      return r.severity === filterSeverity;
    });
  }, [itemsToFilter, filterSeverity]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const getSeverityBadge = (item: MaturityItem) => {
    if (item.daysRemaining <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <Clock size={12} />
          Past Maturity ({Math.abs(item.daysRemaining)}d ago)
        </span>
      );
    }
    if (item.daysRemaining <= 15) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle size={12} />
          Urgent ({item.daysRemaining}d remaining)
        </span>
      );
    }
    if (item.daysRemaining <= 60) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Clock size={12} />
          Approaching ({item.daysRemaining}d remaining)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <ShieldCheck size={12} />
        Normal ({item.daysRemaining}d remaining)
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Maturity Monitoring & Regulatory Reminders"
        description="Comprehensive statutory deadline tracking, proactive rollover notifications, and custody audit register."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Maturity & Deadlines" },
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => checkMutation.mutate()}
              isLoading={checkMutation.isPending}
            >
              <Clock size={14} />
              Run Scheduled Deadline Check
            </Button>
          </div>
        }
      />

      {/* ─── STATUTORY SAFEGUARD BANNER ───────────────────────────────── */}
      <Alert variant="info">
        <Info size={16} className="inline mr-1.5" />
        <strong>AICTE Regulatory Monitoring Safeguard:</strong> Reaching contractual maturity does{" "}
        <strong>not</strong> classify an institution as automatically noncompliant. Encashment or
        forfeiture is not initiated automatically upon maturity; an administrative rollover
        submission or official Bank Discharge NOC is required.
      </Alert>

      {/* ─── FEEDBACK ALERTS ─────────────────────────────────────────── */}
      {checkResult && (
        <Alert variant="success">
          <CheckCircle2 size={16} className="inline mr-1.5" />
          {checkResult}
        </Alert>
      )}

      {sentSuccessMessage && (
        <Alert variant="success">
          <Mail size={16} className="inline mr-1.5" />
          {sentSuccessMessage}
        </Alert>
      )}

      {/* ─── METRIC CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Past Maturity Date"
          value={summary.past_maturity_count}
          subtitle="Awaiting rollover or discharge"
          icon={<Clock className="text-red-500" />}
        />
        <StatCard
          title="Approaching (≤ 90 Days)"
          value={summary.approaching_maturity_count}
          subtitle="In reminder schedule window"
          icon={<AlertTriangle className="text-amber-500" />}
        />
        <StatCard
          title="Active Long-Term Custody"
          value={summary.active_long_term_count}
          subtitle="Beyond 90 days maturity"
          icon={<ShieldCheck className="text-emerald-500" />}
        />
        <StatCard
          title="Total Monitored Deposits"
          value={summary.total_monitored}
          subtitle={`Evaluated as of ${summary.evaluation_date || "Today"}`}
          icon={<Calendar className="text-blue-500" />}
        />
      </div>

      {/* ─── TABLE VIEW CARD ─────────────────────────────────────────── */}
      <Card>
        {/* Navigation Tabs */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab("all"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "all"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Instruments ({summary.total_monitored})
            </button>
            <button
              onClick={() => { setActiveTab("approaching"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "approaching"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Approaching Maturity ({summary.approaching_maturity_count})
            </button>
            <button
              onClick={() => { setActiveTab("past"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "past"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Past Maturity ({summary.past_maturity_count})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Filter Severity:</label>
            <select
              value={filterSeverity}
              onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Severities</option>
              <option value="urgent">Urgent (≤ 15d)</option>
              <option value="warning">Warning (≤ 60d)</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        {/* Instruments Table */}
        <div className="overflow-x-auto">
          <DataTable<MaturityItem>
            columns={[
              {
                key: "fdrNumber",
                header: "Instrument / FDR #",
                cell: (r) => (
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-900 block">
                      {r.fdrNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building2 size={11} />
                      {r.institutionName}
                    </span>
                  </div>
                ),
              },
              {
                key: "bankName",
                header: "Issuing Bank",
                cell: (r) => (
                  <div>
                    <span className="text-xs font-medium text-slate-800 block">{r.bankName}</span>
                    <span className="text-[11px] text-slate-500">{r.branchName || "Main Branch"}</span>
                  </div>
                ),
              },
              {
                key: "amountFormatted",
                header: "Principal Amount",
                cell: (r) => (
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {r.amountFormatted}
                  </span>
                ),
              },
              {
                key: "maturityDate",
                header: "Maturity Date & Timeline",
                cell: (r) => (
                  <div>
                    <span className="font-mono text-xs text-slate-800 block">
                      {r.maturityDate || "Not recorded"}
                    </span>
                    <div className="mt-1">{getSeverityBadge(r)}</div>
                  </div>
                ),
              },
              {
                key: "reminderStatus",
                header: "Reminder Status",
                cell: (r) => (
                  <div>
                    <span className="text-xs text-slate-700 block font-medium">
                      {r.reminderStatus}
                    </span>
                    <span className="text-[11px] text-slate-500">In-App Notification</span>
                  </div>
                ),
              },
              {
                key: "nextRequiredAction",
                header: "Required Regulatory Next Action",
                cell: (r) => (
                  <span className="text-xs text-slate-700 font-medium block max-w-xs">
                    {r.nextRequiredAction}
                  </span>
                ),
              },
              {
                key: "id",
                header: "Action",
                align: "right",
                cell: (r) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendMutation.mutate(r.id)}
                    isLoading={sendMutation.isPending && sendMutation.variables === r.id}
                  >
                    <Send size={13} />
                    Dispatch Notice
                  </Button>
                ),
              },
            ]}
            data={paginatedRecords}
            keyField="id"
            isLoading={isLoading}
            emptyMessage="No financial instruments matching this maturity filter."
          />
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={filteredRecords.length}
            limit={pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
