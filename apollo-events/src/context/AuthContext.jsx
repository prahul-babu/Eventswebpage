import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  onAuthStateChanged 
} from '../config/firebase';
import { 
  firebaseLogin, 
  loginWithGoogle as googleLoginService, 
  firebaseLogout,
  resolveUserProfile 
} from '../services/firebaseAuth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Persistent Firebase Authentication Listener
  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await resolveUserProfile(firebaseUser);
          setUser(profile);
        } catch (err) {
          console.warn("Auth state restore note:", err.message);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const userProfile = await firebaseLogin(email, password);
      setUser(userProfile);
      setLoading(false);
      return { success: true, user: userProfile };
    } catch (error) {
      setLoading(false);
      console.error("Firebase Login Error:", error);
      
      let message = 'Invalid email address or password. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email address or password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      } else if (error.message && !error.message.includes('closing/hidden')) {
        message = error.message;
      }
      
      return { success: false, message };
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const userProfile = await googleLoginService();
      setUser(userProfile);
      setLoading(false);
      return { success: true, user: userProfile };
    } catch (error) {
      setLoading(false);
      console.error("Firebase Google Login Error:", error);

      let message = 'Google Authentication failed.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Google sign-in popup was closed before completing.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Google sign-in popup was blocked by browser settings.';
      } else if (error.message && !error.message.includes('closing/hidden')) {
        message = error.message;
      }
      
      return { success: false, message };
    }
  };

  const logout = async () => {
    setUser(null);
    await firebaseLogout();
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-apollo-light flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <img 
            src="/assets/apollo_logo_full.png" 
            alt="The Apollo University" 
            className="h-16 w-auto mx-auto object-contain animate-pulse"
          />
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-3 border-apollo-teal border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-apollo-navy">
              Checking authentication...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, loading, initializing }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      login: async () => ({ success: false }),
      loginWithGoogle: async () => ({ success: false }),
      logout: async () => {},
      loading: false,
      initializing: false
    };
  }
  return context;
};
