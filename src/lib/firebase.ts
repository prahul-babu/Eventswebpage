import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";

// Read Firebase Web Config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "theapolloeventhub.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Global symbol/flag to ensure emulator initialization runs only once across Vite HMR cycles
declare global {
  interface Window {
    __FIREBASE_EMULATORS_CONNECTED__?: boolean;
  }
}

// Initialize Firebase App instance (singleton)
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, "asia-south1");

// Connect to Local Emulators ONLY if explicitly requested via VITE_USE_FIREBASE_EMULATORS=true
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

if (useEmulators && typeof window !== "undefined" && !window.__FIREBASE_EMULATORS_CONNECTED__) {
  try {
    const emulatorHost = window.location.hostname || "127.0.0.1";

    // Auth Emulator on port 9099
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });

    // Firestore Emulator on port 8080
    connectFirestoreEmulator(db, emulatorHost, 8080);

    // Functions Emulator on port 5001 (asia-south1 region)
    connectFunctionsEmulator(functions, emulatorHost, 5001);

    // Storage Emulator on port 9199
    connectStorageEmulator(storage, emulatorHost, 9199);

    window.__FIREBASE_EMULATORS_CONNECTED__ = true;
    console.info("[Firebase] Connected client to local emulators (Auth: 9099, Firestore: 8080, Functions: 5001, Storage: 9199)");
  } catch (error) {
    console.warn("[Firebase] Emulators connection notice:", error);
  }
}
