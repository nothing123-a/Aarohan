import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowLeft, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/shared";
import { AuthorityStatCards } from "@/components/shared/AuthorityStatCards";

export interface ScrutinyOfficerProfile {
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  activeQueueCount: number;
  completedCount: number;
  discrepanciesFlagged: number;
  avgTurnaroundDays: number;
  ocrAccuracyRate: number;
  status: "ACTIVE" | "ON_LEAVE" | "REVIEW_REQUIRED";
  assignedInstitutions: string[];
}

export const INITIAL_SCRUTINY_OFFICERS: ScrutinyOfficerProfile[] = [
  {
    id: "usr-so-01",
    name: "Rajesh Kumar",
    designation: "Senior Scrutiny Officer (Banking Cell)",
    email: "rajesh.kumar@aicte.gov.in",
    phone: "+91 98112 34567",
    activeQueueCount: 4,
    completedCount: 42,
    discrepanciesFlagged: 6,
    avgTurnaroundDays: 1.2,
    ocrAccuracyRate: 99.4,
    status: "ACTIVE",
    assignedInstitutions: ["Delhi Technological University", "IIT Delhi"],
  },
  {
    id: "usr-so-02",
    name: "Neha Sharma",
    designation: "Scrutiny Officer (Technical Audits)",
    email: "neha.sharma@aicte.gov.in",
    phone: "+91 98223 45678",
    activeQueueCount: 3,
    completedCount: 38,
    discrepanciesFlagged: 4,
    avgTurnaroundDays: 1.5,
    ocrAccuracyRate: 98.8,
    status: "ACTIVE",
    assignedInstitutions: ["BITS Pilani - Goa", "MIT Manipal"],
  },
  {
    id: "usr-so-03",
    name: "Amit Verma",
    designation: "Verification Associate (CBS/SFMS)",
    email: "amit.verma@aicte.gov.in",
    phone: "+91 98334 56789",
    activeQueueCount: 5,
    completedCount: 29,
    discrepanciesFlagged: 8,
    avgTurnaroundDays: 1.8,
    ocrAccuracyRate: 97.5,
    status: "ACTIVE",
    assignedInstitutions: ["Netaji Subhas Univ of Tech", "Anna University"],
  },
  {
    id: "usr-so-04",
    name: "Priya Patel",
    designation: "Scrutiny Officer (Legal & Lien)",
    email: "priya.patel@aicte.gov.in",
    phone: "+91 98445 67890",
    activeQueueCount: 2,
    completedCount: 51,
    discrepanciesFlagged: 3,
    avgTurnaroundDays: 0.9,
    ocrAccuracyRate: 99.8,
    status: "ACTIVE",
    assignedInstitutions: ["Jadavpur University", "VIT Vellore"],
  },
];

export default function OfficerSupervisionPage() {
  const [officers, setOfficers] = useState<ScrutinyOfficerProfile[]>(INITIAL_SCRUTINY_OFFICERS);
  const [selectedOfficer, setSelectedOfficer] = useState<ScrutinyOfficerProfile | null>(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [newInstitutionInput, setNewInstitutionInput] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const handleAddInstitutionAssignment = () => {
    if (!selectedOfficer || !newInstitutionInput.trim()) return;
    setOfficers((prev) =>
      prev.map((o) =>
        o.id === selectedOfficer.id
          ? {
              ...o,
              assignedInstitutions: [...o.assignedInstitutions, newInstitutionInput.trim()],
              activeQueueCount: o.activeQueueCount + 1,
            }
          : o
      )
    );
    setFeedbackSuccess(`Assigned ${newInstitutionInput.trim()} to Scrutiny Officer ${selectedOfficer.name}.`);
    setNewInstitutionInput("");
    setReassignModalOpen(false);
    setTimeout(() => setFeedbackSuccess(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="p-0 h-auto text-slate-500 hover:text-slate-800">
              <Link to="/dashboard" className="flex items-center gap-1 text-xs">
                <ArrowLeft size={13} /> Back to Dashboard
              </Link>
            </Button>
          </div>
          <PageHeader
            title="Scrutiny Officers Oversight & Workload Allocation"
            description={`Supervising ${officers.length} active regulatory scrutiny officers across banking and technical verification cells.`}
          />
        </div>
      </div>

      {feedbackSuccess && <Alert variant="success">{feedbackSuccess}</Alert>}

      {/* ─── 4 CORE STAT CARDS ─────────────────────────────────────────── */}
      <AuthorityStatCards activeSection="officers" />

      {/* Officers Summary Banner */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Scrutiny Team Oversight & Workload Allocation</h3>
            <p className="text-xs text-slate-500">
              Supervising {officers.length} active regulatory scrutiny officers across banking and technical verification cells.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-blue-900 bg-blue-100 border border-blue-200 px-3 py-1 rounded-full font-mono">
          Total Queue: {officers.reduce((a, o) => a + o.activeQueueCount, 0)} Dossiers
        </span>
      </div>

      {/* Officers Performance & Queue Table */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              Scrutiny Officers Roster & Quality Telemetry
            </CardTitle>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 px-2.5 py-1 rounded-full w-fit">
              {officers.length} Active Officers
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">Officer Details</th>
                  <th className="px-4 py-3.5">Assigned Institutions</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">Active Queue</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">Completed Scrutinies</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">Discrepancies Flagged</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">Avg Turnaround</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">OCR Accuracy</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center">Status</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right">Supervisory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((officer) => (
                  <tr key={officer.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-900 text-sm">{officer.name}</p>
                      <p className="text-[11px] text-slate-500">{officer.designation}</p>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">{officer.email}</p>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {officer.assignedInstitutions.map((inst, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-xs">
                        {officer.activeQueueCount} Dossiers
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="font-bold text-emerald-700 text-xs">{officer.completedCount} Passed</span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="font-bold text-rose-600 text-xs">{officer.discrepanciesFlagged} Cases</span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap text-slate-700 font-medium text-xs">
                      {officer.avgTurnaroundDays} days
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        {officer.ocrAccuracyRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap h-8 px-3 text-xs font-semibold border-slate-200 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/40"
                        onClick={() => {
                          setSelectedOfficer(officer);
                          setReassignModalOpen(true);
                        }}
                      >
                        Assign Institution
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: ASSIGN INSTITUTION TO SCRUTINY OFFICER */}
      <Dialog
        open={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title={selectedOfficer ? `Assign College to ${selectedOfficer.name}` : "Assign Institution"}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Allocate a newly registered technical college or university to this scrutiny officer. The officer will
            receive automatic notifications when new FDRs are submitted.
          </p>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Institution Name</label>
            <Input
              value={newInstitutionInput}
              onChange={(e) => setNewInstitutionInput(e.target.value)}
              placeholder="e.g. National Institute of Technology, Trichy"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAddInstitutionAssignment}
            >
              <Plus size={14} className="mr-1" /> Confirm Allocation
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

