import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Lock, Mail, Eye, EyeOff, ArrowLeft, ShieldAlert } from "lucide-react";
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
      <div className="hidden lg:flex lg:flex-col lg:w-[42%] bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-12 relative overflow-hidden text-white">
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Content */}
        <div className="relative flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Building2 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-white font-extrabold text-lg leading-tight font-plus-jakarta">
                  FDR-SMART
                </p>
                <p className="text-orange-100 text-xs font-medium">
                  AICTE Regulation Bureau · SIH 26265
                </p>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-snug mb-4 font-plus-jakarta">
              Regulatory Custody &<br />Security Deposit Portal
            </h1>
            <p className="text-orange-50 text-xs sm:text-sm leading-relaxed max-w-sm">
              Official centralized repository for AICTE-approved technical institutions to lodge, track, renew, and reconcile Fixed Deposit Receipts with scheduled banks.
            </p>
          </div>

          {/* Feature chips */}
          <div className="space-y-3.5 pt-8 border-t border-white/20">
            {[
              "Automated 45d / 30d / 15d maturity notices",
              "Direct Core Banking System lien verification",
              "OCR discrepancy detection on certificate scans",
              "CAG-compliant immutable digital audit trails",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-white flex-shrink-0" />
                <span className="text-xs text-white/95 font-medium">{feat}</span>
              </div>
            ))}
          </div>

          <div className="pt-8 text-[11px] text-orange-200">
            Team Garuda Netra · Smart India Hackathon 2026 Prototype
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
              <p className="font-bold text-slate-900 font-plus-jakarta">FDR-SMART</p>
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
              <div className="grid grid-cols-2 gap-2">
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
                  Institution Rep (DTU)
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
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("admin@aicte.gov.in");
                    setPassword("admin123");
                    setFieldErrors({});
                  }}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors text-center cursor-pointer"
                  id="btn-demo-admin"
                >
                  System Admin
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
          AICTE Regulation Bureau · Smart India Hackathon 2026 · Team Garuda Netra
        </p>
      </div>
    </div>
  );
}
