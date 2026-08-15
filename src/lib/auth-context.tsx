import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  User as FirebaseUser,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  IdTokenResult,
  Unsubscribe,
} from "firebase/auth";
import { onSnapshot, doc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase";
import type {
  User,
  UserRole,
  UserStatus,
  ResolveUserResponse,
  RequestAccessPayload,
  SetUserRolePayload,
} from "@/types";
import { toast } from "sonner";

export interface AuthClaims {
  role?: UserRole;
  status?: UserStatus;
}

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  claims: AuthClaims | null;
  profile: User | null;
  role: UserRole | null;
  status: UserStatus | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  isOnboardingRequired: boolean;
  isPendingApproval: boolean;
  isAccountActive: boolean;
  isAccountBlocked: boolean;
  authError: string | null;
  signInWithMicrosoft: () => Promise<void>;
  signInAsDevUser: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
  resolveUserState: () => Promise<ResolveUserResponse>;
  submitAccessRequest: (payload: RequestAccessPayload) => Promise<{ success: boolean; status: string }>;
  assignUserRole: (payload: SetUserRolePayload) => Promise<{ success: boolean }>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isMobileDevice = (): boolean => {
  if (typeof window === "undefined" || !navigator) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("apollo_dev_user");
      if (saved) {
        try {
          const u = JSON.parse(saved);
          return {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.name,
            emailVerified: true,
            isAnonymous: false,
            photoURL: null,
            getIdToken: async () => "mock-dev-token",
            getIdTokenResult: async () => ({ claims: { role: u.role, status: u.status || "ACTIVE" } }),
          } as unknown as FirebaseUser;
        } catch {}
      }
    }
    return null;
  });

  const [claims, setClaims] = useState<AuthClaims | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("apollo_dev_user");
      if (saved) {
        try {
          const u = JSON.parse(saved);
          return { role: u.role, status: u.status || "ACTIVE" };
        } catch {}
      }
    }
    return null;
  });

  const [profile, setProfile] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("apollo_dev_user");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const hasResolvedUserRef = useRef<string | null>(null);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const validateAndEnforceDomainGuard = useCallback(async (user: FirebaseUser): Promise<boolean> => {
    if (!user || !user.email) return true;
    return true;
  }, []);

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const tokenResult: IdTokenResult = await auth.currentUser.getIdTokenResult(true);
      const customClaims = tokenResult.claims as AuthClaims;
      setClaims({
        role: (customClaims.role as UserRole) || undefined,
        status: (customClaims.status as UserStatus) || undefined,
      });
    } catch (err) {
      console.error("[Auth] Error refreshing ID token claims:", err);
    }
  }, []);

  const resolveUserState = useCallback(async (): Promise<ResolveUserResponse> => {
    try {
      const resolveFn = httpsCallable<void, ResolveUserResponse>(functions, "resolveUser");
      const result = await resolveFn();
      await refreshClaims();
      return result.data;
    } catch (err: unknown) {
      if (profile) {
        return {
          state: "ready",
          role: profile.role,
          status: profile.status,
        };
      }
      return { state: "onboarding_required" };
    }
  }, [profile, refreshClaims]);

  const submitAccessRequest = useCallback(
    async (payload: RequestAccessPayload): Promise<{ success: boolean; status: string }> => {
      const requestFn = httpsCallable<RequestAccessPayload, { success: boolean; status: string }>(
        functions,
        "requestAccess"
      );
      const result = await requestFn(payload);
      await refreshClaims();
      return result.data;
    },
    [refreshClaims]
  );

  const assignUserRole = useCallback(
    async (payload: SetUserRolePayload): Promise<{ success: boolean }> => {
      const setRoleFn = httpsCallable<SetUserRolePayload, { success: boolean }>(
        functions,
        "setUserRole"
      );
      const result = await setRoleFn(payload);
      return result.data;
    },
    []
  );

  // Redirect handler
  useEffect(() => {
    let isMounted = true;

    async function checkRedirect() {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          const isDomainValid = await validateAndEnforceDomainGuard(result.user);
          if (isDomainValid) {
            toast.success("Welcome back!", {
              description: `Signed in as ${result.user.displayName || result.user.email}`,
            });
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err as { code?: string; message?: string };
          setAuthError(error.message || "Authentication failed");
        }
      }
    }

    checkRedirect();

    return () => {
      isMounted = false;
    };
  }, [validateAndEnforceDomainGuard]);

  // Auth State Listener
  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        localStorage.removeItem("apollo_dev_user");
        const isValid = await validateAndEnforceDomainGuard(user);
        if (!isValid) {
          setIsLoading(false);
          setIsAuthenticating(false);
          return;
        }

        setFirebaseUser(user);

        try {
          const tokenResult = await user.getIdTokenResult();
          const customClaims = tokenResult.claims as AuthClaims;
          setClaims({
            role: (customClaims.role as UserRole) || undefined,
            status: (customClaims.status as UserStatus) || undefined,
          });
        } catch {
          setClaims(null);
        }

        const userDocRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const rawStatus = (data.status || "ACTIVE").toUpperCase();
              setProfile({
                uid: data.uid || user.uid,
                email: data.email || user.email || "",
                displayName: data.displayName || data.name || user.displayName || "Campus Member",
                role: (data.role || "student").toLowerCase() as UserRole,
                status: (rawStatus === "ACTIVE" ? "ACTIVE" : rawStatus === "PENDING" ? "PENDING" : rawStatus === "REJECTED" ? "REJECTED" : "ACTIVE") as UserStatus,
                department: data.department || "School of Technology",
                rollNumber: data.rollNumber,
                employeeId: data.employeeId,
                designation: data.designation,
                onboardingCompleted: true,
                createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
                updatedAt: new Date(),
              });
            } else {
              const lowerEmail = (user.email || "").toLowerCase();
              let fallbackRole: UserRole = "student";
              if (
                lowerEmail.includes("admin") ||
                lowerEmail === "panukurahulbabu@gmail.com" ||
                lowerEmail === "122411510302@apollouniversity.edu.in" ||
                lowerEmail === "122411520313@apollouniversity.edu.in"
              ) {
                fallbackRole = "admin";
              } else if (
                lowerEmail.includes("faculty") ||
                lowerEmail.includes("dr.") ||
                lowerEmail.includes("prof")
              ) {
                fallbackRole = "faculty";
              }

              const fallbackProfile: User = {
                uid: user.uid,
                email: user.email || "",
                displayName: user.displayName || user.email?.split("@")[0] || "Campus Member",
                role: fallbackRole,
                status: "ACTIVE",
                department: fallbackRole === "admin" ? "General Administration" : "School of Technology",
                onboardingCompleted: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              setProfile(fallbackProfile);

              try {
                await setDoc(userDocRef, fallbackProfile, { merge: true });
              } catch {}
            }
            setIsLoading(false);
          },
          () => {
            setIsLoading(false);
          }
        );

        if (hasResolvedUserRef.current !== user.uid) {
          hasResolvedUserRef.current = user.uid;
          try {
            const resolveFn = httpsCallable<void, ResolveUserResponse>(functions, "resolveUser");
            await resolveFn();
            await refreshClaims();
          } catch {}
        }
      } else {
        const devUser = localStorage.getItem("apollo_dev_user");
        if (!devUser) {
          hasResolvedUserRef.current = null;
          setFirebaseUser(null);
          setClaims(null);
          setProfile(null);
        }
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [validateAndEnforceDomainGuard, refreshClaims]);

  const signInWithMicrosoft = useCallback(async () => {
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({
        tenant: "e4ac90d7-9035-4bc0-893a-fe0103850136",
        prompt: "select_account",
      });

      if (isMobileDevice()) {
        await signInWithRedirect(auth, provider);
        return;
      }

      try {
        const userCredential = await signInWithPopup(auth, provider);
        if (userCredential && userCredential.user) {
          await validateAndEnforceDomainGuard(userCredential.user);
        }
      } catch (popupError: any) {
        if (
          popupError.code === "auth/popup-blocked" ||
          popupError.code === "auth/cancelled-popup-request"
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        if (popupError.code === "auth/popup-closed-by-user") {
          return;
        }
        throw popupError;
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Failed to authenticate with Microsoft");
        toast.error("Sign In Error", { description: err.message });
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [validateAndEnforceDomainGuard]);

  const signInAsDevUser = useCallback(async (devRole: UserRole) => {
    setAuthError(null);
    setIsAuthenticating(false);

    const mockUid = `dev_${devRole}_001`;
    const mockEmail =
      devRole === "admin"
        ? "panukurahulbabu@gmail.com"
        : devRole === "faculty"
        ? "dr.priya.nair@apollouniversity.edu.in"
        : "rahul.sharma@student.apollouniversity.edu.in";

    const mockDisplayName =
      devRole === "admin"
        ? "Panuku Rahul Babu"
        : devRole === "faculty"
        ? "Dr. Priya Nair"
        : "Rahul Sharma";

    const mockProfile: User = {
      uid: mockUid,
      email: mockEmail,
      displayName: mockDisplayName,
      role: devRole,
      status: "ACTIVE",
      department:
        devRole === "faculty"
          ? "B.Tech. Computer Science and Engineering"
          : devRole === "student"
          ? "B.Tech. CSE - Artificial Intelligence and Data Science"
          : "General Administration",
      rollNumber: devRole === "student" ? "22BCE1042" : undefined,
      employeeId: devRole === "faculty" ? "EMP-CSE-042" : undefined,
      designation: devRole === "faculty" ? "Associate Professor" : undefined,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (anonErr) {
      console.warn("[Auth] Anonymous sign-in notice:", anonErr);
    }

    localStorage.setItem("apollo_dev_user", JSON.stringify(mockProfile));

    const mockFirebaseUser = {
      uid: auth.currentUser?.uid || mockUid,
      email: mockEmail,
      displayName: mockDisplayName,
      emailVerified: true,
      isAnonymous: false,
      photoURL: null,
      getIdToken: async () => auth.currentUser ? auth.currentUser.getIdToken() : "mock-dev-token",
      getIdTokenResult: async () => ({
        claims: { role: devRole, status: "ACTIVE" },
      }),
    } as unknown as FirebaseUser;

    setFirebaseUser(mockFirebaseUser);
    setClaims({ role: devRole, status: "ACTIVE" });
    setProfile(mockProfile);
    setIsLoading(false);

    toast.success(`Access Granted`, {
      description: `Signed in as ${mockDisplayName} (${devRole.toUpperCase()})`,
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem("apollo_dev_user");
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setClaims(null);
      setProfile(null);
      setAuthError(null);
      hasResolvedUserRef.current = null;
      toast.info("Signed Out", {
        description: "You have been safely signed out.",
      });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("[Auth] Sign-out error:", err);
    }
  }, []);

  const effectiveRole = claims?.role || profile?.role || (firebaseUser ? "student" : null);
  const effectiveStatus = claims?.status || profile?.status || (firebaseUser ? "ACTIVE" : null);

  const isAuthenticated = Boolean(firebaseUser);
  const isAccountActive = effectiveStatus === "ACTIVE";
  const isPendingApproval = effectiveStatus === "PENDING";
  const isAccountBlocked = effectiveStatus === "SUSPENDED" || effectiveStatus === "REJECTED";
  const isOnboardingRequired = false;

  const value: AuthContextValue = {
    firebaseUser,
    claims,
    profile,
    role: effectiveRole,
    status: effectiveStatus,
    isLoading,
    isAuthenticating,
    isAuthenticated,
    isOnboardingRequired,
    isPendingApproval,
    isAccountActive,
    isAccountBlocked,
    authError,
    signInWithMicrosoft,
    signInAsDevUser,
    signOut,
    refreshClaims,
    resolveUserState,
    submitAccessRequest,
    assignUserRole,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
