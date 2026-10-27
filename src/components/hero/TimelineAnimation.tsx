import { useState, useEffect } from "react";
import {
  Upload,
  ShieldCheck,
  Building,
  BellRing,
  FileCheck,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";

interface TimelineStep {
  id: number;
  stage: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge: string;
}

export function TimelineAnimation() {
  const [activeStep, setActiveStep] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const steps: TimelineStep[] = [
    {
      id: 1,
      stage: "Stage 01",
      title: "Institution Instrument Submission",
      desc: "Authorized technical institutions register digital FDR metadata, upload scan certificates, and attach issuing bank endorsement letters.",
      icon: <Upload size={18} className="text-orange-500" />,
      badge: "Self-Service Portal",
    },
    {
      id: 2,
      stage: "Stage 02",
      title: "OCR Scrutiny & Branch Verification",
      desc: "System performs automated OCR field extraction while AICTE scrutiny officers verify branch authenticity and core banking lien codes.",
      icon: <ShieldCheck size={18} className="text-blue-500" />,
      badge: "Dual-Verification",
    },
    {
      id: 3,
      stage: "Stage 03",
      title: "Active Custody & Lien Registry",
      desc: "The instrument enters approved active status. The official lien in favor of Member Secretary, AICTE is locked and monitored.",
      icon: <Building size={18} className="text-green-500" />,
      badge: "Live Monitoring",
    },
    {
      id: 4,
      stage: "Stage 04",
      title: "Maturity Tracking & Escalations",
      desc: "Scheduled cron tasks trigger automated alerts at 45, 30, and 15 days before maturity to guarantee timely renewal or encashment.",
      icon: <BellRing size={18} className="text-amber-500" />,
      badge: "Zero-Lag Alerts",
    },
    {
      id: 5,
      stage: "Stage 05",
      title: "Regulated Release or Extension",
      desc: "Post institutional tenure completion or renewal submission, AICTE Bureau authorizes discharge vouchers and revokes the lien.",
      icon: <FileCheck size={18} className="text-purple-500" />,
      badge: "Statutory NOC",
    },
  ];

  // Auto-advance unless user has requested reduced motion
  useEffect(() => {
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [prefersReducedMotion, steps.length]);

  return (
    <div className="w-full">
      {/* Steps Pill Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(index)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-orange-500 text-white border-orange-500 shadow-orange"
                  : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? "text-orange-100" : "text-slate-400"
                  }`}
                >
                  {step.stage}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActive ? "bg-white" : "bg-slate-300"
                  }`}
                />
              </div>
              <p
                className={`text-xs font-bold truncate ${
                  isActive ? "text-white" : "text-slate-800"
                }`}
              >
                {step.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Step Showcase Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm transition-all text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
              {steps[activeStep].icon}
            </div>
            <div>
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">
                {steps[activeStep].stage}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-plus-jakarta mt-0.5">
                {steps[activeStep].title}
              </h3>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            {steps[activeStep].badge}
          </span>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          {steps[activeStep].desc}
        </p>

        {/* Progress indicator bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>AICTE Operational Compliance Standard</span>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeStep ? "w-6 bg-orange-500" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
