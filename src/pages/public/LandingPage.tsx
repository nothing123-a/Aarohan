import { Link } from "react-router-dom";
import {
  Building2,
  Shield,
  FileCheck2,
  Clock,
  RefreshCw,
  Lock,
  ChevronRight,
} from "lucide-react";
import { HeroFinancial } from "@/components/hero/HeroFinancial";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ─── HeroFinancial Component (21st.dev inspired, FDR-SMART themed) ─── */}
      <HeroFinancial />

      {/* ─── Features Section ─────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest">
              Core Capabilities
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 font-plus-jakarta">
              Built for Regulatory Security Deposit Scrutiny & Custody
            </p>
            <p className="text-slate-500 text-sm mt-3">
              Comprehensive institutional management ensuring total visibility and compliance for security deposits pledged to AICTE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Building2 size={22} className="text-orange-600" />,
                title: "Centralized FDR Records",
                desc: "Unified institution-wise and instrument-wise repository replacing manual paper files with instant digital search and bank lien tracking.",
                link: "/fdr",
              },
              {
                icon: <Lock size={22} className="text-slate-700" />,
                title: "Secure Document Management",
                desc: "Private object storage with cryptographic SHA-256 integrity hashing, antivirus quarantine pipelines, and role-gated access vouchers.",
                link: "/fdr/new",
              },
              {
                icon: <FileCheck2 size={22} className="text-green-600" />,
                title: "OCR-Assisted Data Extraction",
                desc: "Automated scan ingestion extracting FDR numbers, issuing branch IFSC, principal amounts, and maturity dates to eliminate transcription errors.",
                link: "/verification",
              },
              {
                icon: <Shield size={22} className="text-amber-600" />,
                title: "Scrutiny and Discrepancy Tracking",
                desc: "Side-by-side verification comparing claimed values against OCR output and bank confirmations with formal discrepancy query channels.",
                link: "/verification",
              },
              {
                icon: <Clock size={22} className="text-orange-500" />,
                title: "Maturity Reminders",
                desc: "Automated multi-stage alerts at 45, 30, and 15 days before maturity to prevent unauthorized bank encashments or lapsed securities.",
                link: "/alerts",
              },
              {
                icon: <RefreshCw size={22} className="text-blue-600" />,
                title: "Renewal and Release Workflows",
                desc: "Structured workflows for institutional extensions, bank replacements, and authorized refund decisions with two-officer sign-off.",
                link: "/renewals",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative rounded-xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md hover:border-orange-300 transition-all text-left"
              >
                <div className="h-11 w-11 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900 group-hover:text-orange-600 transition-colors font-plus-jakarta">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {f.desc}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-orange-600">
                  <Link to={f.link} className="inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                    <span>Explore module</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works Section ──────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest">
              Standard Operating Procedure
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 font-plus-jakarta">
              How FDR-SMART Operates
            </p>
            <p className="text-slate-500 text-sm mt-3">
              A transparent, five-step lifecycle ensuring regulatory compliance from initial deposit submission to final discharge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {[
              {
                step: "01",
                title: "Institution Submits",
                desc: "Institution enters instrument details including deposit amount, issuing bank, branch IFSC, and pledge duration.",
              },
              {
                step: "02",
                title: "Documents Uploaded",
                desc: "Scanned copy of the FDR certificate and official bank lien confirmation letter are securely uploaded.",
              },
              {
                step: "03",
                title: "Automated Checks",
                desc: "OCR-assisted extraction validates data fields, checks for duplicate certificate numbers, and verifies bank branch IFSC.",
              },
              {
                step: "04",
                title: "Officer Review",
                desc: "Authorized AICTE scrutiny officer reviews document discrepancy flags and confirms core branch lien validity.",
              },
              {
                step: "05",
                title: "Status & Actions",
                desc: "Institution tracks active deposit custody, receives automated maturity notices, and initiates renewals or release requests.",
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs relative flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-black text-orange-500 font-mono tracking-widest">
                    STEP {step.step}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2 font-plus-jakarta">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Phase {idx + 1}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About Section ─────────────────────────────────────────── */}
      <section id="about" className="py-16 sm:py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-4">
            <span>Smart India Hackathon 2026 · Problem Statement ID: SIH 26265</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-plus-jakarta">
            About FDR-SMART & Team Garuda Netra
          </h2>
          <p className="text-slate-600 text-sm mt-4 leading-relaxed">
            FDR-SMART is designed to solve the critical challenges of paper-based fixed deposit management for the AICTE Regulation Bureau. By establishing a unified digital registry, automated core banking lien confirmation, and lifecycle monitoring, the platform safeguards institutional security deposits and enforces regulatory accountability.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-900">Regulatory Body</p>
              <p className="text-xs text-slate-500 mt-1">All India Council for Technical Education (AICTE), Regulation Bureau</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-900">Innovation Team</p>
              <p className="text-xs text-slate-500 mt-1">Team Garuda Netra · SIH 2026 Nationwide Finalist</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-900">Problem Focus</p>
              <p className="text-xs text-slate-500 mt-1">Streamline of Security Deposit/FDR Portal (SIH 26265)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-900 text-slate-400 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">
                <Building2 size={18} />
              </div>
              <div>
                <p className="font-bold text-white text-base font-plus-jakarta">
                  FDR-SMART
                </p>
                <p className="text-[11px] text-slate-400">
                  Smart India Hackathon 2026 · Problem Statement ID: SIH 26265 · Team Garuda Netra
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 font-medium text-slate-300">
              <a href="#" className="hover:text-orange-400 transition-colors">Home</a>
              <a href="#features" className="hover:text-orange-400 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-orange-400 transition-colors">How It Works</a>
              <a href="#about" className="hover:text-orange-400 transition-colors">About</a>
              <Link to="/login" className="hover:text-orange-400 transition-colors">Access Portal</Link>
              <Link to="/dashboard" className="hover:text-orange-400 transition-colors">Workbench</Link>
              <Link to="/design-system" className="hover:text-orange-400 transition-colors">Design System</Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>
              © 2026 FDR-SMART · Team Garuda Netra. All rights reserved.
            </p>
            <p className="bg-slate-800/80 px-3 py-1 rounded-md text-amber-400/90 border border-slate-700/60 text-center md:text-right">
              Disclaimer: Prototype Demonstration System developed for Smart India Hackathon 2026 (SIH 26265). This is an evaluation prototype and not an officially deployed AICTE production service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
