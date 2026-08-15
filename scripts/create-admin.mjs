import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEG1IALlGX7Wh3sdDmwfWoaY6FEiL5hDU",
  authDomain: "theapolloeventhub.firebaseapp.com",
  projectId: "theapolloeventhub",
  storageBucket: "theapolloeventhub.firebasestorage.app",
  messagingSenderId: "1063531032324",
  appId: "1:1063531032324:web:dd42c32f91ada03bc26a51",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1] || "Admin@12345";
  const displayName = args[2] || "Campus Administrator";

  if (!email) {
    console.log(`
Usage:
  node scripts/create-admin.mjs <email> [password] [displayName]

Examples:
  node scripts/create-admin.mjs admin@apollouniversity.edu.in Admin@12345 "Chief Administrator"
  node scripts/create-admin.mjs your.name@apollouniversity.edu.in
    `);
    process.exit(1);
  }

  const trimmedEmail = email.toLowerCase().trim();

  console.log(`\n========================================`);
  console.log(`PROVISIONING ADMIN CREDENTIALS`);
  console.log(`========================================`);
  console.log(`Email:       ${trimmedEmail}`);
  console.log(`Display:     ${displayName}`);
  console.log(`Target Role: admin (ACTIVE)\n`);

  let uid = null;
  let isNewAuthUser = false;

  // 1. Try to create user in Firebase Auth
  try {
    const userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    uid = userCred.user.uid;
    isNewAuthUser = true;
    await updateProfile(userCred.user, { displayName });
    console.log(`✔ Created new Firebase Auth user with UID: ${uid}`);
  } catch (authErr) {
    if (authErr.code === "auth/email-already-in-use") {
      console.log(`ℹ Firebase Auth account already exists. Attempting sign-in or lookup...`);
      try {
        const signCred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        uid = signCred.user.uid;
        console.log(`✔ Signed in with provided password. UID: ${uid}`);
      } catch (signInErr) {
        console.log(`ℹ Looking up existing Firestore document by email...`);
        const q = query(collection(db, "users"), where("email", "==", trimmedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          uid = snap.docs[0].id;
          console.log(`✔ Found existing Firestore document with UID: ${uid}`);
        } else {
          console.warn(`⚠ Could not sign in with provided password (${signInErr.message}), but will create a pending admin record.`);
          uid = `usr_admin_${Date.now()}`;
        }
      }
    } else {
      console.error(`❌ Firebase Auth error:`, authErr.message);
      process.exit(1);
    }
  }

  // 2. Write authoritative Admin profile to Firestore users/{uid}
  const adminProfile = {
    uid,
    email: trimmedEmail,
    displayName,
    role: "admin",
    status: "ACTIVE",
    department: "Institutional Administration",
    designation: "Chief Event Administrator",
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(doc(db, "users", uid), adminProfile, { merge: true });
  console.log(`✔ Written authoritative Admin profile to Firestore: users/${uid}`);

  // 3. Verify readback
  const verifySnap = await getDoc(doc(db, "users", uid));
  if (verifySnap.exists() && verifySnap.data().role === "admin") {
    console.log(`\n========================================`);
    console.log(`ADMIN CREDENTIALS CONFIGURED SUCCESSFULLY!`);
    console.log(`========================================`);
    console.log(`Email:    ${trimmedEmail}`);
    if (isNewAuthUser) {
      console.log(`Password: ${password}`);
    } else {
      console.log(`Password: (Existing account password or Microsoft SSO)`);
    }
    console.log(`Role:     admin`);
    console.log(`Portal:   /admin`);
    console.log(`\nLogin URL: http://localhost:5173/login`);
    console.log(`Production: https://theapolloeventhub.web.app/login\n`);
  } else {
    console.error(`❌ Verification failed: Firestore document does not reflect admin role.`);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
