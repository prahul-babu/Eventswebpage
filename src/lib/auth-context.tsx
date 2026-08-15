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
  signInWithEmailAndPassword,
  signInAnonymously,
  IdTokenResult,
  Unsubscribe,
} from "firebase/auth";
import { onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
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

/**
 * Exact Role / Status Routing Rules:
 * student + ACTIVE → Student Dashboard (/)
 * faculty + PENDING → Faculty Pending Approval (/pending)
 * faculty + ACTIVE → Faculty Dashboard (/faculty)
 * admin + ACTIVE → Admin Dashboard (/admin)
 */
export function getPostLoginRoute(
  role?: UserRole | null,
  status?: UserStatus | null
): string {
  const effRole: UserRole = (role || "student").toLowerCase() as UserRole;
  const effStatus: UserStatus = (status || "ACTIVE").toUpperCase() as UserStatus;

  if (effStatus === "SUSPENDED" || effStatus === "REJECTED") {
    return "/account-blocked";
  }

  if (effRole === "faculty" && effStatus === "PENDING") {
    return "/pending";
  }

  if (effRole === "faculty" && effStatus === "ACTIVE") {
    return "/faculty";
  }

  if (effRole === "admin" && effStatus === "ACTIVE") {
    return "/admin";
  }

  // student + ACTIVE (or default)
  return "/";
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
  loginWithEmail: (
    email: string,
    pass: string,
    selectedRole: UserRole
  ) => Promise<{ user: FirebaseUser; role: UserRole; status: UserStatus }>;
  signInWithMicrosoft: () => Promise<void>;
  signInAsDevUser: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
  resolveUserState: () => Promise<ResolveUserResponse>;
  submitAccessRequest: (
    payload: RequestAccessPayload
  ) => Promise<{ success: boolean; status: string }>;
  assignUserRole: (payload: SetUserRolePayload) => Promise<{ success: boolean }>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isMobileDevice = (): boolean => {
  if (typeof window === "undefined" || !navigator) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(
    () => auth.currentUser
  );

  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const hasResolvedUserRef = useRef<string | null>(null);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const tokenResult: IdTokenResult =
        await auth.currentUser.getIdTokenResult(true);
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
      const resolveFn = httpsCallable<void, ResolveUserResponse>(
        functions,
        "resolveUser"
      );
      const result = await resolveFn();
      await refreshClaims();
      return result.data;
    } catch {
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
    async (
      payload: RequestAccessPayload
    ): Promise<{ success: boolean; status: string }> => {
      const requestFn = httpsCallable<
        RequestAccessPayload,
        { success: boolean; status: string }
      >(functions, "requestAccess");
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

  /**
   * DIRECT EMAIL / PASSWORD SIGN IN:
   * 1. Authenticate with Firebase Auth
   * 2. Get auth.currentUser.uid
   * 3. Read users/{auth.currentUser.uid}
   * 4. Read role & status
   * 5. Set user profile & state
   */
  const loginWithEmail = useCallback(
    async (
      emailStr: string,
      passwordStr: string,
      selectedRole: UserRole
    ): Promise<{ user: FirebaseUser; role: UserRole; status: UserStatus }> => {
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        const trimmedEmail = emailStr.toLowerCase().trim();
        const userCredential = await signInWithEmailAndPassword(
          auth,
          trimmedEmail,
          passwordStr
        );
        const user = userCredential.user;

        setFirebaseUser(user);

        // 1. Get auth.currentUser.uid & 2. Read users/{uid}
        const userDocRef = doc(db, "users", user.uid);
        let existingData: any = {};
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            existingData = snap.data();
          }
        } catch (e) {
          console.warn("[Auth] Firestore read notice:", e);
        }

        // 3. Read role & 4. Read status
        let effectiveRole: UserRole = "student";
        let effectiveStatus: UserStatus = "ACTIVE";

        if (existingData.role) {
          effectiveRole = existingData.role.toLowerCase() as UserRole;
        } else {
          effectiveRole = selectedRole || "student";
        }

        if (existingData.status) {
          const rawStatus = String(existingData.status).toUpperCase();
          effectiveStatus = (
            rawStatus === "PENDING"
              ? "PENDING"
              : rawStatus === "SUSPENDED"
              ? "SUSPENDED"
              : rawStatus === "REJECTED"
              ? "REJECTED"
              : "ACTIVE"
          ) as UserStatus;
        } else {
          effectiveStatus = (
            effectiveRole === "faculty" ? "PENDING" : "ACTIVE"
          ) as UserStatus;
        }

        const userProfile: User = {
          uid: user.uid,
          email: user.email || trimmedEmail,
          displayName:
            existingData.displayName ||
            user.displayName ||
            trimmedEmail.split("@")[0],
          role: effectiveRole,
          status: effectiveStatus,
          department:
            existingData.department ||
            (effectiveRole === "admin"
              ? "Institutional Administration"
              : "School of Technology"),
          rollNumber: existingData.rollNumber,
          employeeId: existingData.employeeId,
          onboardingCompleted: true,
          createdAt: existingData.createdAt
            ? existingData.createdAt.toDate
              ? existingData.createdAt.toDate()
              : new Date(existingData.createdAt)
            : new Date(),
          updatedAt: new Date(),
        };

        setProfile(userProfile);
        setClaims({ role: effectiveRole, status: effectiveStatus });

        // Save to Firestore in background
        setDoc(userDocRef, userProfile, { merge: true }).catch((err) => {
          console.warn("[Auth] Profile background sync notice:", err);
        });

        return { user, role: effectiveRole, status: effectiveStatus };
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
  );

  // Redirect handler for OAuth
  useEffect(() => {
    let isMounted = true;

    async function checkRedirect() {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          toast.success("Welcome back!", {
            description: `Signed in as ${
              result.user.displayName || result.user.email
            }`,
          });
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
  }, []);

  /**
   * AUTH STATE LISTENER (Runs on page load & after OAuth / Sign In):
   * 1. Get auth.currentUser.uid
   * 2. Read users/{auth.currentUser.uid}
   * 3. Read role
   * 4. Read status
   * 5. Set state (never kicks user out while reading or if doc is being created)
   */
  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);

        const lowerEmail = (user.email || "").toLowerCase();
        // Fallback role only if doc is missing:
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

        const userDocRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const parsedRole = (data.role || fallbackRole).toLowerCase() as UserRole;
              const rawStatus = (data.status || "ACTIVE").toUpperCase();
              const parsedStatus = (
                rawStatus === "PENDING"
                  ? "PENDING"
                  : rawStatus === "SUSPENDED"
                  ? "SUSPENDED"
                  : rawStatus === "REJECTED"
                  ? "REJECTED"
                  : "ACTIVE"
              ) as UserStatus;

              setProfile({
                uid: data.uid || user.uid,
                email: data.email || user.email || "",
                displayName:
                  data.displayName ||
                  data.name ||
                  user.displayName ||
                  "Campus Member",
                role: parsedRole,
                status: parsedStatus,
                department: data.department || "School of Technology",
                rollNumber: data.rollNumber,
                employeeId: data.employeeId,
                designation: data.designation,
                onboardingCompleted: true,
                createdAt: data.createdAt
                  ? data.createdAt.toDate
                    ? data.createdAt.toDate()
                    : new Date(data.createdAt)
                  : new Date(),
                updatedAt: new Date(),
              });
              setClaims({
                role: parsedRole,
                status: parsedStatus,
              });
            } else {
              // Document does not exist yet: create default profile without kicking user out
              const fallbackStatus: UserStatus =
                fallbackRole === "faculty" ? "PENDING" : "ACTIVE";

              const fallbackProfile: User = {
                uid: user.uid,
                email: user.email || "",
                displayName:
                  user.displayName ||
                  user.email?.split("@")[0] ||
                  "Campus Member",
                role: fallbackRole,
                status: fallbackStatus,
                department:
                  fallbackRole === "admin"
                    ? "Institutional Administration"
                    : "School of Technology",
                onboardingCompleted: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              setProfile(fallbackProfile);
              setClaims({ role: fallbackRole, status: fallbackStatus });

              setDoc(userDocRef, fallbackProfile, { merge: true }).catch(() => {});
            }
            setIsLoading(false);
          },
          () => {
            setIsLoading(false);
          }
        );
      } else {
        setFirebaseUser(null);
        setClaims(null);
        setProfile(null);
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
  }, []);

  // Microsoft OAuth Login (Single tenant configuration preserved)
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
        await signInWithPopup(auth, provider);
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
  }, []);

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

    const mockFirebaseUser = {
      uid: auth.currentUser?.uid || mockUid,
      email: mockEmail,
      displayName: mockDisplayName,
      emailVerified: true,
      isAnonymous: false,
      photoURL: null,
      getIdToken: async () =>
        auth.currentUser ? auth.currentUser.getIdToken() : "mock-dev-token",
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

  const effectiveRole =
    claims?.role || profile?.role || (firebaseUser ? "student" : null);
  const effectiveStatus =
    claims?.status || profile?.status || (firebaseUser ? "ACTIVE" : null);

  const isAuthenticated = Boolean(firebaseUser);
  const isAccountActive = effectiveStatus === "ACTIVE";
  const isPendingApproval = effectiveStatus === "PENDING";
  const isAccountBlocked =
    effectiveStatus === "SUSPENDED" || effectiveStatus === "REJECTED";
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
    loginWithEmail,
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
