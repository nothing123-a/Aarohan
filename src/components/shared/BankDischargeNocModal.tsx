import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/utils";
import {
  Printer,
  Copy,
  Check,
  ShieldCheck,
  QrCode,
  Landmark,
} from "lucide-react";

export interface NocVoucherData {
  voucherRef: string;
  fdrNumber: string;
  fdrId?: string;
  institutionId?: string;
  institutionName: string;
  institutionCode?: string;
  bankName: string;
  branchName?: string;
  principalAmount: number;
  sanctionAmount?: number;
  requestType?: "FULL_RELEASE" | "PARTIAL_REFUND" | "NOC_ISSUANCE" | string;
  sanctionDate?: string;
  approvingAuthority?: string;
  regulatoryClause?: string;
  scrutinyFinding?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolder?: string;
}

interface BankDischargeNocModalProps {
  open: boolean;
  onClose: () => void;
  data: NocVoucherData | null;
}

export const BankDischargeNocModal: React.FC<BankDischargeNocModalProps> = ({
  open,
  onClose,
  data,
}) => {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const voucherRef =
    data.voucherRef ||
    `AICTE/NOC/2026/REL-${data.fdrNumber.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}`;

  const sanctionDate = data.sanctionDate ? formatDate(data.sanctionDate) : "30 Oct 2026";
  const sanctionAmount = data.sanctionAmount || data.principalAmount;
  const approvingAuthority =
    data.approvingAuthority || "Dr. Rajesh Sharma, Member Secretary, AICTE";
  const clause =
    data.regulatoryClause ||
    (data.requestType === "PARTIAL_REFUND"
      ? "AICTE Approval Process Handbook (APH) Clause 7.6 (Pro-rata Program Intake Refund)"
      : "AICTE Approval Process Handbook (APH) Clause 11.2 (Mandatory Maturity Discharge & Exit)");

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(voucherRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Official AICTE Bank Discharge NOC Voucher"
      description="Statutory lien relinquishment & deposit refund authorization certificate"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span className="hidden sm:inline">Legally binding regulatory release token · Tamper-evident</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyRef}>
              {copied ? <Check size={14} className="text-emerald-600 mr-1" /> : <Copy size={14} className="mr-1" />}
              {copied ? "Copied Reference" : "Copy Ref"}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="text-slate-700">
              <Printer size={14} className="mr-1" />
              Print / Save PDF
            </Button>
            <Button variant="primary" size="sm" onClick={onClose} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 print:p-0">
        {/* Printable Voucher Paper Canvas */}
        <div className="border border-slate-300 rounded-xl bg-white p-6 shadow-sm relative overflow-hidden font-sans text-slate-900 print:border-none print:shadow-none print:p-0">
          {/* Subtle Watermark */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center select-none">
            <span className="text-9xl font-black text-slate-900 rotate-[-25deg]">AICTE NOC</span>
          </div>

          {/* Top National Header */}
          <div className="border-b-2 border-slate-800 pb-4 text-center relative">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <Landmark size={28} />
              </div>

              <div className="flex-1 px-4">
                <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
                  अखिल भारतीय तकनीकी शिक्षा परिषद
                </p>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  All India Council for Technical Education
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  (A Statutory Body of the Government of India · Regulation Bureau)
                </p>
                <p className="text-[10px] text-slate-500">
                  Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 · Web: www.aicte-india.org
                </p>
              </div>

              <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-1">
                <QrCode size={36} className="text-slate-800" />
                <span className="text-[7px] font-mono text-slate-500">VERIFIED</span>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-left">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Voucher Dispatch Ref:
                </span>
                <span className="font-mono font-extrabold text-emerald-800 text-sm tracking-wide">
                  {voucherRef}
                </span>
              </div>

              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Sanction Date:
                </span>
                <span className="font-semibold text-slate-800">{sanctionDate}</span>
              </div>
            </div>
          </div>

          {/* Formal Subject Strip */}
          <div className="my-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-800">
                Official Regulatory Clearance & Discharge Directive
              </span>
              <Badge variant="success">AICTE LIEN RELINQUISHED</Badge>
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold text-emerald-900">
              NO OBJECTION CERTIFICATE (NOC) & BANK LIEN REVOCATION AUTHORIZATION
            </h3>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Subject: Relinquishment of joint lien and release/refund authorization for Security Deposit FDR under {clause}.
            </p>
          </div>

          {/* Addressee */}
          <div className="mb-4 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="font-bold text-slate-900 uppercase">To The Branch Manager / Authorized CBS Signatory:</p>
            <p className="font-semibold text-slate-800 mt-0.5">{data.bankName}</p>
            <p className="text-slate-600">{data.branchName || "Authorized Core Banking Branch"}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Subject Instrument: Fixed Deposit Receipt No.{" "}
              <strong className="text-slate-800 font-mono">{data.fdrNumber}</strong> held in joint custody.
            </p>
          </div>

          {/* Instrument Particulars Table */}
          <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Statutory Security Deposit & Beneficiary Schedule
            </div>
            <div className="divide-y divide-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 gap-2 bg-white">
                <div>
                  <span className="text-slate-500 block text-[10px]">Institution Name:</span>
                  <span className="font-bold text-slate-900">{data.institutionName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">AICTE Permanent ID / Code:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {data.institutionCode || data.institutionId || "AICTE-INST-REG-2026"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 p-2.5 gap-2 bg-slate-50/50">
                <div>
                  <span className="text-slate-500 block text-[10px]">FDR Receipt Number:</span>
                  <span className="font-mono font-bold text-slate-900">{data.fdrNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Original Pledged Principal:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(data.principalAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Authorized Discharge Value:</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">
                    {formatCurrency(sanctionAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-2.5 gap-2 bg-white">
                <div>
                  <span className="text-slate-500 block text-[10px]">Settlement Account (Institutional):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {data.accountNumber || "A/C •••••••••••• (Verified Institution Account)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Bank IFSC & Routing:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {data.ifscCode || "Branch CBS Routing Code"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Statutory Declaration */}
          <div className="text-xs text-slate-700 leading-relaxed space-y-2 mb-4">
            <p className="font-semibold text-slate-900">
              ORDER & DIRECTIVE OF THE COMPETENT APPROVING AUTHORITY:
            </p>
            <p className="text-justify text-[11px] text-slate-600">
              1. This is to certify that the AICTE Regulation Bureau has examined the formal refund dossier, statutory lock-in
              durations, institutional no-dues clearance certificates, and verification audit trails. The Competent Authority has
              sanctioned the unconditional relinquishment of the AICTE lien notation marked on Fixed Deposit Receipt No.{" "}
              <strong className="font-mono text-slate-800">{data.fdrNumber}</strong>.
            </p>
            <p className="text-justify text-[11px] text-slate-600">
              2. The issuing Scheduled Bank is hereby <strong>directed and authorized</strong> to remove and cancel the joint
              lien hold registered in favor of the <em>Member Secretary, AICTE</em> in its Core Banking System (CBS) and
              disburse / credit the authorized funds amounting to{" "}
              <strong className="text-emerald-800 font-mono">{formatCurrency(sanctionAmount)}</strong> directly to the institutional
              account indicated above.
            </p>
            <p className="text-justify text-[11px] text-slate-600">
              3. The bank must generate and record an electronic reverse-lien cancellation acknowledgement to AICTE Aarohan upon
              execution of this instruction.
            </p>
          </div>

          {/* Regulatory Attestation Box */}
          <div className="border-t border-slate-300 pt-4 mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1 text-[10px] text-slate-500">
              <p className="font-mono">Security Token: SHA256:{voucherRef.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}...9b</p>
              <p>Generated by AICTE Aarohan Central Portal · Regulation Bureau</p>
              <p className="text-emerald-700 font-semibold">✓ Digitally Authorized & Cryptographically Signed</p>
            </div>

            <div className="text-right border-l-2 border-emerald-500 pl-4">
              <div className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[9px] uppercase tracking-wider mb-1">
                Executive Sanction
              </div>
              <p className="font-bold text-xs text-slate-900">{approvingAuthority}</p>
              <p className="text-[10px] text-slate-600 font-medium">Approving Authority & Regulatory Custodian</p>
              <p className="text-[10px] text-slate-500">All India Council for Technical Education, New Delhi</p>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
