import { useState } from "react";
import {
  FileText,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Trash2,
  Edit,
  Eye,
  MoreVertical,
  Filter,
  Search,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  Badge,
  Alert,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  Dialog,
  ConfirmDialog,
  DataTable,
  TablePagination,
  ActionDropdown,
} from "@/components/ui";

import {
  PageHeader,
  EmptyState,
  SkeletonCard,
  FDRStatusBadge,
} from "@/components/shared";

import type { FDRStatus } from "@/types";

export default function DesignSystemShowcasePage() {
  // Interactive state
  const [activeTab, setActiveTab] = useState<"overview" | "buttons" | "forms" | "data" | "feedback">("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Form states
  const [inputValue, setInputValue] = useState("");
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  // Color copier
  const copyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  // Color palette items
  const colors = [
    { name: "Primary Orange", hex: "#F97316", role: "Primary actions, active states, key metrics" },
    { name: "Dark Orange", hex: "#EA580C", role: "Button hover, active contrast" },
    { name: "Light Orange", hex: "#FFF7ED", role: "Active tab bg, alert tints, badges" },
    { name: "Pale Orange", hex: "#FFEDD5", role: "Selection highlight, subtle border fills" },
    { name: "Background", hex: "#F8FAFC", role: "App page canvas background" },
    { name: "Surface", hex: "#FFFFFF", role: "Cards, panels, modal dialogs" },
    { name: "Primary Text", hex: "#0F172A", role: "Headings, numbers, primary labels" },
    { name: "Secondary Text", hex: "#64748B", role: "Subtitles, table headers, descriptions" },
    { name: "Border", hex: "#E2E8F0", role: "Card borders, table dividers, inputs" },
    { name: "Success", hex: "#16A34A", role: "Verified, active status, confirmations" },
    { name: "Warning", hex: "#D97706", role: "Maturing soon, review required" },
    { name: "Error", hex: "#DC2626", role: "Rejected, errors, destructive actions" },
  ];

  // Sample data for DataTable demo
  const sampleData = [
    { id: "FDR-2026-001", depositor: "L&T Infrastructure Ltd", bank: "State Bank of India", amount: "₹45,00,000", status: "active" as FDRStatus, maturity: "2026-11-15" },
    { id: "FDR-2026-002", depositor: "Tata Projects Global", bank: "HDFC Bank Ltd", amount: "₹1,20,00,000", status: "matured" as FDRStatus, maturity: "2026-10-30" },
    { id: "FDR-2026-003", depositor: "Afcons Infrastructure", bank: "Punjab National Bank", amount: "₹75,50,000", status: "under_review" as FDRStatus, maturity: "2027-04-10" },
    { id: "FDR-2026-004", depositor: "Shapoorji Pallonji Co.", bank: "Bank of Baroda", amount: "₹30,00,000", status: "verified" as FDRStatus, maturity: "2026-12-01" },
    { id: "FDR-2026-005", depositor: "GMR Enterprises", bank: "ICICI Bank", amount: "₹92,00,000", status: "renewal_pending" as FDRStatus, maturity: "2026-11-05" },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header */}
      <PageHeader
        title="Fintech Design System"
        description="Core design tokens, components, and interaction patterns tailored for the Garuda Netra SIH FDR Portal."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Design System Showcase" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Eye size={14} />
              Open Sample Modal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Sparkles size={14} />
              Test Confirm Action
            </Button>
          </div>
        }
      />

      {/* Navigation tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-px">
        {[
          { id: "overview", label: "Colors & Tokens" },
          { id: "buttons", label: "Buttons & Badges" },
          { id: "forms", label: "Form Controls" },
          { id: "data", label: "Cards & Tables" },
          { id: "feedback", label: "Feedback & States" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-orange-500 text-orange-600 bg-orange-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: OVERVIEW & TOKENS ─────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-slide-up">
          {/* Palette cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Color System</h2>
                <p className="text-xs text-slate-500">
                  Precision HSL color tokens conforming to WCAG AA contrast standards.
                </p>
              </div>
              <span className="text-xs text-slate-400">Click any swatch to copy HEX</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {colors.map((c) => (
                <div
                  key={c.hex}
                  onClick={() => copyHex(c.hex)}
                  className="group relative bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all cursor-pointer"
                >
                  <div
                    className="h-16 w-full rounded-lg mb-2.5 border border-black/5 flex items-center justify-center transition-transform group-hover:scale-[1.02]"
                    style={{ backgroundColor: c.hex }}
                  >
                    {copiedColor === c.hex ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold animate-scale-in">
                        <Check size={11} /> Copied
                      </span>
                    ) : (
                      <Copy
                        size={14}
                        className="opacity-0 group-hover:opacity-75 transition-opacity text-white mix-blend-difference"
                      />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[11px] font-mono text-slate-500 uppercase">{c.hex}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">{c.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Typography & Spacing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Typography System</CardTitle>
                <CardDescription>Plus Jakarta Sans for headings & Inter for dense numerical/data tables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400">Display / H1 — 24px Bold</span>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight font-plus-jakarta">
                    Garuda Netra FDR Portal
                  </p>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400">Card Title / H2 — 16px SemiBold</span>
                  <p className="text-base font-semibold text-slate-900">
                    Security Deposit Verification Matrix
                  </p>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400">Fintech Stat / Number — 28px Bold Tabular</span>
                  <p className="text-3xl font-bold text-slate-900 font-plus-jakarta tracking-tight">
                    ₹ 14,82,50,000
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400">Body & Meta — 14px / 12px Regular</span>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Automated reconciliation engine validating FDR records directly against authorized public sector banks.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Design Principles & Guidelines</CardTitle>
                <CardDescription>Rules defining the portal visual language</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50/70 border border-orange-100 text-xs">
                  <span className="h-2 w-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-orange-950">Purposeful Orange Accent:</strong>
                    <p className="text-orange-900/80 mt-0.5">
                      Orange (#F97316) is reserved for primary CTAs, active sidebar pills, critical maturity notices, and progress indicators.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="h-2 w-2 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900">Restrained Gradients & Shadows:</strong>
                    <p className="text-slate-600 mt-0.5">
                      Flat white surfaces on a calm #F8FAFC canvas with crisp 1px borders (#E2E8F0) and subtle warm elevation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="h-2 w-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900">Fintech-Grade Readability:</strong>
                    <p className="text-slate-600 mt-0.5">
                      Strict column alignments, monospace numbers where applicable, and instant visual status indicators.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 2: BUTTONS & BADGES ──────────────────────────────── */}
      {activeTab === "buttons" && (
        <div className="space-y-8 animate-slide-up">
          {/* Button Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Button System</CardTitle>
              <CardDescription>Primary actions, secondary actions, toolbars, and loading states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Variants</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">
                    <Plus size={15} /> Primary Orange
                  </Button>
                  <Button variant="secondary">
                    <Download size={15} /> Dark Secondary
                  </Button>
                  <Button variant="outline">
                    <Filter size={15} /> Outline
                  </Button>
                  <Button variant="outline-primary">
                    <Sparkles size={15} /> Outline Primary
                  </Button>
                  <Button variant="ghost">
                    Ghost Link
                  </Button>
                  <Button variant="ghost-primary">
                    Ghost Primary
                  </Button>
                  <Button variant="destructive">
                    <Trash2 size={15} /> Destructive
                  </Button>
                  <Button variant="muted">
                    Muted
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sizes</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs" variant="primary">Tiny (xs)</Button>
                  <Button size="sm" variant="primary">Small (sm)</Button>
                  <Button size="default" variant="primary">Default (h-9)</Button>
                  <Button size="lg" variant="primary">Large (h-11)</Button>
                  <Button size="icon" variant="outline" aria-label="Icon button">
                    <Search size={15} />
                  </Button>
                  <Button size="icon-sm" variant="primary" aria-label="Small icon button">
                    <Plus size={13} />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Interactive States</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button isLoading variant="primary">
                    Submitting FDR…
                  </Button>
                  <Button disabled variant="primary">
                    Disabled Primary
                  </Button>
                  <Button disabled variant="outline">
                    Disabled Outline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges & Status Indicators</CardTitle>
              <CardDescription>Multi-purpose contextual tags with optional status dots</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Core Badges</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" dot>Default Orange</Badge>
                  <Badge variant="primary">Solid Primary</Badge>
                  <Badge variant="secondary">Secondary Slate</Badge>
                  <Badge variant="success" dot>Success Verified</Badge>
                  <Badge variant="warning" dot>Warning Review</Badge>
                  <Badge variant="error" dot>Error Rejected</Badge>
                  <Badge variant="info" dot>Information</Badge>
                  <Badge variant="purple" dot>Renewal Pending</Badge>
                  <Badge variant="outline">Outlined Tag</Badge>
                  <Badge variant="muted">Muted Archive</Badge>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Domain FDR Lifecycle Status Badges
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      "draft",
                      "submitted",
                      "under_review",
                      "verified",
                      "active",
                      "matured",
                      "renewal_pending",
                      "renewal_approved",
                      "release_pending",
                      "release_approved",
                      "released",
                      "rejected",
                    ] as FDRStatus[]
                  ).map((st) => (
                    <FDRStatusBadge key={st} status={st} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: FORM CONTROLS ─────────────────────────────────── */}
      {activeTab === "forms" && (
        <div className="space-y-8 animate-slide-up">
          <Card>
            <CardHeader>
              <CardTitle>Form Inputs & Controls</CardTitle>
              <CardDescription>Validated input fields, selects, checkboxes, and toggles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Input
                  label="FDR Number"
                  placeholder="e.g. FDR-2026-98124"
                  required
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  hint="Permanent alphanumeric receipt identifier"
                />

                <Input
                  label="Search Depositor"
                  placeholder="Company name or PAN…"
                  leadingIcon={<Search size={15} />}
                  trailingIcon={<span className="text-[10px] text-slate-400 font-mono">ESC</span>}
                />

                <Input
                  label="Verified Amount (INR)"
                  placeholder="₹ 50,00,000"
                  defaultValue="₹ 25,00,000"
                  isValid
                  hint="Verified by core banking API"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Input
                  label="Invalid Field Demo"
                  placeholder="Enter email..."
                  defaultValue="invalid_bank_code"
                  error="The specified IFSC code does not match any recognized bank branch"
                />

                <Select
                  label="Issuing Bank"
                  required
                  defaultValue="sbi"
                  options={[
                    { value: "sbi", label: "State Bank of India" },
                    { value: "hdfc", label: "HDFC Bank Ltd" },
                    { value: "pnb", label: "Punjab National Bank" },
                    { value: "icici", label: "ICICI Bank Ltd" },
                  ]}
                  hint="Select authorized scheduled bank"
                />

                <Select
                  label="Deposit Category"
                  placeholder="Select deposit type..."
                  options={[
                    { value: "em", label: "Earnest Money Deposit (EMD)" },
                    { value: "psd", label: "Performance Security Deposit" },
                    { value: "sd", label: "Security Deposit (Tender)" },
                  ]}
                />
              </div>

              <Textarea
                label="Remarks & Audit Justification"
                placeholder="Provide reasoning for manual verification or renewal override..."
                defaultValue="Verified against Physical FDR original submitted at Chief Engineer Office on 24-Oct-2026."
                hint="Max 500 characters"
              />

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checkboxes</p>
                  <Checkbox
                    id="chk-terms"
                    label="Bank Auto-Verification Guarantee"
                    description="Allow automated daily status sync via SFTP/API with issuing bank."
                    checked={checkboxChecked}
                    onCheckedChange={(c) => setCheckboxChecked(!!c)}
                  />
                  <Checkbox
                    id="chk-notify"
                    label="Maturity Alert Escalation"
                    description="Send SMS & Email notifications 45, 30, and 15 days before maturity date."
                    defaultChecked
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Switches</p>
                  <Switch
                    id="sw-sms"
                    label="Auto-Renewal Request Trigger"
                    description="Automatically flag FDR for renewal review 30 days prior to expiry."
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                  />
                  <Switch
                    id="sw-strict"
                    label="Strict Multi-Signature Approval"
                    description="Require both Accounts Officer and Executive Engineer signatures before release."
                    defaultChecked
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: DATA & TABLES ─────────────────────────────────── */}
      {activeTab === "data" && (
        <div className="space-y-8 animate-slide-up">
          {/* Stat Cards Demo */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Fintech Stat Cards</h2>
                <p className="text-xs text-slate-500">
                  Key metric containers with Lucide icons, trend badges, and orange highlights.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total FDR Value"
                value="₹ 14.82 Cr"
                subtitle="142 Active Receipts"
                icon={<FileText size={18} />}
                iconColor="orange"
                trend={{ value: 12.4, label: "vs last quarter", direction: "up" }}
              />
              <StatCard
                title="Security Deposits"
                value="₹ 6.45 Cr"
                subtitle="89 Ongoing Tenders"
                icon={<Shield size={18} />}
                iconColor="blue"
                trend={{ value: 4.2, label: "vs last month", direction: "up" }}
              />
              <StatCard
                title="Maturing in 30 Days"
                value="18 Deposits"
                subtitle="Value: ₹ 1.25 Cr"
                icon={<Clock size={18} />}
                iconColor="amber"
                trend={{ value: 2.1, label: "require action", direction: "flat" }}
              />
              <StatCard
                title="Pending Actions"
                value="7 Requests"
                subtitle="3 Release, 4 Renewals"
                icon={<AlertTriangle size={18} />}
                iconColor="red"
                trend={{ value: 15.0, label: "from yesterday", direction: "down" }}
              />
            </div>
          </div>

          {/* DataTable Demo */}
          <Card noPadding>
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
              <div>
                <CardTitle>Reconciliation Matrix (DataTable)</CardTitle>
                <CardDescription>Clean table with sortable headers, status badges, and action dropdowns</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTableLoading(!tableLoading)}
                >
                  {tableLoading ? "Show Data" : "Test Loading State"}
                </Button>
                <ActionDropdown
                  trigger={
                    <Button size="sm" variant="outline">
                      <MoreVertical size={14} /> Actions
                    </Button>
                  }
                  items={[
                    { label: "Export to Excel", icon: <Download size={14} />, onClick: () => alert("Export initiated") },
                    { label: "Batch Verification", icon: <CheckCircle2 size={14} />, onClick: () => alert("Batch verify") },
                    "separator",
                    { label: "Archive Selected", icon: <Trash2 size={14} />, destructive: true, onClick: () => alert("Archive") },
                  ]}
                />
              </div>
            </div>

            <DataTable
              keyField="id"
              isLoading={tableLoading}
              columns={[
                {
                  key: "id",
                  header: "FDR Number",
                  sortable: true,
                  cell: (row) => (
                    <div className="font-mono font-medium text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      {String(row.id)}
                    </div>
                  ),
                },
                {
                  key: "depositor",
                  header: "Depositor / Contractor",
                  sortable: true,
                  cell: (row) => (
                    <span className="font-medium text-slate-800">{String(row.depositor)}</span>
                  ),
                },
                {
                  key: "bank",
                  header: "Issuing Bank",
                  cell: (row) => <span className="text-slate-600">{String(row.bank)}</span>,
                },
                {
                  key: "amount",
                  header: "Deposit Value",
                  align: "right",
                  sortable: true,
                  cell: (row) => (
                    <span className="font-semibold text-slate-900 font-mono">{String(row.amount)}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => <FDRStatusBadge status={row.status as FDRStatus} />,
                },
                {
                  key: "maturity",
                  header: "Maturity",
                  cell: (row) => <span className="text-xs text-slate-500">{String(row.maturity)}</span>,
                },
                {
                  key: "actions",
                  header: "",
                  align: "right",
                  cell: () => (
                    <ActionDropdown
                      trigger={
                        <button className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                          <MoreVertical size={14} />
                        </button>
                      }
                      items={[
                        { label: "View Details", icon: <Eye size={13} />, onClick: () => {} },
                        { label: "Edit Record", icon: <Edit size={13} />, onClick: () => {} },
                        "separator",
                        { label: "Revoke / Reject", icon: <Trash2 size={13} />, destructive: true, onClick: () => {} },
                      ]}
                    />
                  ),
                },
              ]}
              data={sampleData}
            />

            <TablePagination
              page={tablePage}
              totalPages={3}
              total={15}
              limit={5}
              onPageChange={setTablePage}
            />
          </Card>
        </div>
      )}

      {/* ─── TAB 5: FEEDBACK & STATES ─────────────────────────────── */}
      {activeTab === "feedback" && (
        <div className="space-y-8 animate-slide-up">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Callouts</CardTitle>
              <CardDescription>System notifications for success, warnings, errors, and announcements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert
                variant="warning"
                title="18 FDRs Approaching Maturity"
                onDismiss={() => {}}
              >
                Immediate action is required. Fixed Deposit Receipts valued at ₹ 1,25,00,000 will expire within the next 30 days. Contact the depositors for renewal or initiate discharge release.
              </Alert>

              <Alert
                variant="success"
                title="Bank Reconciliation Synchronized"
                onDismiss={() => {}}
              >
                SBI Core Banking SFTP connection established. 142 deposit records verified against live branch ledgers.
              </Alert>

              <Alert
                variant="error"
                title="Failed Signature Verification"
                onDismiss={() => {}}
              >
                The digital signature token on FDR-2026-089 was issued by an unrecognized certifying authority. The deposit has been placed on hold.
              </Alert>

              <Alert
                variant="info"
                title="Scheduled Maintenance Notice"
                onDismiss={() => {}}
              >
                The Public Financial Management System (PFMS) gateway will undergo scheduled maintenance on Sunday between 02:00 AM and 05:00 AM IST.
              </Alert>
            </CardContent>
          </Card>

          {/* Skeletons & Loaders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loaders</CardTitle>
                <CardDescription>Restrained shimmer states preventing layout shift</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SkeletonCard rows={2} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Empty State Pattern</CardTitle>
                <CardDescription>Clear guidance when no records match criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  compact
                  icon={<FileText size={24} />}
                  title="No Pending Release Requests"
                  description="All deposit discharge applications have been reviewed and approved."
                  action={
                    <Button size="sm" variant="outline-primary">
                      <Plus size={14} /> Submit New Request
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── INTERACTIVE MODALS ────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="FDR Verification Details"
        description="Verify deposit certificate directly against issuing branch records"
        size="default"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Approve & Verify
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1 text-sm">
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-900 space-y-1">
            <p className="font-semibold">Security Deposit: Tender #NIT-2026-CE-09</p>
            <p className="text-orange-800">State Bank of India — Parliament Street Branch, New Delhi</p>
          </div>
          <Input label="Receipt Verification Code" placeholder="Enter bank token or code..." defaultValue="SBI-VRF-8829-X" />
          <Select
            label="Verification Outcome"
            defaultValue="valid"
            options={[
              { value: "valid", label: "Confirmed Valid — Active Lien Marked" },
              { value: "mismatch", label: "Value / Maturity Mismatch" },
              { value: "no_lien", label: "Branch Failed to Mark Lien" },
            ]}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          alert("Action confirmed successfully!");
        }}
        title="Release Security Deposit?"
        message="Are you sure you want to approve the release of FDR #FDR-2026-001 valued at ₹45,00,000 to L&T Infrastructure Ltd? This action removes the lien and cannot be undone."
        confirmLabel="Confirm Release"
        variant="primary"
      />
    </div>
  );
}
