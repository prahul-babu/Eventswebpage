import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

// Official Firebase configuration for apollo-events-hub
const firebaseConfig = {
  apiKey: "AIzaSyDH4Bz0plMIR-RYv_OMTSPGWiCnYtYw-g8",
  authDomain: "apollo-events-hub.firebaseapp.com",
  projectId: "apollo-events-hub",
  storageBucket: "apollo-events-hub.firebasestorage.app",
  messagingSenderId: "215789205212",
  appId: "1:215789205212:web:f8ecdc5ac161af21c9e619",
  measurementId: "G-K1WHERWR94"
};

// Safe Firebase Initialization
let app, auth, db, googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Configure fallback persistence to avoid IndexedDB closing/hidden tab lock issues
  try {
    setPersistence(auth, browserLocalPersistence).catch(() => {
      setPersistence(auth, inMemoryPersistence).catch(() => {});
    });
  } catch (persErr) {
    console.warn("Firebase Auth persistence fallback:", persErr.message);
  }

  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (err) {
  console.warn("Firebase initialization warning:", err.message);
  app = null;
  auth = null;
  db = null;
  googleProvider = null;
}

export { 
  app,
  auth,
  db,
  googleProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
};

export default app;
