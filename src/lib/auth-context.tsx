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
  FacultyApplication,
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
  isProfileComplete: boolean;
  missingProfileFields: string[];
  authError: string | null;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
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
    school?: string;
    designation?: string;
    phoneNumber?: string;
    alternateEmail?: string;
    rollNumber?: string;
    employeeId?: string;
  }) => Promise<{ user: FirebaseUser; role: UserRole; status: UserStatus }>;
  submitFacultyApplication: (payload: {
    fullName: string;
    officialEmail: string;
    mobileNumber?: string;
    employeeId: string;
    department: string;
    school?: string;
    designation?: string;
    alternateEmail?: string;
  }) => Promise<{ success: boolean; applicationId: string }>;
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

function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !(value && typeof value === "object" && "seconds" in value)
    ) {
      result[key] = sanitizeFirestorePayload(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

  const updateUserProfile = useCallback(
    async (updates: Partial<User>): Promise<void> => {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user session");

      const userDocRef = doc(db, "users", user.uid);

      // Filter out protected system fields to ensure role/status cannot be escalated via user profile edit
      const { uid: _uid, role: _role, status: _status, ...allowedUpdates } = updates as any;

      const cleanUpdates = sanitizeFirestorePayload({
        ...allowedUpdates,
        updatedAt: new Date(),
      });

      await setDoc(userDocRef, cleanUpdates, { merge: true });

      if (cleanUpdates.displayName) {
        try {
          await updateProfile(user, { displayName: cleanUpdates.displayName });
        } catch (e) {
          console.warn("[Auth] updateProfile error:", e);
        }
      }

      setProfile((prev) => (prev ? { ...prev, ...cleanUpdates, updatedAt: new Date() } : null));
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
        let effectiveRole: UserRole = "student";
        let effectiveStatus: UserStatus = "ACTIVE";

        if (userData && userData.role) {
          const r = String(userData.role).toLowerCase().trim();
          if (r === "faculty" || r === "admin" || r === "student") {
            if (selectedRole && selectedRole !== "student") {
              effectiveRole = selectedRole;
            } else {
              effectiveRole = r as UserRole;
            }
          } else {
            effectiveRole = (selectedRole || "student").toLowerCase() as UserRole;
          }
        } else if (selectedRole) {
          effectiveRole = selectedRole.toLowerCase() as UserRole;
        } else if (trimmedEmail.includes("faculty") || trimmedEmail.includes("dr.")) {
          effectiveRole = "faculty";
        } else if (trimmedEmail.includes("admin")) {
          effectiveRole = "admin";
        } else {
          effectiveRole = "student";
        }

        if (userData && userData.status) {
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
        } else {
          effectiveStatus = (
            effectiveRole === "faculty" ? "PENDING" : "ACTIVE"
          ) as UserStatus;
        }
        // Check faculty approval status from database record
        if (effectiveRole === "faculty") {
          const isPending =
            effectiveStatus === "PENDING" ||
            userData?.approvalStatus === "pending" ||
            userData?.isApproved === false ||
            userData?.accountStatus === "pending";

          const isRejected =
            effectiveStatus === "REJECTED" ||
            userData?.approvalStatus === "rejected" ||
            userData?.accountStatus === "rejected";

          if (isPending) {
            await auth.signOut();
            setFirebaseUser(null);
            setProfile(null);
            setClaims(null);
            clearPersistedRole();
            setIsLoading(false);
            setIsAuthenticating(false);
            throw new Error(
              "Your faculty account is still awaiting administrator approval. Please wait until the administrator approves your account."
            );
          }

          if (isRejected) {
            await auth.signOut();
            setFirebaseUser(null);
            setProfile(null);
            setClaims(null);
            clearPersistedRole();
            setIsLoading(false);
            setIsAuthenticating(false);
            throw new Error(
              "Your faculty account registration was rejected. Please contact the administrator."
            );
          }
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
          isApproved: userData?.isApproved ?? (effectiveStatus === "ACTIVE"),
          accountStatus: userData?.accountStatus || (effectiveStatus === "ACTIVE" ? "active" : "pending"),
          approvalStatus: userData?.approvalStatus || (effectiveStatus === "ACTIVE" ? "approved" : "pending"),
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
      } catch (err: any) {
        if (
          err.message?.includes("awaiting administrator approval") ||
          err.message?.includes("was rejected") ||
          err.message?.includes("was not approved")
        ) {
          throw err;
        }

        // If credentials failed or user not found, check if there is a pending/rejected application
        try {
          const trimmedEmail = emailStr.toLowerCase().trim();
          const fAppSnap = await getDocs(
            query(collection(db, "facultyApplications"), where("officialEmail", "==", trimmedEmail))
          );
          if (!fAppSnap.empty) {
            const fApp = fAppSnap.docs[0].data();
            if (fApp.status === "pending" || fApp.approvalStatus === "pending" || fApp.isApproved === false) {
              throw new Error(
                "Your faculty account is still awaiting administrator approval. Please wait until the administrator approves your account."
              );
            }
            if (fApp.status === "rejected" || fApp.approvalStatus === "rejected") {
              throw new Error(
                "Your faculty account registration was rejected. Please contact the administrator."
              );
            }
          }
        } catch (appCheckErr: any) {
          if (
            appCheckErr.message?.includes("awaiting administrator approval") ||
            appCheckErr.message?.includes("was rejected") ||
            appCheckErr.message?.includes("was not approved")
          ) {
            throw appCheckErr;
          }
        }

        throw err;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistUserRole, clearPersistedRole]
  );

  /**
   * SUBMIT FACULTY APPLICATION (Unauthenticated):
   * Creates a pending application in facultyApplications collection without creating or logging into Firebase Auth.
   */
  const submitFacultyApplication = useCallback(
    async (payload: {
      fullName: string;
      officialEmail: string;
      mobileNumber?: string;
      employeeId: string;
      department: string;
      school?: string;
      designation?: string;
      alternateEmail?: string;
    }): Promise<{ success: boolean; applicationId: string }> => {
      setIsAuthenticating(false);
      setIsLoading(false);

      const trimmedEmail = payload.officialEmail.toLowerCase().trim();
      const trimmedName = payload.fullName.trim();
      const appId = `fapp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const applicationDoc: FacultyApplication = {
        id: appId,
        applicationId: appId,
        fullName: trimmedName,
        officialEmail: trimmedEmail,
        mobileNumber: payload.mobileNumber || "",
        employeeId: payload.employeeId.trim().toUpperCase(),
        department: payload.department || "School of Technology",
        school: payload.school || "School of Technology",
        designation: payload.designation || "Assistant Professor",
        alternateEmail: payload.alternateEmail || "",
        role: "faculty",
        status: "pending",
        approvalStatus: "pending",
        isApproved: false,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      };

      await setDoc(doc(db, "facultyApplications", appId), applicationDoc);

      setIsLoading(false);
      setIsAuthenticating(false);

      return { success: true, applicationId: appId };
    },
    []
  );

  /**
   * DIRECT EMAIL / PASSWORD SIGN UP:
   * 1. Pre-caches selected role in localStorage
   * 2. Creates user in Firebase Auth
   * 3. Sets displayName in Firebase Auth profile
   * 4. Writes authoritative role directly to Firestore users/{uid}
   * 5. If faculty, creates pending application & signs out to prevent unauthorized portal access
   */
  const signUpWithEmail = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName: string;
      role: UserRole;
      department: string;
      school?: string;
      designation?: string;
      phoneNumber?: string;
      alternateEmail?: string;
      rollNumber?: string;
      employeeId?: string;
    }): Promise<{ user: FirebaseUser; role: UserRole; status: UserStatus }> => {
      setIsAuthenticating(true);
      setIsLoading(true);
      setAuthError(null);

      const trimmedEmail = payload.email.toLowerCase().trim();
      const trimmedName = payload.displayName.trim();
      const effRole: UserRole = (payload.role || "student").toLowerCase() as UserRole;
      const effStatus: UserStatus = effRole === "faculty" ? "PENDING" : "ACTIVE";

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

        // 4. If faculty, register in facultyApplications
        if (effRole === "faculty") {
          const appId = `fapp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await setDoc(doc(db, "facultyApplications", appId), {
            id: appId,
            applicationId: appId,
            uid: user.uid,
            fullName: trimmedName,
            officialEmail: trimmedEmail,
            mobileNumber: payload.phoneNumber || "",
            employeeId: payload.employeeId ? payload.employeeId.trim().toUpperCase() : "",
            department: payload.department || "School of Technology",
            school: payload.school || "School of Technology",
            designation: payload.designation || "Assistant Professor",
            alternateEmail: payload.alternateEmail || "",
            role: "faculty",
            status: "pending",
            approvalStatus: "pending",
            isApproved: false,
            submittedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null,
          });
        }

        // 5. Construct complete authoritative profile in users/{uid}
        const userProfile: User = {
          uid: user.uid,
          email: user.email || trimmedEmail,
          displayName: trimmedName || user.displayName || trimmedEmail.split("@")[0],
          role: effRole,
          status: effStatus,
          isApproved: effRole !== "faculty",
          accountStatus: effStatus === "ACTIVE" ? "active" : "pending",
          approvalStatus: effStatus === "ACTIVE" ? "approved" : "pending",
          department:
            payload.department ||
            (effRole === "faculty"
              ? "Department of Computer Science & Engineering"
              : "School of Technology"),
          school: payload.school || "School of Technology",
          designation: payload.designation || (effRole === "faculty" ? "Assistant Professor" : ""),
          phoneNumber: payload.phoneNumber || "",
          phone: payload.phoneNumber || "",
          rollNumber: payload.rollNumber ? payload.rollNumber.trim().toUpperCase() : undefined,
          studentId: payload.rollNumber ? payload.rollNumber.trim().toUpperCase() : undefined,
          employeeId: payload.employeeId ? payload.employeeId.trim().toUpperCase() : undefined,
          facultyId: payload.employeeId ? payload.employeeId.trim().toUpperCase() : undefined,
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 6. Write to Firestore users/{uid}
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, userProfile, { merge: true });

        // 7. If faculty:
        // DO NOT log the faculty into the Faculty Dashboard.
        // Sign the faculty out from Firebase Auth so they remain in a clean unauthenticated state.
        if (effRole === "faculty") {
          await auth.signOut();
          setFirebaseUser(null);
          setProfile(null);
          setClaims(null);
          clearPersistedRole();
          setIsLoading(false);
          setIsAuthenticating(false);
          return { user: null as any, role: "faculty", status: "PENDING" };
        }

        // Student registration continues to active session:
        setFirebaseUser(user);
        setProfile(userProfile);
        setClaims({ role: effRole, status: effStatus });
        persistUserRole(effRole, effStatus);
        setIsLoading(false);

        return { user, role: effRole, status: effStatus };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistUserRole, clearPersistedRole]
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
        setIsLoading(true);
        console.log("[AUTH-5] Firebase user received", user.uid, user.email);

        const storedLocalRole = (() => {
          try {
            const r = localStorage.getItem("apollo_user_role");
            if (r === "faculty" || r === "admin" || r === "student") return r as UserRole;
          } catch {}
          if (typeof window !== "undefined") {
            if (window.location.pathname.startsWith("/faculty")) return "faculty";
            if (window.location.pathname.startsWith("/admin")) return "admin";
          }
          return cachedRole || null;
        })();

        const storedLocalStatus = (() => {
          try {
            const s = localStorage.getItem("apollo_user_status");
            if (s) return s as UserStatus;
          } catch {}
          return cachedStatus || "ACTIVE";
        })();

        const userDocRef = doc(db, "users", user.uid);

        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            let userData: any = null;
            if (docSnap.exists()) {
              userData = docSnap.data();
              console.log("[AUTH-8] Firestore profile received for:", user.uid, userData);

              // 1. Authoritative role resolution from Firestore
              let parsedRole: UserRole | null = null;
              if (userData.role) {
                const r = String(userData.role).toLowerCase().trim();
                if (r === "faculty" || r === "admin" || r === "student") {
                  parsedRole = r as UserRole;
                }
              }

              // 2. If stored local role was faculty/admin (e.g. from faculty portal or login), preserve faculty/admin
              if (storedLocalRole === "faculty" || (typeof window !== "undefined" && window.location.pathname.startsWith("/faculty"))) {
                parsedRole = "faculty";
              } else if (storedLocalRole === "admin" || (typeof window !== "undefined" && window.location.pathname.startsWith("/admin"))) {
                parsedRole = "admin";
              } else if (!parsedRole && storedLocalRole) {
                parsedRole = storedLocalRole;
              }

              // 3. Fallback to profile clues
              if (!parsedRole) {
                if (userData.employeeId || userData.designation) {
                  parsedRole = "faculty";
                } else if (userData.rollNumber) {
                  parsedRole = "student";
                } else if (user.email?.toLowerCase().includes("faculty") || user.email?.toLowerCase().includes("dr.")) {
                  parsedRole = "faculty";
                } else if (user.email?.toLowerCase().includes("admin")) {
                  parsedRole = "admin";
                } else {
                  parsedRole = "student";
                }
              }

              const rawStatus = userData.status ? String(userData.status).toUpperCase() : (storedLocalStatus || "ACTIVE");
              const parsedStatus = (
                rawStatus === "PENDING"
                  ? "PENDING"
                  : rawStatus === "SUSPENDED"
                  ? "SUSPENDED"
                  : rawStatus === "REJECTED"
                  ? "REJECTED"
                  : "ACTIVE"
              ) as UserStatus;

              const resolvedProfile: User = {
                ...userData,
                uid: userData.uid || user.uid,
                email: userData.email || user.email || "",
                displayName:
                  userData.displayName ||
                  userData.name ||
                  user.displayName ||
                  "Campus Member",
                role: parsedRole,
                status: parsedStatus,
                department: userData.department || (parsedRole === "faculty" ? "Department of Computer Science & Engineering" : "School of Technology"),
                school: userData.school || "School of Technology",
                rollNumber: userData.rollNumber || userData.studentId,
                studentId: userData.studentId || userData.rollNumber,
                employeeId: userData.employeeId || userData.facultyId,
                facultyId: userData.facultyId || userData.employeeId,
                designation: userData.designation,
                programme: userData.programme,
                year: userData.year,
                yearOfStudy: userData.yearOfStudy || userData.year,
                semester: userData.semester,
                section: userData.section,
                batch: userData.batch,
                personalEmail: userData.personalEmail,
                phoneNumber: userData.phoneNumber || userData.phone,
                phone: userData.phone || userData.phoneNumber,
                emergencyContactName: userData.emergencyContactName,
                emergencyContactPhone: userData.emergencyContactPhone,
                emergencyContactRelation: userData.emergencyContactRelation,
                dietaryPreference: userData.dietaryPreference,
                skills: userData.skills,
                expertise: userData.expertise,
                officeLocation: userData.officeLocation,
                adminUnit: userData.adminUnit,
                ssoProvider: userData.ssoProvider || (user.providerData?.[0]?.providerId === "microsoft.com" ? "Microsoft Entra ID" : "Apollo SSO Provider"),
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
              // Ensure doc in Firestore reflects verified role
              if (userData.role !== parsedRole) {
                setDoc(userDocRef, { role: parsedRole }, { merge: true }).catch(() => {});
              }
              setIsLoading(false);
              setIsAuthenticating(false);
            } else {
              console.log("[AUTH-8] Firestore doc not found for UID, checking cached role or email:", user.uid);
              
              const currentUid = user.uid;
              const currentEmail = user.email || "";
              const emailKey = currentEmail.toLowerCase().trim();

              let effectiveRole: UserRole = storedLocalRole || (emailKey.includes("faculty") || emailKey.includes("dr.") ? "faculty" : emailKey.includes("admin") ? "admin" : "student");
              let effectiveStatus: UserStatus = storedLocalStatus || "ACTIVE";
              let effectiveDept = effectiveRole === "faculty" ? "Department of Computer Science & Engineering" : "School of Technology";
              let effectiveName = user.displayName || currentEmail.split("@")[0] || "Campus Member";
              let effectiveRoll: string | undefined = undefined;
              let effectiveEmp: string | undefined = undefined;

              if (emailKey) {
                const emailQ = query(collection(db, "users"), where("email", "==", emailKey));
                getDocs(emailQ)
                  .then((emailSnap) => {
                    if (!emailSnap.empty) {
                      const matchedDocs = emailSnap.docs.map(d => d.data() as any);
                      const facultyDoc = matchedDocs.find(d => String(d.role).toLowerCase() === "faculty");
                      const adminDoc = matchedDocs.find(d => String(d.role).toLowerCase() === "admin");
                      const preferredDoc = facultyDoc || adminDoc || matchedDocs[0];

                      if (preferredDoc.role) {
                        const r = String(preferredDoc.role).toLowerCase().trim();
                        if (r === "faculty" || r === "admin" || r === "student") effectiveRole = r as UserRole;
                      }
                      if (preferredDoc.status) {
                        const s = String(preferredDoc.status).toUpperCase();
                        effectiveStatus = (s === "PENDING" ? "PENDING" : s === "SUSPENDED" ? "SUSPENDED" : s === "REJECTED" ? "REJECTED" : "ACTIVE") as UserStatus;
                      }
                      if (preferredDoc.department) effectiveDept = preferredDoc.department;
                      if (preferredDoc.displayName || preferredDoc.name) effectiveName = preferredDoc.displayName || preferredDoc.name;
                      if (preferredDoc.rollNumber) effectiveRoll = preferredDoc.rollNumber;
                      if (preferredDoc.employeeId) effectiveEmp = preferredDoc.employeeId;
                    }

                    if (storedLocalRole === "faculty" || (typeof window !== "undefined" && window.location.pathname.startsWith("/faculty"))) {
                      effectiveRole = "faculty";
                    } else if (storedLocalRole === "admin" || (typeof window !== "undefined" && window.location.pathname.startsWith("/admin"))) {
                      effectiveRole = "admin";
                    }

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
                    setProfile(fallbackProfile);
                    setClaims({ role: effectiveRole, status: effectiveStatus });
                    persistUserRole(effectiveRole, effectiveStatus);
                    setDoc(userDocRef, fallbackProfile, { merge: true }).catch(() => {});
                    setIsLoading(false);
                    setIsAuthenticating(false);
                  });
              } else {
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
                setProfile(fallbackProfile);
                setClaims({ role: effectiveRole, status: effectiveStatus });
                persistUserRole(effectiveRole, effectiveStatus);
                setDoc(userDocRef, fallbackProfile, { merge: true }).catch(() => {});
                setIsLoading(false);
                setIsAuthenticating(false);
              }
            }
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

    persistUserRole(devRole, "ACTIVE");

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (anonErr) {
      console.warn("[Auth] Anonymous sign-in notice:", anonErr);
    }

    const effectiveUid = auth.currentUser?.uid || mockUid;
    const finalProfile: User = {
      ...mockProfile,
      uid: effectiveUid,
    };

    const mockFirebaseUser = {
      uid: effectiveUid,
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
    setProfile(finalProfile);
    setIsLoading(false);

    // Save document to Firestore so page refresh reliably finds the profile
    setDoc(doc(db, "users", effectiveUid), finalProfile, { merge: true }).catch(() => {});

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

  const isProfileComplete = Boolean(
    profile &&
    profile.displayName &&
    profile.displayName.trim().length > 1 &&
    profile.email &&
    profile.email.includes("@") &&
    (effectiveRole === "student"
      ? (profile.rollNumber || (profile as any).studentId) && (profile.phoneNumber || profile.phone) && profile.department
      : effectiveRole === "faculty"
      ? (profile.employeeId || profile.facultyId) && profile.department
      : true)
  );

  const missingProfileFields = (() => {
    if (!profile) return [];
    const missing: string[] = [];
    if (!profile.displayName || profile.displayName.trim().length <= 1) missing.push("Full Name");
    if (!profile.email || !profile.email.includes("@")) missing.push("University Email");
    if (effectiveRole === "student") {
      if (!profile.rollNumber && !(profile as any).studentId) missing.push("Student Roll Number");
      if (!profile.phoneNumber && !profile.phone) missing.push("Mobile Contact Number");
      if (!profile.department || profile.department.trim().length === 0) missing.push("Department");
    } else if (effectiveRole === "faculty") {
      if (!profile.employeeId && !profile.facultyId) missing.push("Faculty / Employee ID");
      if (!profile.department) missing.push("Department");
    }
    return missing;
  })();

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
    isProfileComplete,
    missingProfileFields,
    authError,
    updateUserProfile,
    loginWithEmail,
    signUpWithEmail,
    submitFacultyApplication,
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
