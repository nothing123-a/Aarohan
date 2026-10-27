import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function AccessDeniedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center animate-slide-up">
        {/* Emblem */}
        <div className="h-16 w-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-6 shadow-xs">
          <ShieldAlert size={32} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100/70 border border-red-200 text-red-800 text-xs font-bold mb-3">
          <span>Error 403 · Access Forbidden</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 font-plus-jakarta">
          Restricted Regulatory Scope
        </h1>

        <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          Your active account role (<span className="font-semibold text-slate-900 capitalize">{user?.role || "Guest"}</span>) does not hold the statutory permissions required to access this AICTE administrative bureau module.
        </p>

        {/* User Context Box */}
        {user && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Logged in as:</span>
              <span className="font-semibold text-slate-800">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Assigned Role:</span>
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold uppercase">
                {user.role}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Clearance Level:</span>
              <span className="text-slate-600 font-mono text-[11px]">AICTE-REG-LEVEL-2</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            size="default"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <ArrowLeft size={15} />
            <span>Go Back</span>
          </Button>

          <Button
            variant="primary"
            size="default"
            asChild
            className="w-full sm:w-auto shadow-orange"
          >
            <Link to="/dashboard">
              <Home size={15} />
              <span>Return to Dashboard</span>
            </Link>
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Building2 size={13} className="text-orange-500" />
            <span>FDR-SMART Security Gateway</span>
          </div>
          <button
            onClick={() => logout()}
            className="text-orange-600 hover:text-orange-700 font-semibold hover:underline"
          >
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
