import { useState } from "react";
import {
  ShieldCheck,
  Clock,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function FDRDash() {
  const [activeTab, setActiveTab] = useState<"all" | "active" | "expiring">("all");

  const previewRecords = [
    {
      id: "FDR/AICTE/2026/089",
      institution: "Delhi Technological University (DTU)",
      bank: "State Bank of India",
      amount: "₹ 50,00,000",
      status: "active",
      lienStatus: "Confirmed in CBS",
      daysLeft: 184,
    },
    {
      id: "FDR/AICTE/2026/042",
      institution: "BITS Pilani — Goa Campus",
      bank: "HDFC Bank Ltd",
      amount: "₹ 1,00,00,000",
      status: "expiring",
      lienStatus: "Notice Dispatched",
      daysLeft: 12,
    },
    {
      id: "FDR/AICTE/2026/115",
      institution: "PSG College of Technology, Coimbatore",
      bank: "Punjab National Bank",
      amount: "₹ 75,00,000",
      status: "active",
      lienStatus: "Verified Branch Lien",
      daysLeft: 310,
    },
    {
      id: "FDR/AICTE/2026/077",
      institution: "Manipal Institute of Technology",
      bank: "Bank of Baroda",
      amount: "₹ 35,00,000",
      status: "active",
      lienStatus: "Confirmed in CBS",
      daysLeft: 94,
    },
  ];

  const filtered = previewRecords.filter((rec) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return rec.status === "active";
    if (activeTab === "expiring") return rec.status === "expiring";
    return true;
  });

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden text-left font-sans text-slate-800 transition-all hover:shadow-2xl">
      {/* Mock Window Top Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500 inline-block animate-pulse" />
              FDR-SMART
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              portal.aicte-india.org/fdr
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
            <ShieldCheck size={11} className="text-green-400" />
            14 Scheduled Banks Connected
          </span>
          <span className="text-[11px] text-orange-400 font-mono bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
            AICTE Regulation Bureau
          </span>
        </div>
      </div>

      {/* Internal Mini Header */}
      <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-900 font-plus-jakarta tracking-tight">
              AICTE Institutional Security Deposit Registry
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time monitoring of Fixed Deposit Receipts submitted by approved technical institutes.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === "all"
                  ? "bg-orange-500 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Records (4)
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === "active"
                  ? "bg-orange-500 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Liens (3)
            </button>
            <button
              onClick={() => setActiveTab("expiring")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === "expiring"
                  ? "bg-orange-500 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Maturing Soon (1)
            </button>
          </div>
        </div>

        {/* Synthetic Data Disclaimer Banner */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
            <span>Synthetic Demonstration Data · Prototype Environment (Not live AICTE statistics)</span>
          </div>
          <span className="text-[10px] text-amber-700/80 font-mono">SIH 26265 DEMO</span>
        </div>

        {/* 5 Required Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 pt-3 border-t border-slate-200/60">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Instruments</p>
            <p className="text-base font-bold text-slate-900 font-plus-jakarta mt-0.5">1,420</p>
            <span className="text-[10px] text-slate-500 font-medium">Across all zones</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Deposit Value</p>
            <p className="text-base font-bold text-slate-900 font-plus-jakarta mt-0.5">₹ 842.50 Cr</p>
            <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
              <TrendingUp size={10} /> 100% lien custody
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Instruments</p>
            <p className="text-base font-bold text-slate-900 font-plus-jakarta mt-0.5">1,185</p>
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5">
              <ShieldCheck size={10} /> Active bank lien
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Upcoming Maturities</p>
            <p className="text-base font-bold text-orange-600 font-plus-jakarta mt-0.5">64</p>
            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
              <Clock size={10} /> Within 60 days
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Pending Scrutiny</p>
            <p className="text-base font-bold text-purple-600 font-plus-jakarta mt-0.5">38</p>
            <span className="text-[10px] text-purple-700 font-medium">
              Awaiting officer review
            </span>
          </div>
        </div>
      </div>

      {/* Mini Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 text-left">FDR Certificate #</th>
              <th className="py-2.5 px-4 text-left">Institution Name</th>
              <th className="py-2.5 px-4 text-left">Issuing Bank</th>
              <th className="py-2.5 px-4 text-right">Lien Amount</th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <span>{item.id}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {item.institution}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {item.bank}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  {item.amount}
                </td>
                <td className="py-3 px-4 text-center">
                  {item.status === "expiring" ? (
                    <Badge variant="error" dot>
                      Expires in {item.daysLeft}d
                    </Badge>
                  ) : (
                    <Badge variant="success" dot>
                      Active & Liened
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px]">Simulated live AICTE Administrative Workbench</span>
        <span className="text-orange-600 font-semibold flex items-center gap-1 text-[11px]">
          Encrypted Central Ledger
          <ArrowUpRight size={12} />
        </span>
      </div>
    </div>
  );
}
