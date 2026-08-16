import React from "react";
import { Outlet } from "react-router-dom";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

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
        <AppFooter />
      </div>
    </RequireAuth>
  );
};

export default StudentLayout;
