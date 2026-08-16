import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function inspectDb() {
  console.log("--- INSPECTING FIRESTORE ---");
  const cols = ["users", "events", "event_reports", "reports", "registrations"];
  for (const c of cols) {
    try {
      const snap = await getDocs(collection(db, c));
      console.log(`Collection [${c}]: ${snap.docs.length} documents`);
      snap.docs.forEach((doc) => {
        console.log(`  - doc ID: ${doc.id}`);
        console.log(`    data:`, JSON.stringify(doc.data(), null, 2));
      });
    } catch (e) {
      console.error(`Error reading [${c}]:`, e.message);
    }
  }
}

inspectDb().then(() => process.exit(0)).catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
