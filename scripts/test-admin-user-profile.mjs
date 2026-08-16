import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEG1IALlGX7Wh3sdDmwfWoaY6FEiL5hDU",
  authDomain: "theapolloeventhub.firebaseapp.com",
  projectId: "theapolloeventhub",
  storageBucket: "theapolloeventhub.firebasestorage.app",
  messagingSenderId: "1063531032324",
  appId: "1:1063531032324:web:dd42c32f91ada03bc26a51",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testUserLookup(uid) {
  console.log(`\n--- TESTING USER LOOKUP FOR UID: [${uid}] ---`);
  const userDocRef = doc(db, "users", uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    console.log("✔ Direct Doc Lookup found:", userSnap.data());
    return;
  }

  // Fallback lookup
  const q = query(collection(db, "users"), where("uid", "==", uid));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log("✔ Field 'uid' Lookup found:", snap.docs[0].data());
    return;
  }

  console.log("❌ Not found by direct ID or field.");
}

async function run() {
  await testUserLookup("Wvo40k74pQdRU58C7yzURMYOlZg1");
  await testUserLookup("0lBgdBhpN7Myc3mCYjmlKyL8NZ82");
  await testUserLookup("GEUlClYQAMdgRZddGYZUBJoXNmn1");
}

run().then(() => process.exit(0)).catch(console.error);
