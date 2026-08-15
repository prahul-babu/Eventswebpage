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
  const { isLoading, isAuthenticating, isAuthenticated, status, role, profile, firebaseUser } = useAuth();
  const location = useLocation();

  const isAuthed = isAuthenticated || Boolean(firebaseUser) || Boolean(auth.currentUser);

  // 1. Show full-screen loading screen while resolving auth state OR while user is authenticated but profile/role is still loading from Firestore
  if (isLoading || isAuthenticating || (isAuthed && (!profile || !role))) {
    console.log("[AUTH 5] isLoading value:", isLoading, "| role resolving for user:", auth.currentUser?.uid || firebaseUser?.uid);
    return <AuthLoadingScreen />;
  }

  // 2. Redirect unauthenticated users to /login ONLY after auth loading is complete and user does not exist
  if (!isAuthed) {
    console.error("[REDIRECT 15] exact reason if RequireAuth redirects to /login:", {
      currentPath: window.location.pathname,
      firebaseUser: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      role: role || null,
      status: status || null,
      reason: "Unauthenticated access on protected route: " + location.pathname,
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("[REQUIREAUTH 14] RequireAuth decision for route:", location.pathname, {
    isAuthed,
    role,
    status,
    allowedRoles,
  });

  // 3. Exact Role / Status Rules Enforcement:
  // - faculty + PENDING → Faculty Pending Approval (/pending)
  if (role === "faculty" && status === "PENDING") {
    if (location.pathname !== "/pending") {
      console.log("[ROUTE 13] Faculty pending redirect to /pending");
      return <Navigate to="/pending" replace />;
    }
    return <>{children}</>;
  }

  // - Blocked / Suspended accounts
  if (status === "SUSPENDED" || status === "REJECTED") {
    if (location.pathname !== "/account-blocked") {
      console.log("[ROUTE 13] Account blocked redirect to /account-blocked");
      return <Navigate to="/account-blocked" replace />;
    }
    return <>{children}</>;
  }

  // If a pending user was approved (status is ACTIVE) but is still on /pending, route them to dashboard
  if (status === "ACTIVE" && location.pathname === "/pending") {
    const destination = getPostLoginRoute(role, status);
    console.log("[ROUTE 13] Approved user navigating away from /pending to:", destination);
    return <Navigate to={destination} replace />;
  }

  // 4. Role Authorization: Check if user role matches allowedRoles
  if (allowedRoles && allowedRoles.length > 0) {
    const effectiveUserRole = role;
    const hasRole = effectiveUserRole ? allowedRoles.includes(effectiveUserRole) : false;
    if (!hasRole && effectiveUserRole) {
      const destination = getPostLoginRoute(effectiveUserRole, status);
      console.log("[ROUTE 13] Role mismatch on", location.pathname, "rerouting to:", destination);
      if (location.pathname !== destination) {
        return <Navigate to={destination} replace />;
      }
    }
  }

  // 5. Access granted
  return <>{children}</>;
};
export default RequireAuth;
