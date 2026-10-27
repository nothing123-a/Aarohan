import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Download,
  FileKey,
  Terminal,
  RefreshCw,
  Lock,
} from "lucide-react";
import {
  Button,
  Card,
  StatCard,
  Badge,
  DataTable,
  TablePagination,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { auditService, type AuditLogItem } from "@/services/auditService";

export default function AuditLogsPage() {
  const { user } = useAuth();
  const isInstitution = user?.role === "institution_representative" || user?.role === "depositor";
  const userInstId = user?.institutionId || (isInstitution ? "inst-001" : undefined);

  const [filterAction, setFilterAction] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Query live database audit logs
  const { data: auditRes, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", filterAction, search, page, userInstId],
    queryFn: async () => {
      const res = await auditService.getLogs({
        actionType: filterAction,
        search: search || undefined,
        institutionId: userInstId,
        page,
        limit: pageSize,
      });
      return res.data;
    },
  });

  const totalLogs = auditRes?.total || 0;
  const logs = auditRes?.logs || [];
  const totalPages = Math.ceil(totalLogs / pageSize) || 1;

  const handleExportAuditJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `audit_trail_export_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const getActionBadge = (type: AuditLogItem["actionType"]) => {
    switch (type) {
      case "verification":
        return <Badge variant="success">Verification</Badge>;
      case "renewal":
        return <Badge variant="warning">Renewal / Rollover</Badge>;
      case "release":
        return <Badge variant="primary">Discharge / NOC</Badge>;
      case "auth":
        return <Badge variant="muted">Access &amp; Auth</Badge>;
      case "submission":
      default:
        return <Badge variant="info">Submission</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Compliance & Security Audit Trail"
        description="Immutable, append-only operational log recording all financial instrument lifecycle events, access attempts, and verification actions."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Audit Logs" },
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
              variant="outline"
              size="sm"
              onClick={handleExportAuditJson}
            >
              <Download size={14} />
              Export Audit Trail (JSON)
            </Button>
          </div>
        }
      />

      {/* ─── STATUTORY INTEGRITY NOTICE ───────────────────────────────── */}
      <Alert variant="info">
        <Lock size={16} className="inline mr-1.5" />
        <strong>Cryptographic Integrity Assurance:</strong> Audit records are append-only.
        Each event calculates an immutable SHA-256 integrity token referencing the responsible actor,
        action, outcome, and timestamp. Application users cannot modify or delete audit records.
      </Alert>

      {/* ─── AUDIT SUMMARY METRICS ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recorded Events"
          value={totalLogs}
          subtitle="Persistent database records"
          icon={<Terminal className="text-orange-600" />}
        />
        <StatCard
          title="Cryptographic Token"
          value="SHA-256"
          subtitle="All records digitally fingerprinted"
          icon={<FileKey className="text-emerald-600" />}
        />
        <StatCard
          title="Role Isolation"
          value="Enforced"
          subtitle={isInstitution ? "Scoped to authorized institution" : "Complete national bureau oversight"}
          icon={<ShieldCheck className="text-blue-600" />}
        />
        <StatCard
          title="Access Immutability"
          value="Append-Only"
          subtitle="Zero deletion / update capability"
          icon={<Lock className="text-purple-600" />}
        />
      </div>

      {/* ─── MAIN AUDIT LOGS CARD ─────────────────────────────────────── */}
      <Card>
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search action, actor, or FDR reference..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Operational Categories</option>
              <option value="verification">Verification &amp; CBS Liens</option>
              <option value="renewal">Renewals &amp; Replacements</option>
              <option value="release">Discharge &amp; NOC Approvals</option>
              <option value="submission">Submissions &amp; Uploads</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Showing {logs.length} of {totalLogs} events
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <DataTable<AuditLogItem>
            columns={[
              {
                key: "timestamp",
                header: "Timestamp (UTC)",
                cell: (r) => (
                  <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap block">
                    {r.timestamp}
                  </span>
                ),
              },
              {
                key: "action",
                header: "Action / Event",
                cell: (r) => (
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{r.action}</span>
                    <div className="mt-1">{getActionBadge(r.actionType)}</div>
                  </div>
                ),
              },
              {
                key: "actor",
                header: "Responsible Actor",
                cell: (r) => (
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">{r.actor}</span>
                    <span className="text-[11px] text-slate-500">{r.role}</span>
                  </div>
                ),
              },
              {
                key: "entityId",
                header: "Target Record Reference",
                cell: (r) => (
                  <span className="font-mono text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    {r.entityId}
                  </span>
                ),
              },
              {
                key: "hash",
                header: "Cryptographic SHA-256 Token",
                cell: (r) => (
                  <span
                    className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block truncate max-w-[130px]"
                    title={`Full Cryptographic Hash: ${r.fullHash}`}
                  >
                    {r.hash}
                  </span>
                ),
              },
              {
                key: "outcome",
                header: "Outcome",
                cell: (r) => (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      r.outcome === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {r.outcome.toUpperCase()}
                  </span>
                ),
              },
            ]}
            data={logs}
            keyField="id"
            isLoading={isLoading}
            emptyMessage="No audit compliance events matching the criteria."
          />
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={totalLogs}
            limit={pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
