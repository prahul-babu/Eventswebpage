import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { AppFooter } from "@/components/layout/AppFooter";
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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { UserStatus } from "@/types";

export const PendingPage: React.FC = () => {
  const { firebaseUser, isAuthenticated, profile, role, status, isLoading, isAuthenticating, refreshClaims, signOut } = useAuth();
  const navigate = useNavigate();

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [liveStatus, setLiveStatus] = useState<UserStatus | null>(status || (profile?.status as UserStatus) || null);
  const [liveRejectionReason, setLiveRejectionReason] = useState<string | null>(profile?.rejectionReason || null);

  // Show loading screen while auth resolves
  if (isLoading || isAuthenticating) {
    return <AuthLoadingScreen />;
  }

  // If unauthenticated, redirect to login
  if (!isAuthenticated || !firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  const currentUser = auth.currentUser || firebaseUser;
  const uid = currentUser?.uid;

  // Real-time Firestore onSnapshot listener on users/{uid}
  useEffect(() => {
    if (!uid) return;

    const userDocRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const rawStatus = String(userData.status || "").toUpperCase();
          const currentStatus: UserStatus =
            rawStatus === "ACTIVE"
              ? "ACTIVE"
              : rawStatus === "REJECTED"
              ? "REJECTED"
              : "PENDING_APPROVAL";

          setLiveStatus(currentStatus);
          if (userData.rejectionReason) {
            setLiveRejectionReason(userData.rejectionReason);
          }

          if (currentStatus === "ACTIVE") {
            toast.success("Your faculty access has been approved.", {
              description: "Redirecting to Faculty Portal...",
            });
            try {
              localStorage.setItem("apollo_user_status", "ACTIVE");
            } catch {}
            refreshClaims().then(() => {
              navigate("/faculty/events", { replace: true });
            });
          }
        }
      },
      (error) => {
        console.warn("[PendingPage] onSnapshot listener notice:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [uid, navigate, refreshClaims]);

  // "Check Status Now" fresh Firestore read
  const handleCheckStatusNow = useCallback(async () => {
    if (!uid) return;
    setIsCheckingStatus(true);

    try {
      // 1. Direct fetch users/{uid}
      const userDocRef = doc(db, "users", uid);
      const snap = await getDoc(userDocRef);
      let userData: any = snap.exists() ? snap.data() : null;

      // Fallback query if document not stored by UID directly
      if (!userData && currentUser.email) {
        const qByEmail = query(
          collection(db, "users"),
          where("email", "==", currentUser.email.toLowerCase().trim())
        );
        const emailSnap = await getDocs(qByEmail);
        if (!emailSnap.empty) {
          userData = emailSnap.docs[0].data();
        }
      }

      if (!userData) {
        // Also check facultyApplications
        const qApp = query(
          collection(db, "facultyApplications"),
          where("uid", "==", uid)
        );
        const appSnap = await getDocs(qApp);
        if (!appSnap.empty) {
          userData = appSnap.docs[0].data();
        }
      }

      const rawStatus = String(userData?.status || "").toUpperCase();
      const currentStatus: UserStatus =
        rawStatus === "ACTIVE" || rawStatus === "APPROVED"
          ? "ACTIVE"
          : rawStatus === "REJECTED"
          ? "REJECTED"
          : "PENDING_APPROVAL";

      setLiveStatus(currentStatus);
      if (userData?.rejectionReason) {
        setLiveRejectionReason(userData.rejectionReason);
      }

      if (currentStatus === "ACTIVE") {
        toast.success("Your faculty access has been approved.", {
          description: "Access confirmed! Entering Faculty Portal...",
        });
        try {
          localStorage.setItem("apollo_user_status", "ACTIVE");
        } catch {}
        await refreshClaims();
        navigate("/faculty/events", { replace: true });
      } else if (currentStatus === "REJECTED") {
        toast.error("Your application was rejected.", {
          description: "Your faculty access request was rejected. Please contact the administrator.",
        });
      } else {
        toast.info("Your application is still under review.", {
          description: "Your faculty access request is still awaiting administrator approval.",
        });
      }
    } catch (err: any) {
      console.error("[PendingPage] Error checking status:", err);
      toast.error("Status Check Notice", {
        description: err.message || "Unable to retrieve status. Please try again.",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [uid, currentUser.email, navigate, refreshClaims]);

  const effectiveStatus = liveStatus || status || (profile?.status as UserStatus);
  const isRejected = effectiveStatus === "REJECTED";
  const isApproved = effectiveStatus === "ACTIVE";

  const displayName = profile?.displayName || firebaseUser.displayName || "Campus Member";
  const userEmail = profile?.email || firebaseUser.email || "";
  const roleName = profile?.role || role || "faculty";
  const department = profile?.department || "School of Technology";
  const submittedAt = profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : "Recently";
  const idNumber = profile?.rollNumber || profile?.employeeId || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <AppNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-lg">
          <Card className="border-slate-200/90 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
            {/* Header */}
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
                <div className="text-xs font-bold uppercase tracking-widest text-[#004D61]">
                  The Apollo University &bull; Access Gate
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
                    {liveRejectionReason ||
                      profile?.rejectionReason ||
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
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-[#E0F3F7]/50 py-2.5 px-4 rounded-xl border border-[#B2E3EC]">
                  <RefreshCw className="w-3.5 h-3.5 text-[#007A99] animate-spin shrink-0" />
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
                  <Link to="/faculty/events">
                    <span>Go to Faculty Portal</span>
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
                  <a href="mailto:support@apollouniversity.edu.in?subject=Apollo%20Event%20Hub%20Access%20Appeal">
                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                    <span>Contact Support</span>
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCheckingStatus}
                  onClick={handleCheckStatusNow}
                  className="text-[#007A99] border-[#007A99]/30 hover:bg-[#E0F3F7] w-full sm:w-auto font-bold"
                >
                  {isCheckingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Checking status...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      <span>Check Status Now</span>
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default PendingPage;
