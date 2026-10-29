import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ArrowLeft, Mail, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormFields";
import { Alert } from "@/components/ui/Alert";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your registered email address or Institution PID.");
      return;
    }

    setIsLoading(true);
    // Simulate recovery lookup with AICTE user registry
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 900);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 animate-slide-up">
        {/* Header Branding */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-xs">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 font-plus-jakarta">
              Aarohan
            </h1>
            <p className="text-xs text-slate-400">
              AICTE Regulation Bureau Account Recovery
            </p>
          </div>
        </div>

        {!submitted ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-plus-jakarta">
                Account Recovery
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your institutional email or AICTE Permanent ID (PID). A secure verification link and one-time password will be dispatched to the verified institutional signatory.
              </p>
            </div>

            {error && (
              <Alert variant="error" className="mb-4" onDismiss={() => setError("")}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email or Institution PID"
                placeholder="officer@college.edu.in or 1-33291245"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                leadingIcon={<Mail size={16} />}
                required
                autoFocus
              />

              <div className="p-3 rounded-lg bg-orange-50/70 border border-orange-200 text-orange-950 text-xs flex items-start gap-2">
                <ShieldCheck size={16} className="text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  For security reasons, password resets for AICTE administrative accounts require secondary sign-off from the Bureau System Administrator.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Send Recovery Instructions
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-plus-jakarta">
                Instructions Dispatched
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
                If an approved account matches <span className="font-semibold text-slate-900">{identifier}</span>, password reset instructions have been forwarded to the registered principal / nodal officer.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 text-left space-y-1">
              <p className="font-semibold text-slate-700">Didn't receive an email?</p>
              <p>• Check official institutional spam/junk filters</p>
              <p>• Contact your AICTE Regional Bureau liaison desk</p>
            </div>

            <Button
              variant="outline"
              size="default"
              onClick={() => {
                setSubmitted(false);
                setIdentifier("");
              }}
              className="w-full"
            >
              Try Another Identifier
            </Button>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Portal Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
