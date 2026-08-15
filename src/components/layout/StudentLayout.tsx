import React from "react";
import { Outlet } from "react-router-dom";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { CalendarCheck, ShieldCheck } from "lucide-react";

export const StudentLayout: React.FC = () => {
  return (
    <RequireAuth allowedRoles={["student", "faculty", "admin"]}>
      <div className="min-h-screen flex flex-col bg-slate-50/60 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <AppNavbar />
        <Breadcrumbs />
        <main className="flex-1">
          <ErrorBoundary fallbackTitle="Student Portal Notice">
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="border-t bg-white py-6 mt-12 text-slate-500 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-indigo-600" />
              <span>&copy; {new Date().getFullYear()} The Apollo University. Student Portal.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Verified Institutional Access</span>
            </div>
          </div>
        </footer>
      </div>
    </RequireAuth>
  );
};
