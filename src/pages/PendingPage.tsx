import React, { useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth, getPostLoginRoute } from "@/lib/auth-context";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  User as UserIcon,
  Building2,
  HelpCircle,
  ArrowRight,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const PendingPage: React.FC = () => {
  const { firebaseUser, isAuthenticated, profile, role, status, isLoading, isAuthenticating, refreshClaims, signOut } = useAuth();
  const navigate = useNavigate();

  // Show loading screen while auth resolves
  if (isLoading || isAuthenticating) {
    return <AuthLoadingScreen />;
  }

  // If unauthenticated, redirect to login
  if (!isAuthenticated || !firebaseUser) {
    console.error("REDIRECTING TO LOGIN:", {
      reason: "Unauthenticated access on /pending",
      firebaseUser: firebaseUser?.uid || null,
      email: firebaseUser?.email || null,
    });
    return <Navigate to="/login" replace />;
  }

  // Real-time listener: Watch for status flip to ACTIVE
  useEffect(() => {
    if (status === "ACTIVE" || (profile && profile.status === "ACTIVE")) {
      toast.success("Account Approved!", {
        description: "Your campus account has been activated by the administrator.",
      });
      refreshClaims().then(() => {
        navigate(getPostLoginRoute(profile?.role || role, "ACTIVE"));
      });
    }
  }, [status, profile, role, refreshClaims, navigate]);

  const isRejected = status === "REJECTED" || (profile && profile.status === "REJECTED");
  const isApproved = status === "ACTIVE" || (profile && profile.status === "ACTIVE");

  const displayName = profile?.displayName || firebaseUser.displayName || "Campus Member";
  const userEmail = profile?.email || firebaseUser.email || "";
  const roleName = profile?.role || "student";
  const department = profile?.department || "General Administration";
  const submittedAt = profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : "Just now";
  const idNumber = profile?.rollNumber || profile?.employeeId || null;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-lg">
        <Card className="border-slate-200/90 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
          {/* Calm Header */}
          <CardHeader className="text-center pt-8 pb-4">
            <div className="relative mx-auto mb-3">
              {isApproved ? (
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : isRejected ? (
                <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/10">
                  <XCircle className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10 relative">
                  <Clock className="w-8 h-8 animate-pulse" />
                  <div className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-sm -z-10 animate-ping" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                The Apollo University • Access Gate
              </div>

              <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
                {isApproved
                  ? "Campus Access Approved!"
                  : isRejected
                  ? "Access Request Declined"
                  : "Verification Under Review"}
              </CardTitle>
            </div>

            <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-1">
              {isApproved
                ? "Your credentials have been verified. Welcome to Apollo University Event Hub."
                : isRejected
                ? "Your submitted details could not be approved by the campus administration."
                : "Your request has been forwarded to the administrator for access."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 sm:px-8">
            {/* Rejection Alert */}
            {isRejected && (
              <Alert variant="destructive" className="border-rose-300 bg-rose-50 text-rose-900 text-xs">
                <XCircle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="font-semibold text-rose-950">Administrator Note</AlertTitle>
                <AlertDescription className="text-rose-900/90 mt-1">
                  {profile?.rejectionReason ||
                    "Your details could not be matched against the active university database. Please contact the campus IT desk."}
                </AlertDescription>
              </Alert>
            )}

            {/* Submitted Summary Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Applicant</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  {displayName}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Institutional Email</span>
                <span className="font-mono text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {userEmail}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Requested Role</span>
                <Badge variant={roleName === "faculty" ? "amber" : "indigo"} className="capitalize">
                  {roleName}
                </Badge>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-800 flex items-center gap-1.5 text-right">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {department}
                </span>
              </div>

              {idNumber && (
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">
                    {roleName === "faculty" ? "Employee ID" : "Roll Number"}
                  </span>
                  <span className="font-mono font-semibold text-slate-900">{idNumber}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-slate-500">Submission Timestamp</span>
                <span className="text-slate-600 text-[11px]">{submittedAt}</span>
              </div>
            </div>

            {/* Live Polling Status Pill */}
            {!isApproved && !isRejected && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-indigo-50/60 py-2.5 px-4 rounded-xl border border-indigo-100">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                <span>Live updates active. You will be automatically redirected upon approval.</span>
              </div>
            )}
          </CardContent>

          {/* Action Footer */}
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t bg-slate-50/80 px-6 sm:px-8 py-4 gap-3 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-slate-500 hover:text-slate-800 text-xs w-full sm:w-auto"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span>Sign Out</span>
            </Button>

            {isApproved ? (
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                <Link to="/">
                  <span>Go to Event Hub</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            ) : isRejected ? (
              <Button
                asChild
                size="sm"
                variant="default"
                className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              >
                <a href="mailto:it-support@apollo.edu.in?subject=Apollo%20Event%20Hub%20Access%20Appeal">
                  <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Contact IT Support</span>
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refreshClaims()}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 w-full sm:w-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Check Status Now</span>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
