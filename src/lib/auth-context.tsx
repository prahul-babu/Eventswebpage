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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  IdTokenResult,
  Unsubscribe,
} from "firebase/auth";
import { onSnapshot, doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
  signUpWithEmail: (payload: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    department: string;
    rollNumber?: string;
    employeeId?: string;
  }) => Promise<{ user: FirebaseUser; role: UserRole; status: UserStatus }>;
  signInWithMicrosoft: () => Promise<void>;
  signInAsDevUser: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
  resolveUserState: () => Promise<ResolveUserResponse>;
  submitAccessRequest: (
    payload: RequestAccessPayload
  ) => Promise<{ success: boolean; status: string }>;
  assignUserRole: (payload: SetUserRolePayload) => Promise<{ success: boolean }>;
  switchRole: (newRole: UserRole) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(
    () => auth.currentUser
  );

  const [cachedRole, setCachedRole] = useState<UserRole | null>(() => {
    try {
      return (localStorage.getItem("apollo_user_role") as UserRole) || null;
    } catch {
      return null;
    }
  });

  const [cachedStatus, setCachedStatus] = useState<UserStatus | null>(() => {
    try {
      return (localStorage.getItem("apollo_user_status") as UserStatus) || null;
    } catch {
      return null;
    }
  });

  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const hasResolvedUserRef = useRef<string | null>(null);

  const persistUserRole = useCallback((r: UserRole, s: UserStatus) => {
    try {
      localStorage.setItem("apollo_user_role", r);
      localStorage.setItem("apollo_user_status", s);
    } catch {}
    setCachedRole(r);
    setCachedStatus(s);
  }, []);

  const clearPersistedRole = useCallback(() => {
    try {
      localStorage.removeItem("apollo_user_role");
      localStorage.removeItem("apollo_user_status");
    } catch {}
    setCachedRole(null);
    setCachedStatus(null);
  }, []);

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

        console.log("AUTH STATE:", {
          uid: user?.uid,
          email: user?.email,
          provider: user?.providerData?.map((p) => p.providerId),
        });

        setFirebaseUser(user);

        // 1. Get auth.currentUser.uid & 2. Read users/{uid}
        console.log("FIRESTORE USER PATH:", `users/${user.uid}`);
        const userDocRef = doc(db, "users", user.uid);
        let userData: any = null;
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            userData = snap.data();
          }
        } catch (e) {
          console.warn("[Auth] Firestore read notice:", e);
        }
        console.log("FIRESTORE USER DATA:", userData);

        // 3. Read role & status
        let effectiveRole: UserRole = selectedRole || "student";
        let effectiveStatus: UserStatus = "ACTIVE";

        if (userData) {
          if (userData.role === "admin" && selectedRole === "admin") {
            effectiveRole = "admin";
          } else if (selectedRole) {
            effectiveRole = selectedRole;
          } else if (userData.role) {
            effectiveRole = userData.role.toLowerCase() as UserRole;
          }

          if (userData.status) {
            const rawStatus = String(userData.status).toUpperCase();
            effectiveStatus = (
              rawStatus === "PENDING"
                ? "PENDING"
                : rawStatus === "SUSPENDED"
                ? "SUSPENDED"
                : rawStatus === "REJECTED"
                ? "REJECTED"
                : "ACTIVE"
            ) as UserStatus;
          }
        } else {
          effectiveRole = selectedRole || "student";
          effectiveStatus = (
            effectiveRole === "faculty" ? "PENDING" : "ACTIVE"
          ) as UserStatus;
        }

        const userProfile: User = {
          uid: user.uid,
          email: user.email || trimmedEmail,
          displayName:
            userData?.displayName ||
            user.displayName ||
            trimmedEmail.split("@")[0],
          role: effectiveRole,
          status: effectiveStatus,
          department:
            userData?.department ||
            (effectiveRole === "admin"
              ? "Institutional Administration"
              : effectiveRole === "faculty"
              ? "Department of Computer Science & Engineering"
              : "School of Technology"),
          rollNumber: userData?.rollNumber,
          employeeId: userData?.employeeId,
          onboardingCompleted: true,
          createdAt: userData?.createdAt
            ? userData.createdAt.toDate
              ? userData.createdAt.toDate()
              : new Date(userData.createdAt)
            : new Date(),
          updatedAt: new Date(),
        };

        setProfile(userProfile);
        setClaims({ role: effectiveRole, status: effectiveStatus });
        persistUserRole(effectiveRole, effectiveStatus);
        setIsLoading(false);

        // Save / update Firestore in background
        setDoc(userDocRef, userProfile, { merge: true }).catch((err) => {
          console.warn("[Auth] Profile background sync notice:", err);
        });

        return { user, role: effectiveRole, status: effectiveStatus };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistUserRole]
  );

  /**
   * DIRECT EMAIL / PASSWORD SIGN UP:
   * 1. Pre-caches selected role in localStorage so frame-0 loaders and listeners recognize the role immediately
   * 2. Creates user in Firebase Auth
   * 3. Sets displayName in Firebase Auth profile
   * 4. Writes authoritative role directly to Firestore users/{uid} BEFORE allowing any redirects
   * 5. Updates React state and resolves cleanly to the selected role portal
   */
  const signUpWithEmail = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName: string;
      role: UserRole;
      department: string;
      rollNumber?: string;
      employeeId?: string;
    }): Promise<{ user: FirebaseUser; role: UserRole; status: UserStatus }> => {
      setIsAuthenticating(true);
      setIsLoading(true);
      setAuthError(null);

      const trimmedEmail = payload.email.toLowerCase().trim();
      const trimmedName = payload.displayName.trim();
      const effRole: UserRole = (payload.role || "student").toLowerCase() as UserRole;
      const effStatus: UserStatus = "ACTIVE";

      // 1. Immediately cache the authoritative selected role
      persistUserRole(effRole, effStatus);

      try {
        // 2. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          payload.password
        );
        const user = userCredential.user;

        // 3. Set display name in Firebase Auth
        try {
          await updateProfile(user, { displayName: trimmedName });
        } catch (e) {
          console.warn("[Auth] updateProfile notice:", e);
        }

        setFirebaseUser(user);

        // 4. Construct complete authoritative profile
        const userProfile: User = {
          uid: user.uid,
          email: user.email || trimmedEmail,
          displayName: trimmedName || user.displayName || trimmedEmail.split("@")[0],
          role: effRole,
          status: effStatus,
          department:
            payload.department ||
            (effRole === "faculty"
              ? "Department of Computer Science & Engineering"
              : "School of Technology"),
          rollNumber: payload.rollNumber ? payload.rollNumber.trim().toUpperCase() : undefined,
          employeeId: payload.employeeId ? payload.employeeId.trim().toUpperCase() : undefined,
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 5. Write to Firestore users/{uid}
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, userProfile, { merge: true });

        // 6. Set state
        setProfile(userProfile);
        setClaims({ role: effRole, status: effStatus });
        persistUserRole(effRole, effStatus);
        setIsLoading(false);

        return { user, role: effRole, status: effStatus };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistUserRole]
  );

  // Startup: Check for redirect result from Microsoft OAuth
  useEffect(() => {
    let isMounted = true;
    console.log("[AUTH-3] Application startup - checking redirect result");

    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        if (result && result.user) {
          console.log("[AUTH-4] OAuth completed", result);
          console.log("[AUTH-5] Firebase user received", result.user);
          console.log("[AUTH-6] UID:", result.user.uid);
          setFirebaseUser(result.user);
        } else {
          console.log("[AUTH-3] No redirect result pending on startup");
        }
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error("[AUTH-ERROR] Authentication error in getRedirectResult:", {
          code: error.code,
          message: error.message,
          customData: error.customData,
          email: error.email,
          credential: error.credential,
        });
        setAuthError(error.message || "Microsoft authentication failed");
        setIsAuthenticating(false);
        toast.error("Microsoft Sign-In Failed", { description: error.message });
      });

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
        console.log("[AUTH-5] Firebase user received", user);
        console.log("[AUTH-6] UID:", user.uid);
        console.log("[AUTH-7] Firestore profile loading: users/" + user.uid);

        const currentLocalRole = (localStorage.getItem("apollo_user_role") as UserRole) || cachedRole || "student";
        const currentLocalStatus = (localStorage.getItem("apollo_user_status") as UserStatus) || cachedStatus || "ACTIVE";

        const fallbackRole: UserRole = currentLocalRole;
        const fallbackStatus: UserStatus = currentLocalStatus;

        const userDocRef = doc(db, "users", user.uid);

        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            let userData: any = null;
            if (docSnap.exists()) {
              userData = docSnap.data();
              console.log("[AUTH-8] Firestore profile received", userData);

              const parsedRole = (userData.role ? String(userData.role).toLowerCase() : currentLocalRole) as UserRole;
              const rawStatus = (userData.status ? String(userData.status).toUpperCase() : "ACTIVE");
              const parsedStatus = (
                rawStatus === "PENDING"
                  ? "PENDING"
                  : rawStatus === "SUSPENDED"
                  ? "SUSPENDED"
                  : rawStatus === "REJECTED"
                  ? "REJECTED"
                  : "ACTIVE"
              ) as UserStatus;

              console.log("[AUTH-9] Role:", parsedRole, "| Status:", parsedStatus);
              const destination = getPostLoginRoute(parsedRole, parsedStatus);
              console.log("[AUTH-10] Route decision:", destination);

              const resolvedProfile: User = {
                uid: userData.uid || user.uid,
                email: userData.email || user.email || "",
                displayName:
                  userData.displayName ||
                  userData.name ||
                  user.displayName ||
                  "Campus Member",
                role: parsedRole,
                status: parsedStatus,
                department: userData.department || "School of Technology",
                rollNumber: userData.rollNumber,
                employeeId: userData.employeeId,
                designation: userData.designation,
                onboardingCompleted: true,
                createdAt: userData.createdAt
                  ? userData.createdAt.toDate
                    ? userData.createdAt.toDate()
                    : new Date(userData.createdAt)
                  : new Date(),
                updatedAt: new Date(),
              };

              setProfile(resolvedProfile);
              setClaims({
                role: parsedRole,
                status: parsedStatus,
              });
              persistUserRole(parsedRole, parsedStatus);
            } else {
              console.log("[AUTH-8] Firestore profile received: (None found by UID, checking by email)");
              
              const currentUid = user.uid;
              const currentEmail = user.email || "";
              const emailKey = currentEmail.toLowerCase().trim();
              let effectiveRole: UserRole = currentLocalRole;
              let effectiveStatus: UserStatus = currentLocalStatus;
              let effectiveDept = effectiveRole === "faculty" ? "Department of Computer Science & Engineering" : "School of Technology";
              let effectiveName = user.displayName || currentEmail.split("@")[0] || "Campus Member";
              let effectiveRoll: string | undefined = undefined;
              let effectiveEmp: string | undefined = undefined;

              const fallbackProfile: User = {
                uid: currentUid,
                email: currentEmail,
                displayName: effectiveName,
                role: effectiveRole,
                status: effectiveStatus,
                department: effectiveDept,
                onboardingCompleted: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              if (emailKey) {
                const emailQ = query(collection(db, "users"), where("email", "==", emailKey));
                getDocs(emailQ)
                  .then((emailSnap) => {
                    if (!emailSnap.empty) {
                      const existingDoc = emailSnap.docs[0].data() as any;
                      if (existingDoc.role) effectiveRole = String(existingDoc.role).toLowerCase() as UserRole;
                      if (existingDoc.status) {
                        const s = String(existingDoc.status).toUpperCase();
                        effectiveStatus = (s === "PENDING" ? "PENDING" : s === "SUSPENDED" ? "SUSPENDED" : s === "REJECTED" ? "REJECTED" : "ACTIVE") as UserStatus;
                      }
                      if (existingDoc.department) effectiveDept = existingDoc.department;
                      if (existingDoc.displayName || existingDoc.name) effectiveName = existingDoc.displayName || existingDoc.name;
                      if (existingDoc.rollNumber) effectiveRoll = existingDoc.rollNumber;
                      if (existingDoc.employeeId) effectiveEmp = existingDoc.employeeId;
                    }

                    console.log("[AUTH-9] Role:", effectiveRole, "| Status:", effectiveStatus);
                    const destination = getPostLoginRoute(effectiveRole, effectiveStatus);
                    console.log("[AUTH-10] Route decision:", destination);

                    const resolvedProfile: User = {
                      uid: currentUid,
                      email: currentEmail || emailKey,
                      displayName: effectiveName,
                      role: effectiveRole,
                      status: effectiveStatus,
                      department: effectiveDept,
                      rollNumber: effectiveRoll,
                      employeeId: effectiveEmp,
                      onboardingCompleted: true,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    };

                    setProfile(resolvedProfile);
                    setClaims({ role: effectiveRole, status: effectiveStatus });
                    persistUserRole(effectiveRole, effectiveStatus);
                    setDoc(userDocRef, resolvedProfile, { merge: true }).catch(() => {});
                    setIsLoading(false);
                    setIsAuthenticating(false);
                  })
                  .catch(() => {
                    setProfile(fallbackProfile);
                    setClaims({ role: fallbackRole, status: fallbackStatus });
                    persistUserRole(fallbackRole, fallbackStatus);
                    setDoc(userDocRef, fallbackProfile, { merge: true }).catch(() => {});
                    setIsLoading(false);
                    setIsAuthenticating(false);
                  });
              } else {
                setProfile(fallbackProfile);
                setClaims({ role: fallbackRole, status: fallbackStatus });
                persistUserRole(fallbackRole, fallbackStatus);
                setDoc(userDocRef, fallbackProfile, { merge: true }).catch(() => {});
                setIsLoading(false);
                setIsAuthenticating(false);
              }
            }
            setIsLoading(false);
            setIsAuthenticating(false);
          },
          (err) => {
            console.error("[AUTH-ERROR] onSnapshot profile read error:", err);
            setIsLoading(false);
            setIsAuthenticating(false);
          }
        );
      } else {
        console.log("[AUTH-5] Firebase user received: null");
        setFirebaseUser(null);
        setClaims(null);
        setProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setIsLoading(false);
        setIsAuthenticating(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Microsoft OAuth Login (Reliable Popup with Redirect Fallback for maximum browser compatibility)
  const signInWithMicrosoft = useCallback(async (): Promise<void> => {
    setAuthError(null);
    setIsAuthenticating(true);
    console.log("[AUTH-1] Microsoft login initiated");

    try {
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({
        tenant: "e4ac90d7-9035-4bc0-893a-fe0103850136",
        prompt: "select_account",
      });

      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        console.warn("[Auth] Popup method returned notice, trying redirect fallback:", popupErr.code);
        if (popupErr.code === "auth/popup-blocked" || popupErr.code === "auth/cancelled-popup-request") {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }

      if (result && result.user) {
        console.log("[AUTH-4] Microsoft login successful:", result.user.email);
        setFirebaseUser(result.user);
        toast.success("Microsoft Login Successful", {
          description: `Welcome, ${result.user.displayName || result.user.email}!`,
        });
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      console.error("[AUTH-ERROR] Microsoft login error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Failed to complete Microsoft Sign-In");
        toast.error("Microsoft Sign-In Failed", { description: err.message });
      }
      throw err;
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
      console.error("LOGIN REDIRECT", {
        currentPath: window.location.pathname,
        firebaseUser: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
        role: profile?.role || null,
        status: status || null,
        reason: "User initiated signOut",
      });
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setClaims(null);
      setProfile(null);
      setAuthError(null);
      hasResolvedUserRef.current = null;
      clearPersistedRole();
      toast.info("Signed Out", {
        description: "You have been safely signed out.",
      });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("[Auth] Sign-out error:", err);
    }
  }, [clearPersistedRole]);

  const hasActiveUser = Boolean(firebaseUser || auth.currentUser);
  const effectiveRole = claims?.role || profile?.role || cachedRole || null;
  const effectiveStatus = claims?.status || profile?.status || cachedStatus || null;

  const isAuthenticated = hasActiveUser;
  const isAccountActive = effectiveStatus === "ACTIVE";
  const isPendingApproval = effectiveStatus === "PENDING";
  const isAccountBlocked =
    effectiveStatus === "SUSPENDED" || effectiveStatus === "REJECTED";
  const isOnboardingRequired = false;

  // Resolving is true while initial auth is checking or while active user's Firestore profile is still loading
  const isAuthResolving = isLoading || (hasActiveUser && !profile && !cachedRole);

  const switchRole = useCallback(async (newRole: UserRole) => {
    const user = auth.currentUser || firebaseUser;
    if (!user) return;
    setIsLoading(true);
    try {
      const targetStatus: UserStatus = "ACTIVE";
      const userDocRef = doc(db, "users", user.uid);
      const updatedProfile: Partial<User> = {
        role: newRole,
        status: targetStatus,
        department:
          newRole === "admin"
            ? "Institutional Administration"
            : newRole === "faculty"
            ? "Department of Computer Science & Engineering"
            : "School of Technology",
        updatedAt: new Date(),
      };
      await setDoc(userDocRef, updatedProfile, { merge: true });
      setClaims({ role: newRole, status: targetStatus });
      persistUserRole(newRole, targetStatus);
      setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
    } catch (err: any) {
      console.error("[Auth] switchRole error:", err);
      toast.error("Failed to switch portal", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, persistUserRole]);

  const value: AuthContextValue = {
    firebaseUser,
    claims,
    profile,
    role: effectiveRole,
    status: effectiveStatus,
    isLoading: isAuthResolving,
    isAuthenticating,
    isAuthenticated,
    isOnboardingRequired,
    isPendingApproval,
    isAccountActive,
    isAccountBlocked,
    authError,
    loginWithEmail,
    signUpWithEmail,
    signInWithMicrosoft,
    signInAsDevUser,
    signOut,
    refreshClaims,
    resolveUserState,
    submitAccessRequest,
    assignUserRole,
    switchRole,
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
