import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, getPostLoginRoute } from "@/lib/auth-context";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import type { UserRole } from "@/types";

import { auth } from "@/lib/firebase";

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, allowedRoles }) => {
  const { isLoading, isAuthenticating, isAuthenticated, status, role, firebaseUser } = useAuth();
  const location = useLocation();

  const isAuthed = isAuthenticated || Boolean(firebaseUser) || Boolean(auth.currentUser);

  // 1. Show full-screen loading screen while resolving auth state
  if (isLoading || isAuthenticating || (Boolean(auth.currentUser) && !firebaseUser)) {
    return <AuthLoadingScreen />;
  }

  // 2. Redirect unauthenticated users to /login ONLY after auth loading is complete and user does not exist
  if (!isAuthed) {
    console.error("REDIRECTING TO LOGIN:", {
      reason: "Unauthenticated access on protected route: " + location.pathname,
      firebaseUser: firebaseUser?.uid || auth.currentUser?.uid || null,
      email: firebaseUser?.email || auth.currentUser?.email || null,
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Exact Role / Status Rules Enforcement:
  // - faculty + PENDING → Faculty Pending Approval (/pending)
  if (role === "faculty" && status === "PENDING") {
    if (location.pathname !== "/pending") {
      return <Navigate to="/pending" replace />;
    }
    return <>{children}</>;
  }

  // - Blocked / Suspended accounts
  if (status === "SUSPENDED" || status === "REJECTED") {
    if (location.pathname !== "/account-blocked") {
      return <Navigate to="/account-blocked" replace />;
    }
    return <>{children}</>;
  }

  // If a pending user was approved (status is ACTIVE) but is still on /pending, route them to dashboard
  if (status === "ACTIVE" && location.pathname === "/pending") {
    return <Navigate to={getPostLoginRoute(role, status)} replace />;
  }

  // 4. Role Authorization: Check if user role matches allowedRoles
  if (allowedRoles && allowedRoles.length > 0) {
    const effectiveUserRole = role || "student";
    const hasRole = allowedRoles.includes(effectiveUserRole);
    if (!hasRole) {
      const destination = getPostLoginRoute(effectiveUserRole, status);
      if (location.pathname !== destination) {
        return <Navigate to={destination} replace />;
      }
    }
  }

  // 5. Access granted
  return <>{children}</>;
};
export default RequireAuth;
