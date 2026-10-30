import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Eye,
  Plus,
  RotateCcw,
  ShieldCheck,
  Clock,
  Building2,
} from "lucide-react";
import {
  Button,
  Card,
  Select,
  DataTable,
  TablePagination,
} from "@/components/ui";
import {
  PageHeader,
  SubmissionStatusBadge,
  VerificationStatusBadge,
  LifecycleStatusBadge,
  EmptyState,
} from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import {
  CENTRAL_FDR_RECORDS,
  CENTRAL_INSTITUTIONS,
  CentralFDRRecord,
} from "@/data/centralDataset";
import { formatCurrency, formatDate } from "@/utils";
import { useFDRs } from "@/hooks/useFDR";

type SortField = "fdrNumber" | "institutionName" | "principalAmount" | "issueDate" | "maturityDate";
type SortOrder = "asc" | "desc";

export default function FDRListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: apiResponse } = useFDRs();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [lifecycleFilter, setLifecycleFilter] = useState("all");
  const [maturityFilter, setMaturityFilter] = useState("all");
  const [institutionFilter, setInstitutionFilter] = useState("all");

  // Sorting & Pagination state
  const [sortField, setSortField] = useState<SortField>("maturityDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const isInstitution = user?.role === "institution_representative" || user?.role === "depositor";
  const userInstId = user?.institutionId || "inst-001";
  const userInstName = user?.institutionName || "Delhi Technological University (DTU)";

  // Merge live backend records with fallback dataset
  const allRecords = useMemo(() => {
    if (apiResponse?.data?.data && apiResponse.data.data.length > 0) {
      return apiResponse.data.data.map((fdr) => ({
        id: fdr.id,
        fdrNumber: fdr.fdrNumber,
        institutionId: fdr.depositorId || "inst-001",
        institutionName: fdr.depositorName || "Registered Institution",
        institutionCode: "AICTE-REG",
        depositorName: fdr.depositorName,
        depositorId: fdr.depositorId,
        bankName: fdr.bankName,
        bankBranch: fdr.bankBranch,
        ifscCode: fdr.ifscCode,
        accountNumber: fdr.accountNumber,
        principalAmount: fdr.principalAmount,
        interestRate: fdr.interestRate,
        maturityAmount: fdr.maturityAmount,
        issueDate: fdr.depositDate,
        maturityDate: fdr.maturityDate,
        tenureMonths: fdr.tenureMonths,
        instrumentCategory: "Establishment Security Deposit",
        purpose: fdr.purpose,
        department: fdr.department,
        contactPerson: "Authorized Representative",
        contactPhone: "+91 11 27871018",
        contactEmail: "registrar@institution.ac.in",
        submissionStatus: (fdr.status === "draft" ? "DRAFT" : "SUBMITTED") as any,
        verificationStatus: (fdr.status === "verified" ? "VERIFIED" : fdr.status === "under_review" ? "UNDER_SCRUTINY" : fdr.status === "rejected" ? "REJECTED" : "PENDING") as any,
        lifecycleStatus: (fdr.status === "matured" ? "MATURED" : fdr.status === "renewal_pending" ? "RENEWAL_REQUESTED" : fdr.status === "released" ? "RELEASED" : "ACTIVE") as any,
        documentsList: fdr.documents?.map((d) => ({
          id: d.id,
          name: d.fileName,
          type: d.fileType,
          size: `${(d.fileSize / (1024 * 1024)).toFixed(1)} MB`,
          hash: "a45c298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b781",
          scanStatus: "CLEAN" as const,
          uploadedAt: d.uploadedAt,
          documentType: "fdr_certificate" as const,
        })) || [],
      })) as CentralFDRRecord[];
    }
    return CENTRAL_FDR_RECORDS;
  }, [apiResponse]);

  // Enforce institution-level isolation: Institution users only see their own institution's records
  const authorizedRecords = useMemo(() => {
    if (isInstitution) {
      return allRecords.filter((r) => r.institutionId === userInstId);
    }
    return allRecords;
  }, [isInstitution, userInstId, allRecords]);

  // Filter application
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const d30 = new Date(now.getTime() + 30 * 86400000);
    const d60 = new Date(now.getTime() + 60 * 86400000);
    const d90 = new Date(now.getTime() + 90 * 86400000);

    return authorizedRecords.filter((fdr) => {
      // 1. Text Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchRef = fdr.fdrNumber.toLowerCase().includes(query);
        const matchInst = fdr.institutionName.toLowerCase().includes(query);
        const matchBank = fdr.bankName.toLowerCase().includes(query);
        const matchBranch = (fdr.bankBranch || "").toLowerCase().includes(query);
        const matchIfsc = (fdr.ifscCode || "").toLowerCase().includes(query);
        if (!matchRef && !matchInst && !matchBank && !matchBranch && !matchIfsc) {
          return false;
        }
      }

      // 2. Submission Status Filter
      if (submissionFilter !== "all" && fdr.submissionStatus !== submissionFilter) {
        return false;
      }

      // 3. Verification Status Filter
      if (verificationFilter !== "all" && fdr.verificationStatus !== verificationFilter) {
        return false;
      }

      // 4. Lifecycle Status Filter
      if (lifecycleFilter !== "all" && fdr.lifecycleStatus !== lifecycleFilter) {
        return false;
      }

      // 5. Institution Filter (for officials)
      if (!isInstitution && institutionFilter !== "all" && fdr.institutionId !== institutionFilter) {
        return false;
      }

      // 6. Maturity Date Filter
      if (maturityFilter !== "all") {
        const matDate = new Date(fdr.maturityDate);
        if (maturityFilter === "expired") {
          if (matDate >= now) return false;
        } else if (maturityFilter === "30d") {
          if (matDate < now || matDate > d30) return false;
        } else if (maturityFilter === "60d") {
          if (matDate < now || matDate > d60) return false;
        } else if (maturityFilter === "90d") {
          if (matDate < now || matDate > d90) return false;
        }
      }

      return true;
    });
  }, [
    authorizedRecords,
    search,
    submissionFilter,
    verificationFilter,
    lifecycleFilter,
    institutionFilter,
    maturityFilter,
    isInstitution,
  ]);

  // Sorting
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let comparison = 0;
      if (sortField === "fdrNumber") {
        comparison = a.fdrNumber.localeCompare(b.fdrNumber);
      } else if (sortField === "institutionName") {
        comparison = a.institutionName.localeCompare(b.institutionName);
      } else if (sortField === "principalAmount") {
        comparison = a.principalAmount - b.principalAmount;
      } else if (sortField === "issueDate") {
        const d1 = new Date(a.issueDate || a.depositDate).getTime();
        const d2 = new Date(b.issueDate || b.depositDate).getTime();
        comparison = d1 - d2;
      } else if (sortField === "maturityDate") {
        const d1 = new Date(a.maturityDate).getTime();
        const d2 = new Date(b.maturityDate).getTime();
        comparison = d1 - d2;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredRecords, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);

  // Metric summaries for the current filtered slice
  const totalPrincipal = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + r.principalAmount, 0);
  }, [filteredRecords]);

  const activeLiensCount = useMemo(() => {
    return filteredRecords.filter((r) => r.lifecycleStatus === "ACTIVE_LIEN").length;
  }, [filteredRecords]);

  const maturingSoonCount = useMemo(() => {
    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * 86400000);
    return filteredRecords.filter((r) => {
      const m = new Date(r.maturityDate);
      return m >= now && m <= in30d;
    }).length;
  }, [filteredRecords]);

  const hasActiveFilters =
    search !== "" ||
    submissionFilter !== "all" ||
    verificationFilter !== "all" ||
    lifecycleFilter !== "all" ||
    maturityFilter !== "all" ||
    institutionFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setSubmissionFilter("all");
    setVerificationFilter("all");
    setLifecycleFilter("all");
    setMaturityFilter("all");
    setInstitutionFilter("all");
    setPage(1);
  };

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fixed Deposit Receipt (FDR) Management"
        description={
          isInstitution
            ? `Authorized regulatory deposit repository for ${userInstName}. Manage and track submissions, verification status, and maturity.`
            : "Centralized AICTE Regulation Bureau security deposit oversight, bank lien endorsement, and maturity tracking registry."
        }
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "FDR Management" },
        ]}
        actions={
          isInstitution ? (
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" asChild>
                <Link to="/fdr/new" id="fdr-new-btn">
                  <Plus size={15} />
                  Submit New FDR
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Top summary metric ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Instruments</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <FileText size={18} />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Deposit Value</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(totalPrincipal)}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 size={18} />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Liens Marked</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{activeLiensCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Maturing &lt; 30 Days</p>
            <p className={`text-xl font-bold mt-0.5 ${maturingSoonCount > 0 ? "text-orange-600" : "text-slate-900"}`}>
              {maturingSoonCount}
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Institution Data Isolation Notice for Institution Users */}
      {isInstitution && (
        <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-lg text-xs text-orange-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-orange-600 flex-shrink-0" />
            <span>
              <strong>Regulatory Scoping:</strong> You are viewing records strictly restricted to your authorized institution:{" "}
              <strong>{userInstName}</strong> (ID: {userInstId}).
            </span>
          </div>
          <span className="text-[11px] font-mono text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded">
            Confidential
          </span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          {/* Row 1: Search & Reset */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search FDR number, bank name, IFSC, or institution..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-xs"
                id="fdr-search"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-slate-600"
                >
                  <RotateCcw size={13} />
                  Reset Filters
                </Button>
              )}
              <span className="text-xs text-slate-500">
                Found <strong className="text-slate-900 font-semibold">{filteredRecords.length}</strong> matching records
              </span>
            </div>
          </div>

          {/* Row 2: Distinct Status Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
            {/* 1. Submission Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Submission Status
              </label>
              <Select
                value={submissionFilter}
                onChange={(e) => {
                  setSubmissionFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Submissions" },
                  { value: "SUBMITTED", label: "Submitted" },
                  { value: "DRAFT", label: "Draft" },
                  { value: "RETURNED", label: "Returned for Correction" },
                  { value: "WITHDRAWN", label: "Withdrawn" },
                ]}
              />
            </div>

            {/* 2. Verification Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Verification Status
              </label>
              <Select
                value={verificationFilter}
                onChange={(e) => {
                  setVerificationFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Verifications" },
                  { value: "VERIFIED", label: "Verified & Approved" },
                  { value: "PENDING_REVIEW", label: "Pending Scrutiny" },
                  { value: "UNDER_SCRUTINY", label: "Under Scrutiny" },
                  { value: "DISCREPANCY_FLAGGED", label: "Discrepancy Flagged" },
                  { value: "NOT_STARTED", label: "Not Started" },
                ]}
              />
            </div>

            {/* 3. Lifecycle Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Lifecycle Status
              </label>
              <Select
                value={lifecycleFilter}
                onChange={(e) => {
                  setLifecycleFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Lifecycles" },
                  { value: "ACTIVE_LIEN", label: "Active Lien Marked" },
                  { value: "MATURING_SOON", label: "Maturing Soon (<30d)" },
                  { value: "LODGED", label: "Lodged in Safe Custody" },
                  { value: "MATURED", label: "Matured" },
                  { value: "RENEWAL_REQUESTED", label: "Renewal Pending" },
                  { value: "RELEASE_REQUESTED", label: "Release Requested" },
                  { value: "RELEASED", label: "Released / Refunded" },
                ]}
              />
            </div>

            {/* 4. Maturity Date Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Maturity Window
              </label>
              <Select
                value={maturityFilter}
                onChange={(e) => {
                  setMaturityFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "Any Maturity Date" },
                  { value: "30d", label: "Within 30 Days" },
                  { value: "60d", label: "Within 60 Days" },
                  { value: "90d", label: "Within 90 Days" },
                  { value: "expired", label: "Expired / Matured" },
                ]}
              />
            </div>

            {/* 5. Institution Filter: Visible ONLY to non-institution officials */}
            {!isInstitution ? (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Institution (Official Filter)
                </label>
                <Select
                  value={institutionFilter}
                  onChange={(e) => {
                    setInstitutionFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Registered Institutions" },
                    ...CENTRAL_INSTITUTIONS.map((inst) => ({
                      value: inst.id,
                      label: `${inst.name.split("—")[0].trim()}`,
                    })),
                  ]}
                />
              </div>
            ) : (
              <div className="hidden lg:block">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Regulatory Jurisdiction
                </label>
                <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-100 flex items-center text-xs text-slate-600 font-mono">
                  {CENTRAL_INSTITUTIONS.find((i) => i.id === userInstId)?.code || "AICTE-NZ"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Records Table */}
        {sortedRecords.length === 0 ? (
          <EmptyState
            icon={<FileText size={36} />}
            title="No matching Fixed Deposit Receipts found"
            description="No FDR records match the specified search query or active filter combination."
            action={
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    <RotateCcw size={14} /> Clear Filters
                  </Button>
                )}
                <Button variant="primary" size="sm" asChild>
                  <Link to="/fdr/new">
                    <Plus size={14} /> Submit New FDR
                  </Link>
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <DataTable
              keyField="id"
              tableClassName="min-w-[1200px]"
              onRowClick={(row) => navigate(`/fdr/${row.id}`)}
              sortColumn={sortField}
              sortDirection={sortOrder}
              onSort={(column) => handleSortToggle(column as SortField)}
              columns={[
                {
                  key: "fdrNumber",
                  header: "FDR Reference",
                  sortable: true,
                  className: "min-w-[200px]",
                  cell: (row: CentralFDRRecord) => (
                    <div className="py-0.5">
                      <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                        {row.fdrNumber}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {row.instrumentCategory || row.purpose}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "institutionName",
                  header: "Institution",
                  sortable: true,
                  className: "min-w-[230px]",
                  cell: (row: CentralFDRRecord) => (
                    <div className="py-0.5">
                      <p className="text-xs font-semibold text-slate-800">{row.institutionName}</p>
                      <span className="inline-block mt-0.5 font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {row.institutionCode || "AICTE"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "bankName",
                  header: "Bank & Branch",
                  className: "min-w-[220px]",
                  cell: (row: CentralFDRRecord) => (
                    <div className="py-0.5">
                      <p className="text-xs font-semibold text-slate-800">{row.bankName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {row.bankBranch} · {row.ifscCode}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "principalAmount",
                  header: "Principal Amount",
                  sortable: true,
                  align: "right",
                  className: "whitespace-nowrap min-w-[130px]",
                  cell: (row: CentralFDRRecord) => (
                    <div className="py-0.5 text-right">
                      <p className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.principalAmount)}</p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        @{row.interestRate}% · {row.tenureMonths || 36}m
                      </span>
                    </div>
                  ),
                },
                {
                  key: "issueDate",
                  header: "Issue Date",
                  sortable: true,
                  className: "whitespace-nowrap min-w-[110px]",
                  cell: (row: CentralFDRRecord) => (
                    <span className="text-xs font-mono text-slate-600">
                      {row.issueDate ? formatDate(row.issueDate) : formatDate(row.depositDate)}
                    </span>
                  ),
                },
                {
                  key: "maturityDate",
                  header: "Maturity Date",
                  sortable: true,
                  className: "whitespace-nowrap min-w-[130px]",
                  cell: (row: CentralFDRRecord) => {
                    const matDate = new Date(row.maturityDate);
                    const now = new Date();
                    const diffDays = Math.ceil((matDate.getTime() - now.getTime()) / 86400000);
                    const isMaturingSoon = diffDays > 0 && diffDays <= 30;
                    const isExpired = diffDays <= 0;

                    return (
                      <div>
                        <span className="text-xs font-mono font-medium text-slate-800">
                          {formatDate(row.maturityDate)}
                        </span>
                        {isMaturingSoon && (
                          <span className="block text-[10px] font-bold text-orange-600">
                            {diffDays} days left
                          </span>
                        )}
                        {isExpired && (
                          <span className="block text-[10px] font-bold text-red-600">
                            Matured
                          </span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "submissionStatus",
                  header: "Submission",
                  className: "whitespace-nowrap min-w-[110px]",
                  cell: (row: CentralFDRRecord) => (
                    <SubmissionStatusBadge status={row.submissionStatus} />
                  ),
                },
                {
                  key: "verificationStatus",
                  header: "Verification",
                  className: "whitespace-nowrap min-w-[140px]",
                  cell: (row: CentralFDRRecord) => (
                    <VerificationStatusBadge status={row.verificationStatus} />
                  ),
                },
                {
                  key: "lifecycleStatus",
                  header: "Lifecycle",
                  className: "whitespace-nowrap min-w-[140px]",
                  cell: (row: CentralFDRRecord) => (
                    <LifecycleStatusBadge status={row.lifecycleStatus} />
                  ),
                },
                {
                  key: "actions",
                  header: "Action",
                  align: "right",
                  className: "whitespace-nowrap min-w-[90px]",
                  cell: (row: CentralFDRRecord) => (
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-slate-700 hover:text-orange-600 hover:border-orange-300"
                        asChild
                      >
                        <Link to={`/fdr/${row.id}`}>
                          <Eye size={12} />
                          <span>View</span>
                        </Link>
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={paginatedRecords}
            />

            <TablePagination
              page={page}
              totalPages={totalPages}
              total={sortedRecords.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
