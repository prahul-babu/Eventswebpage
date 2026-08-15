import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import type { UserRole } from "@/types";
import { toast } from "sonner";

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, allowedRoles }) => {
  const { isLoading, isAuthenticated, status, role } = useAuth();
  const location = useLocation();

  // 1. Show full-screen loading screen while resolving auth state
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // 2. Redirect unauthenticated users to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Redirect PENDING users to /pending approval gate
  if (status === "PENDING") {
    if (location.pathname !== "/pending") {
      return <Navigate to="/pending" replace />;
    }
    return <>{children}</>;
  }

  // 4. Redirect SUSPENDED or REJECTED users to /account-blocked
  if (status === "SUSPENDED" || status === "REJECTED") {
    if (location.pathname !== "/account-blocked") {
      return <Navigate to="/account-blocked" replace />;
    }
    return <>{children}</>;
  }

  // 5. Role Authorization: Check if user role matches allowedRoles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = role && allowedRoles.includes(role);
    if (!hasRole) {
      toast.error("Access Denied", {
        description: "You do not have access to that page.",
      });
      return <Navigate to="/" replace />;
    }
  }

  // 6. Access granted
  return <>{children}</>;
};
