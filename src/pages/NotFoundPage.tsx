import { Link } from "react-router-dom";
import { Home, FileSearch, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * 404 Not Found page.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center animate-slide-up">
        {/* Emblem */}
        <div className="h-16 w-16 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto mb-6 shadow-xs">
          <FileSearch size={32} />
        </div>

        <div className="text-6xl font-black text-slate-900 font-plus-jakarta tracking-tight">
          4<span className="text-orange-500">0</span>4
        </div>

        <h1 className="text-xl font-bold text-slate-900 font-plus-jakarta mt-2">
          Page Not Found
        </h1>

        <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
          The requested administrative module or URL does not exist in the Aarohan portal repository.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="outline" size="default" asChild className="w-full sm:w-auto">
            <Link to="/">
              <ArrowLeft size={15} />
              <span>Landing Page</span>
            </Link>
          </Button>

          <Button variant="primary" size="default" asChild className="w-full sm:w-auto shadow-orange">
            <Link to="/dashboard">
              <Home size={15} />
              <span>Workbench</span>
            </Link>
          </Button>
        </div>

        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Building2 size={13} className="text-orange-500" />
          <span>Aarohan · AICTE Regulation Bureau · SIH 26265</span>
        </div>
      </div>
    </div>
  );
}

