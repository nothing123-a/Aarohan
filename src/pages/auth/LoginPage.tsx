import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Zap,
  FileCheck2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      errors.identifier = "Email address or Institution PID is required.";
    }
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left panel — regulatory branding */}
      <div className="hidden lg:flex lg:flex-col lg:w-[44%] bg-gradient-to-br from-orange-600 via-amber-600 to-indigo-950 p-10 xl:p-12 relative overflow-hidden text-white shadow-2xl">
        {/* Ambient floating blur lights */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-orange-400/25 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-72 h-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none" />

        {/* Subtle geometric grid overlay */}
        <div
          className="absolute inset-0 opacity-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content container */}
        <div className="relative flex-1 flex flex-col justify-between z-10">
          <div>
            {/* Hackathon Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-amber-100 shadow-xs mb-8 w-fit">
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
              <span>Smart India Hackathon 2026 · Problem ID: SIH 26265</span>
            </div>

            {/* Platform Branding */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-orange-950/20">
                <Building2 size={26} className="text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-2xl tracking-tight font-plus-jakarta">
                    Aarohan
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono shadow-xs">
                    Enterprise
                  </span>
                </div>
                <p className="text-orange-100 text-xs font-semibold tracking-wide">
                  AICTE Central Decision & Regulation Bureau
                </p>
              </div>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4 font-plus-jakarta tracking-tight">
              Regulatory Custody &<br />
              <span className="bg-gradient-to-r from-amber-200 via-orange-100 to-white bg-clip-text text-transparent">
                Security Deposit Portal
              </span>
            </h1>
            <p className="text-orange-50/90 text-xs xl:text-sm leading-relaxed max-w-md font-medium">
              Official centralized statutory repository for AICTE-approved technical institutions to lodge, track, renew, and reconcile Fixed Deposit Receipts with scheduled banks.
            </p>
          </div>

          {/* Attractive feature cards */}
          <div className="space-y-2.5 pt-6 border-t border-white/15">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 hover:bg-white/12 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0 text-amber-300">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Automated Maturity Horizons</p>
                <p className="text-[11px] text-orange-100/75 mt-0.5">Automated 45d / 30d / 15d statutory renewal & rollover notices</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 hover:bg-white/12 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 text-emerald-300">
                <Zap size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Direct Core Banking Lien Query</p>
                <p className="text-[11px] text-orange-100/75 mt-0.5">Real-time SFMS 2.0 & Account Aggregator joint lien verification</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 hover:bg-white/12 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
                <FileCheck2 size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">AI & OCR Discrepancy Detection</p>
                <p className="text-[11px] text-orange-100/75 mt-0.5">Multi-field optical verification comparing scans against CBS ledgers</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 hover:bg-white/12 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center flex-shrink-0 text-purple-300">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Immutable CAG-Grade Audit Trail</p>
                <p className="text-[11px] text-orange-100/75 mt-0.5">Cryptographically hashed lifecycle events for regulatory scrutiny</p>
              </div>
            </div>
          </div>

          {/* Team Aarohan Banner */}
          <div className="pt-6">
            <div className="p-3.5 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/15 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-300 text-slate-950 font-black flex items-center justify-center text-sm shadow-md font-mono">
                  आ
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-sm tracking-wide font-plus-jakarta">
                      Team Aarohan
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                      SIH 2026 Prototype
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70">
                    Smart India Hackathon · Problem Statement SIH 26265
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — authentication form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10">
        <div className="w-full max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            <span>Back to Public Landing Page</span>
          </Link>

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <Building2 size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-900 font-plus-jakarta">Aarohan</p>
              <p className="text-[11px] text-slate-400">AICTE Regulation Bureau</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 font-plus-jakarta">
              Sign In to Portal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Authenticate using your institutional credentials or AICTE department ID.
            </p>
          </div>

          {authError && (
            <Alert variant="error" className="mb-5" onDismiss={() => setAuthError("")}>
              {authError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address or Institution PID"
              type="text"
              id="login-identifier"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (fieldErrors.identifier) {
                  setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                }
              }}
              placeholder="e.g. officer@aicte.gov.in or 1-456789123"
              leadingIcon={<Mail size={15} />}
              error={fieldErrors.identifier}
              required
              autoComplete="username"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                id="login-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Enter your security password"
                leadingIcon={<Lock size={15} />}
                error={fieldErrors.password}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition-colors p-1"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Security Clearance Level 1/2</span>
              <Link
                to="/forgot-password"
                className="text-orange-600 hover:text-orange-700 font-semibold"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 shadow-orange"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              id="login-submit"
            >
              Sign In to Portal
            </Button>

            {/* Quick Demo Credentials */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 font-medium mb-2 text-center">
                Quick Demo Accounts (Choose Role to Test):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("registrar@dtu.ac.in");
                    setPassword("password123");
                    setFieldErrors({});
                  }}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700 transition-colors text-center cursor-pointer"
                  id="btn-demo-institution"
                >
                  Institution Rep
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("officer@aicte.gov.in");
                    setPassword("password123");
                    setFieldErrors({});
                  }}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-colors text-center cursor-pointer"
                  id="btn-demo-officer"
                >
                  Scrutiny Officer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("approver@aicte.gov.in");
                    setPassword("password123");
                    setFieldErrors({});
                  }}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-700 transition-colors text-center cursor-pointer"
                  id="btn-demo-approver"
                >
                  Approving Authority
                </button>
              </div>
            </div>
          </form>

          {/* Provisioning Notice */}
          <div className="mt-6 p-3 rounded-xl bg-slate-100/70 border border-slate-200/80 text-slate-600 text-[11px] flex items-start gap-2">
            <ShieldAlert size={15} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Institutional accounts are provisioned directly by AICTE. Public self-registration is restricted to prevent unauthorized filings.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          AICTE Regulation Bureau · Smart India Hackathon 2026 · Team Aarohan
        </p>
      </div>
    </div>
  );
}
