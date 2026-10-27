import { useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  KeyRound,
  CheckCircle2,
  Building2,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/FormFields";
import { Dialog } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";

interface SystemUserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  institutionName?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
  lastLogin: string;
}

const INITIAL_USERS: SystemUserItem[] = [
  {
    id: "usr-001",
    name: "Prof. S. K. Mahajan",
    email: "inst-rep@dtu.ac.in",
    role: "institution_representative",
    designation: "Registrar & Authorized Signatory",
    institutionName: "Delhi Technological University (DTU)",
    status: "ACTIVE",
    lastLogin: "2026-10-27 20:15 UTC",
  },
  {
    id: "usr-002",
    name: "Dr. K. Prakasan",
    email: "principal@psgtech.edu",
    role: "institution_representative",
    designation: "Principal",
    institutionName: "PSG College of Technology, Coimbatore",
    status: "ACTIVE",
    lastLogin: "2026-10-26 14:30 UTC",
  },
  {
    id: "usr-003",
    name: "Anil Verma",
    email: "scrutiny@aicte.gov.in",
    role: "scrutiny_officer",
    designation: "Senior Scrutiny Officer (Regulation Bureau)",
    status: "ACTIVE",
    lastLogin: "2026-10-27 19:45 UTC",
  },
  {
    id: "usr-004",
    name: "Sunita Rao",
    email: "s.rao@aicte.gov.in",
    role: "scrutiny_officer",
    designation: "Legal & Regulatory Compliance Analyst",
    status: "ACTIVE",
    lastLogin: "2026-10-25 11:20 UTC",
  },
  {
    id: "usr-005",
    name: "Dr. Rajesh Sharma",
    email: "approver@aicte.gov.in",
    role: "approving_authority",
    designation: "Member Secretary & Approving Authority",
    status: "ACTIVE",
    lastLogin: "2026-10-27 18:00 UTC",
  },
  {
    id: "usr-006",
    name: "Prajwal Kate",
    email: "admin@aicte.gov.in",
    role: "admin",
    designation: "AICTE Portal Administrator & IT Lead",
    status: "ACTIVE",
    lastLogin: "2026-10-27 21:05 UTC",
  },
];

export default function UserManagementPage() {
  const { user: currentUser, switchRole } = useAuth();
  const [usersList, setUsersList] = useState<SystemUserItem[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New User Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("institution_representative");
  const [newDesignation, setNewDesignation] = useState("");
  const [newInstitution, setNewInstitution] = useState("Delhi Technological University (DTU)");

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.institutionName && u.institutionName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    const created: SystemUserItem = {
      id: `usr-${String(usersList.length + 1).padStart(3, "0")}`,
      name: newName,
      email: newEmail,
      role: newRole,
      designation: newDesignation || "Designated Officer",
      institutionName: newRole === "institution_representative" ? newInstitution : undefined,
      status: "ACTIVE",
      lastLogin: "Never",
    };

    setUsersList([created, ...usersList]);
    setCreateModalOpen(false);
    setSuccessMessage(`Account for ${newName} created with role ${newRole}.`);
    setTimeout(() => setSuccessMessage(null), 4000);

    // Reset Form
    setNewName("");
    setNewEmail("");
    setNewDesignation("");
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "institution_representative":
      case "depositor":
        return <Badge variant="warning">Institution Rep</Badge>;
      case "scrutiny_officer":
      case "officer":
      case "verifier":
        return <Badge variant="info">Scrutiny Officer</Badge>;
      case "approving_authority":
        return <Badge variant="success">Approving Authority</Badge>;
      case "admin":
      default:
        return <Badge variant="muted">System Admin</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="User & Access Governance"
        description="Administer institutional delegates, regulatory scrutiny officers, approving authorities, and RBAC security credentials."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <UserPlus size={15} /> Add System User
          </Button>
        }
      />

      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {/* Role Breakdown Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Institution Representatives", count: usersList.filter((u) => u.role === "institution_representative").length, color: "border-amber-300 bg-amber-50/40 text-amber-900" },
          { label: "Scrutiny Officers", count: usersList.filter((u) => u.role === "scrutiny_officer").length, color: "border-blue-300 bg-blue-50/40 text-blue-900" },
          { label: "Approving Authorities", count: usersList.filter((u) => u.role === "approving_authority").length, color: "border-emerald-300 bg-emerald-50/40 text-emerald-900" },
          { label: "System Administrators", count: usersList.filter((u) => u.role === "admin").length, color: "border-slate-300 bg-slate-50 text-slate-900" },
        ].map((item, i) => (
          <div key={i} className={`p-4 rounded-xl border ${item.color} flex items-center justify-between shadow-xs`}>
            <div>
              <p className="text-xs font-semibold">{item.label}</p>
              <p className="text-2xl font-extrabold font-plus-jakarta mt-1">{item.count}</p>
            </div>
            <Users size={22} className="opacity-60" />
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name, email address, or affiliated institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Authority Roles" },
                  { value: "institution_representative", label: "Institution Reps" },
                  { value: "scrutiny_officer", label: "Scrutiny Officers" },
                  { value: "approving_authority", label: "Approving Authorities" },
                  { value: "admin", label: "System Administrators" },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 font-plus-jakarta flex items-center gap-2">
              <Shield size={16} className="text-orange-600" />
              <span>Active Authority Accounts ({filteredUsers.length})</span>
            </CardTitle>
            <p className="text-xs text-slate-400">
              Users granted access according to the AICTE Regulation Bureau security policy.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">User Particulars</th>
                <th className="py-3 px-4">Role & Privilege</th>
                <th className="py-3 px-4">Affiliated Entity / Cell</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Demo Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map((u) => {
                const isCurrent = currentUser?.email === u.email;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 font-mono text-[11px]">
                          {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            {u.name}
                            {isCurrent && (
                              <span className="text-[9px] bg-orange-100 text-orange-700 font-mono px-1.5 py-0.2 rounded font-bold">
                                YOU
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getRoleBadge(u.role)}
                      <p className="text-[10px] text-slate-500 mt-1">{u.designation}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.institutionName ? (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium max-w-[220px]">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate" title={u.institutionName}>{u.institutionName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">AICTE Central Bureau</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {u.lastLogin}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isCurrent && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            switchRole(u.role);
                            setSuccessMessage(`Switched active session to ${u.name} (${u.role}).`);
                            setTimeout(() => setSuccessMessage(null), 3000);
                          }}
                        >
                          <RefreshCw size={12} /> Switch Persona
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Regulatory Authority User"
        description="Grant portal access according to AICTE Regulation Bureau security guidelines."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateUser}>
              <UserPlus size={14} /> Create Account
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
          <Input
            label="Full Name"
            placeholder="e.g. Dr. Ramesh Kumar"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            label="Official Email Address"
            type="email"
            placeholder="e.g. ramesh.kumar@aicte.gov.in"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Designated Authority Role
            </label>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              options={[
                { value: "institution_representative", label: "Institution Representative (College Delegate)" },
                { value: "scrutiny_officer", label: "Scrutiny Officer (Regulation Bureau)" },
                { value: "approving_authority", label: "Approving Authority (Member Secretary)" },
                { value: "admin", label: "System Administrator (IT Governance)" },
              ]}
            />
          </div>
          <Input
            label="Designation / Official Post"
            placeholder="e.g. Principal / Senior Scrutiny Analyst"
            value={newDesignation}
            onChange={(e) => setNewDesignation(e.target.value)}
          />
          {newRole === "institution_representative" && (
            <Input
              label="Affiliated Approved Institution"
              placeholder="e.g. Delhi Technological University"
              value={newInstitution}
              onChange={(e) => setNewInstitution(e.target.value)}
            />
          )}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <KeyRound size={12} className="text-orange-500" />
              Default Temporary Security Passcode:
            </p>
            <p className="font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-900 inline-block font-bold">
              DemoPass@2026
            </p>
            <p className="text-[10px] text-slate-400">
              User will be prompted to reset their password upon initial authentication.
            </p>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
