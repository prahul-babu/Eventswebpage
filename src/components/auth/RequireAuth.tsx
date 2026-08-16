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

  // 1. Show loading screen while auth is actively checking
  if (isLoading || isAuthenticating) {
    console.log("[AUTH] RequireAuth resolving session...");
    return <AuthLoadingScreen />;
  }

  // 2. Redirect unauthenticated users to /login
  if (!isAuthed) {
    console.warn("[AUTH] Unauthenticated user accessing protected route:", location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveUserRole = profile?.role || role || "student";
  const effectiveStatus = profile?.status || status || "ACTIVE";

  console.log("[AUTH] Route decision for:", location.pathname, {
    isAuthed,
    effectiveUserRole,
    effectiveStatus,
    allowedRoles,
  });

  // 3. Faculty Pending Verification -> /pending
  if (
    effectiveUserRole === "faculty" &&
    (effectiveStatus === "PENDING" ||
      effectiveStatus === "PENDING_APPROVAL" ||
      profile?.isApproved === false ||
      profile?.approvalStatus === "pending")
  ) {
    if (location.pathname !== "/pending") {
      console.log("[AUTH] Redirecting pending faculty to /pending");
      return <Navigate to="/pending" replace />;
    }
    return <>{children}</>;
  }

  // 4. Blocked / Suspended / Rejected accounts
  if (
    effectiveStatus === "SUSPENDED" ||
    effectiveStatus === "REJECTED" ||
    profile?.approvalStatus === "rejected"
  ) {
    if (location.pathname !== "/account-blocked") {
      console.log("[AUTH] Redirecting blocked account to /account-blocked");
      return <Navigate to="/account-blocked" replace />;
    }
    return <>{children}</>;
  }

  // 5. If approved user is on /pending, move to appropriate dashboard
  if (effectiveStatus === "ACTIVE" && location.pathname === "/pending") {
    const destination = getPostLoginRoute(effectiveUserRole, effectiveStatus);
    console.log("[AUTH] Approved user moving from /pending to:", destination);
    return <Navigate to={destination} replace />;
  }

  // 6. Role Authorization
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(effectiveUserRole);
    if (!hasRole) {
      const destination = getPostLoginRoute(effectiveUserRole, effectiveStatus);
      console.warn("[AUTH] Role mismatch on", location.pathname, "rerouting to:", destination);
      if (location.pathname !== destination) {
        return <Navigate to={destination} replace />;
      }
    }
  }

  // 7. Access granted
  return <>{children}</>;
};

export default RequireAuth;
