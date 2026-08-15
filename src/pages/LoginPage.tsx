import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  Loader2,
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import type { UserRole } from "@/types";
import { toast } from "sonner";

const BTECH_BRANCHES = [
  "B.Tech. Computer Science and Engineering",
  "B.Tech. CSE - Artificial Intelligence and Data Science",
  "B.Tech. CSE - Artificial Intelligence and Machine Learning",
  "B.Tech. CSE - Cyber Security",
  "B.Tech. CSE - Cloud Computing",
  "B.Tech. CSE - AI & Health Care Technology",
];

export const LoginPage: React.FC = () => {
  const {
    signInWithMicrosoft,
    signInAsDevUser,
    isAuthenticating,
    isAuthenticated,
    firebaseUser,
    authError,
    clearAuthError,
  } = useAuth();

  const navigate = useNavigate();

  // Mode: "signin" | "signup"
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  // Sign In Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signInError, setSignInError] = useState<{ message: string; notRegistered?: boolean } | null>(null);
  const [signUpSuccessNotice, setSignUpSuccessNotice] = useState<string | null>(null);

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("");
  const [signUpBranch, setSignUpBranch] = useState(BTECH_BRANCHES[0]);
  const [signUpRollNo, setSignUpRollNo] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to home
  if (isAuthenticated && firebaseUser) {
    return <Navigate to="/" replace />;
  }

  const handleMicrosoftSignIn = async () => {
    clearAuthError();
    setSignInError(null);
    setSignUpSuccessNotice(null);
    try {
      await signInWithMicrosoft();
    } catch (err: any) {
      toast.error("Microsoft Sign-In Failed", { description: err.message });
    }
  };

  /**
   * STRICT SIGN IN:
   * Only allows sign-in if user has already signed up in Firebase Auth.
   * If not registered, blocks entry and displays a clear message asking them to Sign Up first.
   */
  const handleDirectSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setSignInError(null);
    setSignUpSuccessNotice(null);

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setSignInError({ message: "Please enter both your email address and password." });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Attempt live Firebase Auth Sign In
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      // 2. Fetch User Profile from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let role: UserRole = "student";

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        role = (userData.role || "student").toLowerCase() as UserRole;
      } else {
        if (trimmedEmail.includes("admin") || trimmedEmail === "panukurahulbabu@gmail.com") {
          role = "admin";
        } else if (trimmedEmail.includes("faculty") || trimmedEmail.includes("dr.") || trimmedEmail.includes("prof")) {
          role = "faculty";
        }
      }

      toast.success("Welcome back!", {
        description: `Signed in as ${user.displayName || trimmedEmail}`,
      });

      if (role === "admin") navigate("/admin");
      else if (role === "faculty") navigate("/faculty");
      else navigate("/");
    } catch (firebaseErr: any) {
      console.warn("[Auth] Sign In notice:", firebaseErr.code || firebaseErr.message);

      const code = firebaseErr.code || "";

      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setSignInError({
          message: "No account found with this email. You must Sign Up first before you can Sign In.",
          notRegistered: true,
        });
      } else if (code === "auth/wrong-password") {
        setSignInError({
          message: "Incorrect password. Please verify your credentials and try again.",
        });
      } else if (code === "auth/invalid-email") {
        setSignInError({
          message: "Please enter a valid email address format.",
        });
      } else if (code === "auth/too-many-requests") {
        setSignInError({
          message: "Access temporarily blocked due to multiple failed attempts. Please try again later.",
        });
      } else {
        setSignInError({
          message: firebaseErr.message || "Failed to sign in. Please verify your credentials.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * SIGN UP:
   * 1. Creates real user in Firebase Authentication & creates their student document in Firestore.
   * 2. Signs out so they must explicitly log in through Sign In page.
   * 3. Redirects to the Sign In tab with email pre-filled and displays success notification.
   */
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setSignUpError(null);
    setSignInError(null);

    const trimmedName = signUpName.trim();
    const trimmedEmail = signUpEmail.toLowerCase().trim();
    const trimmedRollNo = signUpRollNo.trim().toUpperCase();

    if (!trimmedName || !trimmedEmail || !trimmedRollNo || !signUpPassword) {
      setSignUpError("Please fill all required student details.");
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError("Password and confirmation password do not match.");
      return;
    }

    if (signUpPassword.length < 6) {
      setSignUpError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        signUpPassword
      );
      const user = userCredential.user;

      // 2. Set Display Name in Firebase Auth
      await updateProfile(user, { displayName: trimmedName });

      // 3. Save Student Document in Cloud Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: trimmedEmail,
          displayName: trimmedName,
          name: trimmedName,
          role: "student",
          status: "ACTIVE",
          department: signUpBranch,
          rollNumber: trimmedRollNo,
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // 4. Sign out so user explicitly signs in from the Sign In tab
      await firebaseSignOut(auth);

      // 5. Switch to Sign In tab and pre-fill email
      setEmail(trimmedEmail);
      setPassword("");
      setSignUpPassword("");
      setSignUpConfirmPassword("");
      setAuthMode("signin");
      setSignUpSuccessNotice(
        `Account created successfully for ${trimmedName}! Please enter your password to Sign In.`
      );

      toast.success("Account Created Successfully!", {
        description: "Please enter your password to Sign In.",
      });
    } catch (err: any) {
      console.warn("[Auth] Sign Up error:", err.code, err.message);

      if (err.code === "auth/email-already-in-use") {
        setSignUpError("An account with this email already exists. Please switch to Sign In.");
      } else if (err.code === "auth/invalid-email") {
        setSignUpError("Invalid email address format. Please check your email.");
      } else if (err.code === "auth/weak-password") {
        setSignUpError("Password is too weak. Please use at least 6 characters.");
      } else {
        setSignUpError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F0F9FB]">
      <div className="w-full max-w-md space-y-4">
        {/* Main Card */}
        <Card className="border-slate-200/90 shadow-xl rounded-2xl bg-white overflow-hidden">
          {/* Official University Header */}
          <div className="bg-gradient-to-r from-[#004D61] via-[#006883] to-[#007A99] p-6 text-white text-center space-y-3">
            <div className="bg-white/95 rounded-xl p-2.5 inline-block shadow-md">
              <img
                src="/apollo-logo.png"
                alt="The Apollo University"
                className="h-12 w-auto mx-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight uppercase">
                School of Technology
              </h1>
              <p className="text-xs text-cyan-100 font-medium">
                B.Tech Student &amp; Faculty Event Hub Portal
              </p>
            </div>
          </div>

          <CardHeader className="pt-4 pb-2 px-6">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setSignInError(null);
                  setSignUpError(null);
                  clearAuthError();
                }}
                className={`py-2 rounded-lg transition-all ${
                  authMode === "signin"
                    ? "bg-[#007A99] text-white shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setSignInError(null);
                  setSignUpError(null);
                  setSignUpSuccessNotice(null);
                  clearAuthError();
                }}
                className={`py-2 rounded-lg transition-all ${
                  authMode === "signup"
                    ? "bg-[#007A99] text-white shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                Sign Up
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6">
            {authError && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="font-bold">Authentication Notice</AlertTitle>
                <AlertDescription className="text-[11px] mt-0.5">{authError}</AlertDescription>
              </Alert>
            )}

            {/* TAB 1: SIGN IN FORM */}
            {authMode === "signin" && (
              <form onSubmit={handleDirectSignIn} className="space-y-3.5">
                {signUpSuccessNotice && (
                  <Alert className="py-2.5 text-xs border-emerald-300 bg-emerald-50 text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="font-bold text-xs text-emerald-800">Sign Up Successful!</AlertTitle>
                    <AlertDescription className="text-[11px] mt-0.5 text-emerald-700">
                      {signUpSuccessNotice}
                    </AlertDescription>
                  </Alert>
                )}

                {signInError && (
                  <Alert variant="destructive" className="py-2.5 text-xs border-red-200 bg-red-50 text-red-900">
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                    <AlertTitle className="font-bold text-xs">Sign In Failed</AlertTitle>
                    <AlertDescription className="text-[11px] mt-1 space-y-2">
                      <p>{signInError.message}</p>
                      {signInError.notRegistered && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSignUpEmail(email);
                            setAuthMode("signup");
                            setSignInError(null);
                            setSignUpSuccessNotice(null);
                          }}
                          className="h-7 text-[11px] bg-[#007A99] hover:bg-[#006883] text-white rounded-lg gap-1.5 mt-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Switch to Sign Up Tab</span>
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (signInError) setSignInError(null);
                      }}
                      placeholder="student@student.apollouniversity.edu.in"
                      className="h-10 pl-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">Password</Label>
                    <a href="#forgot" className="text-[11px] font-semibold text-[#007A99] hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (signInError) setSignInError(null);
                      }}
                      placeholder="••••••••••••"
                      className="h-10 pl-9 pr-9 text-xs rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-[#007A99] focus:ring-[#007A99]"
                    />
                    <span className="text-xs text-slate-600">Remember this device</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || isAuthenticating}
                  className="w-full h-11 bg-[#007A99] hover:bg-[#006883] text-white font-bold text-xs rounded-xl shadow-md transition-all gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Event Hub</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* TAB 2: SIGN UP FORM */}
            {authMode === "signup" && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3" autoComplete="off">
                {signUpError && (
                  <Alert variant="destructive" className="py-2.5 text-xs">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle className="font-bold text-xs">Registration Notice</AlertTitle>
                    <AlertDescription className="text-[11px] mt-0.5">{signUpError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Full Name (as per Student ID)</Label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      required
                      autoComplete="off"
                      value={signUpName}
                      onChange={(e) => {
                        setSignUpName(e.target.value);
                        if (signUpError) setSignUpError(null);
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="h-9 pl-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">B.Tech Specialization</Label>
                  <Select value={signUpBranch} onValueChange={setSignUpBranch}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Select B.Tech Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BTECH_BRANCHES.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Roll Number</Label>
                    <Input
                      required
                      autoComplete="off"
                      value={signUpRollNo}
                      onChange={(e) => {
                        setSignUpRollNo(e.target.value.toUpperCase());
                        if (signUpError) setSignUpError(null);
                      }}
                      placeholder="22BCE1042"
                      className="h-9 text-xs rounded-xl uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                    <Input
                      type="email"
                      required
                      autoComplete="off"
                      value={signUpEmail}
                      onChange={(e) => {
                        setSignUpEmail(e.target.value);
                        if (signUpError) setSignUpError(null);
                      }}
                      placeholder="student@student.apollouniversity.edu.in"
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Password</Label>
                    <Input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={signUpPassword}
                      onChange={(e) => {
                        setSignUpPassword(e.target.value);
                        if (signUpError) setSignUpError(null);
                      }}
                      placeholder="••••••••"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Confirm Password</Label>
                    <Input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={signUpConfirmPassword}
                      onChange={(e) => {
                        setSignUpConfirmPassword(e.target.value);
                        if (signUpError) setSignUpError(null);
                      }}
                      placeholder="••••••••"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 bg-[#007A99] hover:bg-[#006883] text-white font-bold text-xs rounded-xl shadow-md mt-2 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account in Firebase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Sign Up</span>
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                <span className="bg-white px-2">Institutional Single Sign-On</span>
              </div>
            </div>

            {/* Microsoft Entra ID SSO Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleMicrosoftSignIn}
              disabled={isAuthenticating}
              className="w-full h-10 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2.5 shadow-2xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <span>Continue with Microsoft Outlook</span>
            </Button>
          </CardContent>

          {/* Footer */}
          <CardFooter className="flex items-center justify-center border-t bg-slate-50/80 px-6 py-3.5 text-xs text-slate-500">
            <Link to="/help" className="text-[#007A99] hover:underline flex items-center gap-1.5 font-medium">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Student IT Helpdesk &amp; Technical Support</span>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
export default LoginPage;
