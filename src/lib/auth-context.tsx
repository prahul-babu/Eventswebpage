import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
import {
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
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
import { normalizeBTechDepartment } from "@/config/departments";
import { toast } from "sonner";

export interface AuthClaims {
  role?: UserRole;
  status?: UserStatus;
}

/**
 * Exact Role / Status Routing Rules:
 * student + ACTIVE → Student Catalog (/)
 * faculty + PENDING → Faculty Pending Approval (/pending)
 * faculty + ACTIVE → Faculty Portal (/faculty/events)
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

  if (effRole === "faculty" && (effStatus === "PENDING" || effStatus === "PENDING_APPROVAL")) {
    return "/pending";
  }

  if (effRole === "faculty") {
    return "/faculty/events";
  }

  if (effRole === "admin") {
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

  // Safety Watchdog: Ensure loading NEVER stays stuck indefinitely
  useEffect(() => {
    const watchdogTimer = setTimeout(() => {
      setIsLoading((currLoading) => {
        if (currLoading) {
          console.warn("[AUTH] Safety watchdog triggered - forcing isLoading to false");
          return false;
        }
        return currLoading;
      });
      setIsAuthenticating((currAuth) => {
        if (currAuth) {
          console.warn("[AUTH] Safety watchdog triggered - forcing isAuthenticating to false");
          return false;
        }
        return currAuth;
      });
    }, 3500);

    return () => clearTimeout(watchdogTimer);
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
   * Universal User Profile Updater
   */
  const updateUserProfile = useCallback(
    async (updates: Partial<User>): Promise<void> => {
      const user = auth.currentUser || firebaseUser;
      if (!user) {
        throw new Error("Cannot update profile: user is not authenticated.");
      }

      console.log("[AUTH] Updating user profile for UID:", user.uid);
      setIsLoading(true);

      try {
        const userDocRef = doc(db, "users", user.uid);
        
        // Deep sanitization: Ensure ZERO undefined values reach Firestore
        const rawPayload: any = {
          ...updates,
          updatedAt: new Date(),
        };

        const cleanedUpdates: any = {};
        for (const [k, v] of Object.entries(rawPayload)) {
          if (v !== undefined) {
            cleanedUpdates[k] = v;
          }
        }

        await setDoc(userDocRef, cleanedUpdates, { merge: true });

        if (updates.role || updates.status) {
          const newRole = updates.role || profile?.role || "student";
          const newStatus = updates.status || profile?.status || "ACTIVE";
          setClaims({ role: newRole, status: newStatus });
          persistUserRole(newRole, newStatus);
        }

        setProfile((prev) => (prev ? { ...prev, ...cleanedUpdates } : null));
        toast.success("Profile updated successfully.");
      } catch (err: any) {
        console.error("[AUTH] Error updating user profile in Firestore:", err);
        toast.error("Unable to save profile", {
          description: "Unable to save your profile right now. Please check your information and try again.",
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [firebaseUser, profile, persistUserRole]
  );

  /**
   * Faculty Application Submission (Standalone)
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
      console.log("[AUTH] Submitting faculty application:", payload.officialEmail);
      setIsLoading(true);

      try {
        const currentUid = auth.currentUser?.uid || `anon_${Date.now()}`;
        const appId = `fapp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const appData: Partial<FacultyApplication> = {
          id: appId,
          applicationId: appId,
          uid: currentUid,
          fullName: payload.fullName.trim(),
          officialEmail: payload.officialEmail.toLowerCase().trim(),
          mobileNumber: payload.mobileNumber?.trim() || "",
          employeeId: payload.employeeId.trim().toUpperCase(),
          department: payload.department || "Department of Computer Science & Engineering",
          school: payload.school || "School of Technology",
          designation: payload.designation || "Assistant Professor",
          alternateEmail: payload.alternateEmail?.toLowerCase().trim() || undefined,
          role: "faculty",
          status: "pending",
          approvalStatus: "pending",
          isApproved: false,
          approvalEmailSent: false,
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          approvedAt: null,
          approvedBy: null,
          rejectionReason: null,
        };

        await setDoc(doc(db, "facultyApplications", appId), appData);

        if (auth.currentUser) {
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          await setDoc(
            userDocRef,
            {
              uid: auth.currentUser.uid,
              email: payload.officialEmail.toLowerCase().trim(),
              displayName: payload.fullName.trim(),
              role: "faculty",
              status: "PENDING",
              approvalStatus: "pending",
              isApproved: false,
              employeeId: payload.employeeId.trim().toUpperCase(),
              facultyId: payload.employeeId.trim().toUpperCase(),
              department: payload.department,
              school: payload.school || "School of Technology",
              designation: payload.designation,
              updatedAt: new Date(),
            },
            { merge: true }
          );

          persistUserRole("faculty", "PENDING");
          setClaims({ role: "faculty", status: "PENDING" });
        }

        toast.success("Application Submitted", {
          description: "Your faculty registration is awaiting administrator approval.",
        });

        return { success: true, applicationId: appId };
      } catch (err: any) {
        console.error("[AUTH] Error submitting faculty application:", err);
        toast.error("Application Submission Failed", {
          description: err.message || "Failed to submit faculty application.",
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [persistUserRole]
  );

  /**
   * AUTHORITATIVE SIGN IN FLOW (Email & Password)
   */
  const loginWithEmail = useCallback(
    async (
      email: string,
      pass: string,
      selectedRole: UserRole
    ): Promise<{ user: FirebaseUser; role: UserRole; status: UserStatus }> => {
      setIsAuthenticating(true);
      setIsLoading(true);
      setAuthError(null);

      const trimmedEmail = email.toLowerCase().trim();
      const roleToValidate = (selectedRole || "student").toLowerCase() as UserRole;

      console.log("[AUTH] Login requested for:", trimmedEmail, "as role:", roleToValidate);

      try {
        // 1. Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
        const user = userCredential.user;
        console.log("[AUTH] Firebase Auth succeeded for UID:", user.uid);

        // 2. Fetch authoritative user document from Firestore
        const userDocRef = doc(db, "users", user.uid);
        let userSnap = await getDoc(userDocRef);
        let userData: any = userSnap.exists() ? userSnap.data() : null;

        // Fallback: Query by email if document key differed
        if (!userData) {
          const qByEmail = query(collection(db, "users"), where("email", "==", trimmedEmail));
          const snapByEmail = await getDocs(qByEmail);
          if (!snapByEmail.empty) {
            userData = snapByEmail.docs[0].data();
          }
        }

        // Auto-provision basic profile if not found
        if (!userData) {
          console.warn("[AUTH] No existing profile in Firestore for UID:", user.uid, "Auto-creating basic profile.");
          const autoStatus = roleToValidate === "faculty" ? "PENDING" : "ACTIVE";
          userData = {
            uid: user.uid,
            email: trimmedEmail,
            displayName: user.displayName || trimmedEmail.split("@")[0],
            role: roleToValidate,
            status: autoStatus,
            approvalStatus: autoStatus === "ACTIVE" ? "approved" : "pending",
            isApproved: autoStatus === "ACTIVE",
            onboardingCompleted: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await setDoc(userDocRef, userData, { merge: true });
        }

        const profileRole: UserRole = (userData.role || "student").toLowerCase() as UserRole;
        const rawStatus = userData.status ? String(userData.status).toUpperCase() : "ACTIVE";
        const profileStatus: UserStatus = (
          rawStatus === "PENDING" || rawStatus === "PENDING_APPROVAL"
            ? "PENDING_APPROVAL"
            : rawStatus === "SUSPENDED"
            ? "SUSPENDED"
            : rawStatus === "REJECTED"
            ? "REJECTED"
            : "ACTIVE"
        ) as UserStatus;

        console.log("[AUTH] Profile role:", profileRole, "status:", profileStatus);

        // 3. Role Match Verification
        if (roleToValidate === "faculty" && profileRole !== "faculty") {
          console.warn("[AUTH] Role mismatch: selected faculty, but database role is", profileRole);
          await auth.signOut();
          setFirebaseUser(null);
          setProfile(null);
          setClaims(null);
          clearPersistedRole();
          setIsLoading(false);
          setIsAuthenticating(false);
          throw new Error("This account is not registered as a Faculty account.");
        }

        if (roleToValidate === "admin" && profileRole !== "admin") {
          console.warn("[AUTH] Role mismatch: selected admin, but database role is", profileRole);
          await auth.signOut();
          setFirebaseUser(null);
          setProfile(null);
          setClaims(null);
          clearPersistedRole();
          setIsLoading(false);
          setIsAuthenticating(false);
          throw new Error("This account is not registered as an Administrator account.");
        }

        // 4. Faculty Approval Verification
        if (profileRole === "faculty") {
          const isApproved =
            profileStatus === "ACTIVE" ||
            Boolean(userData.approvedAt) ||
            userData.isApproved === true ||
            userData.approvalStatus === "approved";

          if (!isApproved) {
            if (profileStatus === "REJECTED" || userData.approvalStatus === "rejected") {
              console.log("[AUTH] Faculty account status: REJECTED");
              await auth.signOut();
              setFirebaseUser(null);
              setProfile(null);
              setClaims(null);
              clearPersistedRole();
              setIsLoading(false);
              setIsAuthenticating(false);
              throw new Error("Your faculty access request has been rejected.");
            }

            console.log("[AUTH] Faculty account status: PENDING_APPROVAL -> routing to /pending");
            // Set state so /pending page is directly accessible
            setFirebaseUser(user);
            setProfile(userData);
            setClaims({ role: "faculty", status: "PENDING" });
            persistUserRole("faculty", "PENDING");
            setIsLoading(false);
            setIsAuthenticating(false);

            return { user, role: "faculty", status: "PENDING" };
          }
        }

        console.log("[AUTH] Authorization result: APPROVED -> route:", getPostLoginRoute(profileRole, profileStatus));

        // 5. Build and persist authoritative profile
        const userProfile: User = {
          ...userData,
          uid: user.uid,
          email: userData.email || user.email || trimmedEmail,
          displayName:
            userData.displayName ||
            userData.name ||
            user.displayName ||
            trimmedEmail.split("@")[0],
          role: profileRole,
          status: profileStatus,
          isApproved: profileRole !== "faculty" || profileStatus === "ACTIVE",
          accountStatus: profileStatus === "ACTIVE" ? "active" : "pending",
          approvalStatus: profileStatus === "ACTIVE" ? "approved" : "pending",
          department:
            userData.department ||
            (profileRole === "admin"
              ? "Institutional Administration"
              : profileRole === "faculty"
              ? "Department of Computer Science & Engineering"
              : "B.Tech. Computer Science and Engineering"),
          onboardingCompleted: true,
          updatedAt: new Date(),
        };

        setFirebaseUser(user);
        setProfile(userProfile);
        setClaims({ role: profileRole, status: profileStatus });
        persistUserRole(profileRole, profileStatus);
        setIsLoading(false);
        setIsAuthenticating(false);

        return { user, role: profileRole, status: profileStatus };
      } catch (err: any) {
        setIsLoading(false);
        setIsAuthenticating(false);
        console.error("[AUTH] Login error:", err);
        throw err;
      }
    },
    [persistUserRole, clearPersistedRole]
  );

  /**
   * AUTHORITATIVE SIGN UP FLOW (Email & Password)
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

      console.log("[AUTH] Signup started for:", trimmedEmail, "role:", effRole);

      try {
        // 1. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          payload.password
        );
        const user = userCredential.user;
        console.log("[AUTH] Firebase user created UID:", user.uid);

        // 2. Set display name in Firebase Auth
        try {
          await updateProfile(user, { displayName: trimmedName });
        } catch (e) {
          console.warn("[Auth] updateProfile notice:", e);
        }

        // 3. If faculty, register in facultyApplications
        if (effRole === "faculty") {
          const appId = `fapp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await setDoc(doc(db, "facultyApplications", appId), {
            id: appId,
            applicationId: appId,
            uid: user.uid,
            fullName: trimmedName,
            email: trimmedEmail,
            officialEmail: trimmedEmail,
            mobile: payload.phoneNumber || "",
            mobileNumber: payload.phoneNumber || "",
            employeeId: payload.employeeId ? payload.employeeId.trim().toUpperCase() : "",
            department: payload.department || "Department of Computer Science & Engineering",
            school: payload.school || "School of Technology",
            designation: payload.designation || "Assistant Professor",
            alternateEmail: payload.alternateEmail?.toLowerCase().trim() || undefined,
            role: "faculty",
            status: "pending",
            approvalStatus: "pending",
            isApproved: false,
            approvalEmailSent: false,
            approvalEmailSentAt: null,
            createdAt: new Date(),
            submittedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
            approvedAt: null,
            approvedBy: null,
            rejectionReason: null,
          });
        }

        // 4. Construct complete authoritative profile in users/{uid}
        const userProfile: User = {
          uid: user.uid,
          email: user.email || trimmedEmail,
          displayName: trimmedName || user.displayName || trimmedEmail.split("@")[0],
          role: effRole,
          status: effStatus,
          isApproved: effRole !== "faculty",
          accountStatus: effStatus === "ACTIVE" ? "active" : "pending",
          approvalStatus: effStatus === "ACTIVE" ? "approved" : "pending",
          approvedAt: undefined,
          approvedBy: undefined,
          department:
            payload.department ||
            (effRole === "faculty"
              ? "Department of Computer Science & Engineering"
              : "B.Tech. Computer Science and Engineering"),
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

        // 5. Write to Firestore users/{uid}
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, userProfile, { merge: true });

        // 6. Set active local session
        setFirebaseUser(user);
        setProfile(userProfile);
        setClaims({ role: effRole, status: effStatus });
        persistUserRole(effRole, effStatus);
        setIsLoading(false);
        setIsAuthenticating(false);

        console.log("[AUTH] Signup completed successfully for UID:", user.uid, "Role:", effRole);

        return { user, role: effRole, status: effStatus };
      } catch (err: any) {
        setIsLoading(false);
        setIsAuthenticating(false);
        console.error("[AUTH] Signup error:", err);
        throw err;
      }
    },
    [persistUserRole]
  );

  // Startup: Check for redirect result from Microsoft OAuth
  useEffect(() => {
    let isMounted = true;
    console.log("[AUTH] Application startup - checking redirect result");

    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        if (result && result.user) {
          console.log("[AUTH] OAuth completed for UID:", result.user.uid);
          setFirebaseUser(result.user);
        }
      })
      .catch((error: any) => {
        if (!isMounted) return;
        console.error("[AUTH] Error in getRedirectResult:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Auth State Listener: Listens for Firebase Auth and Firestore Profile changes
   */
  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("[AUTH] Firebase auth state changed. User:", user?.uid || "null");

      if (user) {
        setFirebaseUser(user);
        setIsLoading(true);

        const userDocRef = doc(db, "users", user.uid);

        unsubscribeProfile = onSnapshot(
          userDocRef,
          async (docSnap) => {
            console.log("[AUTH] Loading profile for UID:", user.uid);
            let userData: any = null;

            if (docSnap.exists()) {
              userData = docSnap.data();
            } else {
              const qByUid = query(collection(db, "users"), where("uid", "==", user.uid));
              const snapByUid = await getDocs(qByUid);
              if (!snapByUid.empty) {
                userData = snapByUid.docs[0].data();
              } else if (user.email) {
                const qByEmail = query(collection(db, "users"), where("email", "==", user.email.toLowerCase().trim()));
                const snapByEmail = await getDocs(qByEmail);
                if (!snapByEmail.empty) {
                  userData = snapByEmail.docs[0].data();
                }
              }
            }

            // Auto-provision initial profile if document does not exist yet
            if (!userData) {
              const fallbackRole = cachedRole || (user.email?.toLowerCase().includes("faculty") ? "faculty" : "student");
              const fallbackStatus = fallbackRole === "faculty" ? "PENDING" : "ACTIVE";

              userData = {
                uid: user.uid,
                email: user.email || "",
                displayName: user.displayName || user.email?.split("@")[0] || "Campus Member",
                role: fallbackRole,
                status: fallbackStatus,
                isApproved: fallbackRole !== "faculty",
                accountStatus: fallbackStatus === "ACTIVE" ? "active" : "pending",
                approvalStatus: fallbackStatus === "ACTIVE" ? "approved" : "pending",
                department: fallbackRole === "faculty" ? "Department of Computer Science & Engineering" : "B.Tech. Computer Science and Engineering",
                school: "School of Technology",
                onboardingCompleted: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              try {
                await setDoc(userDocRef, userData, { merge: true });
              } catch (writeErr) {
                console.warn("[AUTH] Notice auto-provisioning user doc:", writeErr);
              }
            }

            const profileRole: UserRole = (userData.role || cachedRole || "student").toLowerCase() as UserRole;
            const rawStatus = userData.status ? String(userData.status).toUpperCase() : "ACTIVE";
            const profileStatus: UserStatus = (
              rawStatus === "PENDING" || rawStatus === "PENDING_APPROVAL"
                ? "PENDING"
                : rawStatus === "SUSPENDED"
                ? "SUSPENDED"
                : rawStatus === "REJECTED"
                ? "REJECTED"
                : "ACTIVE"
            ) as UserStatus;

            const isApproved =
              profileRole !== "faculty" ||
              profileStatus === "ACTIVE" ||
              Boolean(userData.approvedAt) ||
              userData.isApproved === true ||
              userData.approvalStatus === "approved";

            const resolvedProfile: User = {
              ...userData,
              uid: user.uid,
              email: userData.email || user.email || "",
              displayName:
                userData.displayName ||
                userData.name ||
                user.displayName ||
                "Campus Member",
              role: profileRole,
              status: profileStatus,
              isApproved,
              approvalStatus: isApproved ? "approved" : profileStatus === "REJECTED" ? "rejected" : "pending",
              accountStatus: profileStatus === "ACTIVE" ? "active" : "pending",
              department: normalizeBTechDepartment(
                userData.btechProgramme || userData.department,
                "B.Tech. Computer Science and Engineering"
              ),
              btechProgramme: normalizeBTechDepartment(
                userData.btechProgramme || userData.department,
                "B.Tech. Computer Science and Engineering"
              ),
              school: "School of Technology",
              rollNumber: userData.rollNumber || userData.studentId,
              studentId: userData.studentId || userData.rollNumber,
              employeeId: userData.employeeId || userData.facultyId,
              facultyId: userData.facultyId || userData.employeeId,
              designation: userData.designation,
              onboardingCompleted: true,
              createdAt: userData.createdAt
                ? userData.createdAt.toDate
                  ? userData.createdAt.toDate()
                  : new Date(userData.createdAt)
                : new Date(),
              updatedAt: new Date(),
            };

            console.log("[AUTH] Profile loaded. Role:", profileRole, "Status:", profileStatus);
            console.log("[AUTH] User role:", profileRole);
            console.log("[AUTH] Faculty status:", profileStatus);
            console.log("[AUTH] Redirect destination:", getPostLoginRoute(profileRole, profileStatus));

            setProfile(resolvedProfile);
            setClaims({
              role: profileRole,
              status: profileStatus,
            });
            persistUserRole(profileRole, profileStatus);
            setIsLoading(false);
            setIsAuthenticating(false);
          },
          (error) => {
            console.error("[AUTH] Profile snapshot listener error:", error);
            setIsLoading(false);
            setIsAuthenticating(false);
          }
        );
      } else {
        console.log("[AUTH] No authenticated user - clearing session");
        setFirebaseUser(null);
        setProfile(null);
        setClaims(null);
        clearPersistedRole();
        setIsLoading(false);
        setIsAuthenticating(false);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, [persistUserRole, clearPersistedRole, cachedRole]);

  // Microsoft OAuth Login
  const signInWithMicrosoft = useCallback(async (): Promise<void> => {
    setAuthError(null);
    setIsAuthenticating(true);
    console.log("[AUTH] Microsoft login initiated");

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
        console.log("[AUTH] Microsoft login successful for:", result.user.email);
        setFirebaseUser(result.user);
        toast.success("Microsoft Login Successful", {
          description: `Welcome, ${result.user.displayName || result.user.email}!`,
        });
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      console.error("[AUTH] Microsoft login error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Failed to complete Microsoft Sign-In");
        toast.error("Microsoft Sign-In Failed", { description: err.message });
      }
      throw err;
    }
  }, []);

  const signInAsDevUser = useCallback(
    async (devRole: UserRole): Promise<void> => {
      setIsAuthenticating(true);
      setIsLoading(true);
      console.log("[AUTH] Dev sign-in initiated for role:", devRole);

      try {
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        const devProfile: User = {
          uid: user.uid,
          email: `${devRole}@apollouniversity.edu.in`,
          displayName: `Dev ${devRole.toUpperCase()} User`,
          role: devRole,
          status: "ACTIVE",
          isApproved: true,
          accountStatus: "active",
          approvalStatus: "approved",
          department: devRole === "faculty" ? "Department of Computer Science & Engineering" : "B.Tech. Computer Science and Engineering",
          school: "School of Technology",
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(doc(db, "users", user.uid), devProfile, { merge: true });

        setFirebaseUser(user);
        setProfile(devProfile);
        setClaims({ role: devRole, status: "ACTIVE" });
        persistUserRole(devRole, "ACTIVE");

        toast.success(`Signed in as Dev ${devRole.toUpperCase()}`);
      } catch (err: any) {
        console.error("[AUTH] Dev sign-in error:", err);
        toast.error("Dev Sign-in Failed", { description: err.message });
      } finally {
        setIsLoading(false);
        setIsAuthenticating(false);
      }
    },
    [persistUserRole]
  );

  const signOut = useCallback(async (): Promise<void> => {
    console.log("[AUTH] User signing out");
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setProfile(null);
      setClaims(null);
      clearPersistedRole();
      toast.success("Signed Out", {
        description: "You have been securely signed out.",
      });
    } catch (err: any) {
      console.error("[AUTH] Sign out error:", err);
      toast.error("Sign Out Notice", { description: err.message });
    } finally {
      setIsLoading(false);
      setIsAuthenticating(false);
    }
  }, [clearPersistedRole]);

  const effectiveRole: UserRole | null =
    profile?.role || claims?.role || cachedRole || null;
  const effectiveStatus: UserStatus | null =
    profile?.status || claims?.status || cachedStatus || null;

  const hasActiveUser = Boolean(firebaseUser || auth.currentUser);
  const isAuthenticated = hasActiveUser && Boolean(effectiveRole);

  const isOnboardingRequired = Boolean(
    isAuthenticated && profile && profile.onboardingCompleted === false
  );

  const isPendingApproval = Boolean(
    effectiveRole === "faculty" &&
      (effectiveStatus === "PENDING" || effectiveStatus === "PENDING_APPROVAL")
  );

  const isAccountActive = effectiveStatus === "ACTIVE";
  const isAccountBlocked =
    effectiveStatus === "SUSPENDED" || effectiveStatus === "REJECTED";
  const isProfileComplete = Boolean(
    profile && profile.displayName && profile.email
  );

  const missingProfileFields = (() => {
    if (!profile) return [];
    const missing: string[] = [];
    if (!profile.displayName || profile.displayName.trim().length <= 1) missing.push("Full Name");
    if (!profile.email || !profile.email.includes("@")) missing.push("University Email");
    if (effectiveRole === "student") {
      if (!profile.rollNumber && !(profile as any).studentId) missing.push("Student Roll Number");
      if (!profile.phoneNumber && !profile.phone) missing.push("Mobile Contact Number");
      if (!profile.btechProgramme && !profile.department) missing.push("B.Tech Programme");
    } else if (effectiveRole === "faculty") {
      if (!profile.employeeId && !profile.facultyId) missing.push("Faculty / Employee ID");
      if (!profile.btechProgramme && !profile.department) missing.push("B.Tech Department / Programme");
    }
    return missing;
  })();

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
            : "B.Tech. Computer Science and Engineering",
        btechProgramme:
          newRole === "admin"
            ? undefined
            : "B.Tech. Computer Science and Engineering",
        updatedAt: new Date(),
      };
      await setDoc(userDocRef, updatedProfile, { merge: true });
      setClaims({ role: newRole, status: targetStatus });
      persistUserRole(newRole, targetStatus);
      setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
    } catch (err: any) {
      console.error("[AUTH] switchRole error:", err);
      toast.error("Failed to switch portal", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, persistUserRole, profile?.role, profile?.status]);

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
