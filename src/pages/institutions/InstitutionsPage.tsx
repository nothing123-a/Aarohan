import { useState } from "react";
import {
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Search,
  Building,
} from "lucide-react";
import {
  Button,
  Card,
  StatCard,
  Badge,
  Input,
  Dialog,
  DataTable,
  TablePagination,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";

interface BankInstitution {
  id: string;
  name: string;
  category: "public_sector" | "private_scheduled" | "cooperative";
  rbiCode: string;
  nodalOfficer: string;
  nodalContact: string;
  integrationMode: "core_api" | "sftp_automated" | "manual_portal";
  activeDepositsValue: string;
  status: "active" | "under_review";
}

export default function InstitutionsPage() {
  const [addModal, setAddModal] = useState(false);
  const [search, setSearch] = useState("");

  const institutions: BankInstitution[] = [
    {
      id: "inst-01",
      name: "State Bank of India",
      category: "public_sector",
      rbiCode: "SBIN0000001",
      nodalOfficer: "Rameshwar Dayal (DGM)",
      nodalContact: "nodal.sbi@garudanetra.gov.in",
      integrationMode: "core_api",
      activeDepositsValue: "₹ 6.80 Cr (64 FDRs)",
      status: "active",
    },
    {
      id: "inst-02",
      name: "HDFC Bank Ltd",
      category: "private_scheduled",
      rbiCode: "HDFC0000001",
      nodalOfficer: "Priya Sundaram (VP Govt Banking)",
      nodalContact: "govt.hdfc@garudanetra.gov.in",
      integrationMode: "core_api",
      activeDepositsValue: "₹ 3.40 Cr (32 FDRs)",
      status: "active",
    },
    {
      id: "inst-03",
      name: "Punjab National Bank",
      category: "public_sector",
      rbiCode: "PUNB0000001",
      nodalOfficer: "K. C. Srivastava (AGM)",
      nodalContact: "pnb.lien@garudanetra.gov.in",
      integrationMode: "sftp_automated",
      activeDepositsValue: "₹ 2.25 Cr (24 FDRs)",
      status: "active",
    },
    {
      id: "inst-04",
      name: "Bank of Baroda",
      category: "public_sector",
      rbiCode: "BARB0000001",
      nodalOfficer: "Amit Saxena (Chief Manager)",
      nodalContact: "bob.nodal@garudanetra.gov.in",
      integrationMode: "sftp_automated",
      activeDepositsValue: "₹ 1.35 Cr (14 FDRs)",
      status: "active",
    },
    {
      id: "inst-05",
      name: "ICICI Bank Ltd",
      category: "private_scheduled",
      rbiCode: "ICIC0000001",
      nodalOfficer: "Deepak Mehra (Head PSBD)",
      nodalContact: "govt.icici@garudanetra.gov.in",
      integrationMode: "manual_portal",
      activeDepositsValue: "₹ 1.02 Cr (8 FDRs)",
      status: "active",
    },
  ];

  const filtered = institutions.filter(
    (inst) =>
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.nodalOfficer.toLowerCase().includes(search.toLowerCase()) ||
      inst.rbiCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Institution & Bank Management"
        description="Authorized scheduled commercial banks, RBI IFSC registries, and core banking liaison officer credentials."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Institution Management" },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddModal(true)}>
            <Plus size={15} />
            Register New Financial Institution
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Authorized Banks"
          value="14 Scheduled"
          subtitle="All RBI empanelled"
          icon={<Building2 size={18} />}
          iconColor="orange"
        />
        <StatCard
          title="Direct API Sync"
          value="6 Banks"
          subtitle="Real-time lien verification"
          icon={<CheckCircle2 size={18} />}
          iconColor="green"
        />
        <StatCard
          title="SFTP Batch Automation"
          value="5 Banks"
          subtitle="Daily midnight ledger sync"
          icon={<Building size={18} />}
          iconColor="blue"
        />
        <StatCard
          title="Nodal Liaisons"
          value="28 Officers"
          subtitle="Escalation contact active"
          icon={<ShieldCheck size={18} />}
          iconColor="purple"
        />
      </div>

      {/* Institutions Table */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bank name, nodal officer, or IFSC code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-md border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>
          <span className="text-xs text-slate-400">
            Showing <strong className="text-slate-700">{filtered.length}</strong> empanelled banks
          </span>
        </div>

        <DataTable<BankInstitution>
          keyField="id"
          columns={[
            {
              key: "name",
              header: "Institution Name",
              sortable: true,
              cell: (row) => (
                <div>
                  <span className="font-semibold text-xs text-slate-900">{row.name}</span>
                  <p className="text-[11px] text-slate-400 font-mono">RBI: {row.rbiCode}</p>
                </div>
              ),
            },
            {
              key: "category",
              header: "Category",
              cell: (row) => {
                if (row.category === "public_sector") {
                  return <Badge variant="default">Public Sector (PSB)</Badge>;
                }
                return <Badge variant="secondary">Private Scheduled</Badge>;
              },
            },
            {
              key: "nodalOfficer",
              header: "Nodal Liaison Officer",
              cell: (row) => (
                <div>
                  <p className="text-xs font-medium text-slate-800">{row.nodalOfficer}</p>
                  <p className="text-[11px] text-slate-400">{row.nodalContact}</p>
                </div>
              ),
            },
            {
              key: "integrationMode",
              header: "Integration Mode",
              cell: (row) => {
                if (row.integrationMode === "core_api") {
                  return <Badge variant="success" dot>Live Core API</Badge>;
                }
                if (row.integrationMode === "sftp_automated") {
                  return <Badge variant="info" dot>SFTP Daily Batch</Badge>;
                }
                return <Badge variant="warning" dot>Portal Endorsement</Badge>;
              },
            },
            {
              key: "activeDepositsValue",
              header: "Total Deposits Held",
              align: "right",
              cell: (row) => (
                <span className="font-mono text-xs font-semibold text-slate-900">
                  {row.activeDepositsValue}
                </span>
              ),
            },
            {
              key: "actions",
              header: "Action",
              align: "right",
              cell: () => (
                <Button size="xs" variant="outline">
                  Configure
                </Button>
              ),
            },
          ]}
          data={filtered}
        />
        <TablePagination
          page={1}
          totalPages={1}
          total={filtered.length}
          limit={10}
          onPageChange={() => {}}
        />
      </Card>

      {/* Add Institution Modal */}
      <Dialog
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Register Authorized Scheduled Bank"
        description="Add a new banking institution to the Garuda Netra government lien registry"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setAddModal(false)}>
              Save Institution
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 text-xs">
          <Input label="Financial Institution Name" placeholder="e.g. Canara Bank" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="RBI Primary Code / IFSC Prefix" placeholder="e.g. CNRB0000001" />
            <Input label="Empanelment Notification Ref" placeholder="e.g. FIN/2026/EM-04" />
          </div>
          <Input label="Nodal Officer Full Name" placeholder="e.g. Sanjeev Kumar (AGM)" />
          <Input label="Official Nodal Email Address" placeholder="e.g. nodal.canara@bank.co.in" />
        </div>
      </Dialog>
    </div>
  );
}
