import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FDRDash } from "./FDRDash";
import { TimelineAnimation } from "./TimelineAnimation";
import { MotionDrawer } from "./MotionDrawer";
import { useAuth } from "@/context/AuthContext";

export function HeroFinancial() {
  const { isAuthenticated, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="w-full relative overflow-hidden bg-gradient-to-b from-white via-orange-50/20 to-slate-50 text-slate-900 font-sans pb-16">
      {/* ─── Hero Public Navigation ────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center shadow-xs">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight font-plus-jakarta text-base">
                  FDR-SMART
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                  AICTE · SIH 26265
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">All India Council for Technical Education</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#" className="hover:text-orange-600 transition-colors">Home</a>
            <a href="#features" className="hover:text-orange-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-orange-600 transition-colors">How It Works</a>
            <a href="#about" className="hover:text-orange-600 transition-colors">About</a>
            <Link to="/design-system" className="text-orange-600 hover:text-orange-700">Design System</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button variant="primary" size="sm" asChild>
                <Link to="/dashboard" className="flex items-center gap-1.5">
                  <span>Open Workbench ({user?.role})</span>
                  <ArrowRight size={14} />
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link to="/login" className="flex items-center gap-1.5">
                    <span>Access Portal</span>
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Hero Content ────────────────────────────────────── */}
      <section className="pt-12 sm:pt-16 pb-12 sm:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/70 border border-orange-200 text-orange-800 text-xs font-bold mb-6 animate-fade-in shadow-2xs">
            <Sparkles size={13} className="text-orange-600" />
            <span>AICTE Regulation Bureau · Centralized Security Deposit / FDR Portal</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-none max-w-4xl mx-auto font-plus-jakarta">
            Smart, Secure & Simplified <br className="hidden sm:inline" />
            <span className="text-orange-600">FDR Management</span>
          </h1>

          {/* Supporting Text */}
          <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A centralized digital platform for managing security deposits and Fixed Deposit Receipts, streamlining document submission, scrutiny, maturity monitoring, and administrative workflows.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button size="lg" variant="primary" asChild className="w-full sm:w-auto shadow-orange">
              <Link to="/login">
                Access Portal
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <a href="#features">
                Explore Features
              </a>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setDrawerOpen(true)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <Info size={15} />
              <span>Specification Overview</span>
            </Button>
          </div>

          {/* ─── Interactive FDR Dashboard Preview (replaces EcommerceDash) ─── */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-400/20 via-orange-500/20 to-amber-400/20 blur-xl opacity-70 -z-10" />
            <FDRDash />
          </div>
        </div>
      </section>

      {/* ─── Instrument Lifecycle Animation Section ───────────────── */}
      <section id="lifecycle" className="py-12 sm:py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">
            Automated Governance Lifecycle
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-plus-jakarta mt-2">
            Five Stages of End-to-End FDR Control
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            From initial digital receipt registration to automated maturity monitoring and statutory release vouchers.
          </p>
        </div>

        <TimelineAnimation />
      </section>

      {/* ─── Partner Banks Strip ──────────────────────────────────── */}
      <section id="banks" className="pt-6 pb-12 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Direct CBS Verification Supported Across Scheduled Financial Institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-bold text-slate-600">
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">State Bank of India</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">Punjab National Bank</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">HDFC Bank Ltd</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">Bank of Baroda</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">ICICI Bank Ltd</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">Canara Bank</span>
          </div>
        </div>
      </section>

      {/* ─── Inspection Drawer Modal ──────────────────────────────── */}
      <MotionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="FDR-SMART Architecture Specifications"
        description="Smart India Hackathon 2026 · Problem Statement ID: SIH 26265"
      >
        <div className="space-y-3.5">
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-950 space-y-1">
            <p className="font-bold">Organization: All India Council for Technical Education (AICTE)</p>
            <p className="text-[11px] text-orange-900/80">Bureau: Regulation Bureau | Team: Garuda Netra</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-1">Key Technical Innovations:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
              <li>Core Banking System (CBS) lien verification with scheduled banks</li>
              <li>Automated 45-day, 30-day, and 15-day maturity notice escalation engine</li>
              <li>Cryptographically hashed audit trails for CAG / statutory scrutiny</li>
              <li>Role-based access separation between Scrutiny Officers and Approving Authorities</li>
            </ul>
          </div>
        </div>
      </MotionDrawer>
    </div>
  );
}
