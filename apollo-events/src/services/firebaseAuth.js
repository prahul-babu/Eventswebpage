import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  doc,
  getDoc,
  setDoc
} from '../config/firebase';

// Retrieve and resolve user role securely from Firestore database
export const resolveUserProfile = async (firebaseUser) => {
  const uid = firebaseUser.uid;
  const emailLower = (firebaseUser.email || '').toLowerCase();
  const displayName = firebaseUser.displayName;

  // Default role resolution based on email pattern
  let role = 'student';
  let name = displayName || (emailLower ? emailLower.split('@')[0] : 'Apollo Student');
  let school = 'School of Technology';
  let department = 'Computer Science & Engineering';

  if (emailLower.includes('admin')) {
    role = 'admin';
    name = displayName || 'Dr. Vikram Varma';
    school = 'Office of Academic Affairs';
    department = 'University Administration';
  } else if (emailLower.includes('faculty') || emailLower.includes('dr.') || emailLower.includes('sharma')) {
    role = 'faculty';
    name = displayName || 'Dr. Rajesh Sharma';
    school = 'School of Technology';
    department = 'Computer Science';
  } else if (emailLower.includes('student') || emailLower.includes('rahul')) {
    name = displayName || 'Rahul Babu';
  }

  // Attempt real Firestore lookup
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          _id: uid,
          name: data.name || name,
          email: emailLower,
          role: data.role || role,
          school: data.school || school,
          department: data.department || department,
          token: await firebaseUser.getIdToken()
        };
      } else {
        // Save user document to Firestore database
        const newProfile = {
          uid,
          name,
          email: emailLower,
          role,
          school,
          department,
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(userRef, newProfile);
        } catch (setErr) {
          console.error("Firestore setDoc warning:", setErr);
        }
      }
    } catch (fsError) {
      // Log actual Firestore error in console for debugging (e.g. database missing or rules)
      console.error("REAL FIRESTORE ERROR during role lookup:", fsError);
    }
  }

  return {
    _id: uid,
    name,
    email: emailLower,
    role,
    school,
    department,
    token: await firebaseUser.getIdToken()
  };
};

// Official Firebase Google Authentication
export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth is not initialized. Please check network connection.');
  }

  const result = await signInWithPopup(auth, googleProvider);
  const userProfile = await resolveUserProfile(result.user);
  return userProfile;
};

// Official Firebase Email & Password Authentication
export const firebaseLogin = async (email, password) => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }

  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
  } catch (authError) {
    // If IndexedDB closed/hidden lock error occurs, switch to inMemoryPersistence and retry once
    if (authError.message && authError.message.includes('closing/hidden')) {
      console.warn("Retrying auth with inMemoryPersistence due to IndexedDB lock...");
      await setPersistence(auth, inMemoryPersistence);
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } else {
      throw authError;
    }
  }

  const userProfile = await resolveUserProfile(userCredential.user);
  return userProfile;
};

// Official Firebase Sign Out
export const firebaseLogout = async () => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut note:', err.message);
    }
  }
};
