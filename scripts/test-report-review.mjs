import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function testReportReviewLookup() {
  const targetId = "evt_1786807250503_u9om";
  console.log(`--- TESTING ADMIN REPORT REVIEW LOOKUP FOR [${targetId}] ---`);

  // 1. Direct event_reports lookup
  const snap = await getDoc(doc(db, "event_reports", targetId));
  if (!snap.exists()) {
    console.error("FAIL: Document does not exist in event_reports collection!");
    process.exit(1);
  }

  const raw = snap.data();
  console.log("Found Report in event_reports:");
  console.log(" - ID:", snap.id);
  console.log(" - Title:", raw.eventTitle);
  console.log(" - Organiser:", raw.organiserName);
  console.log(" - Department:", raw.department);
  console.log(" - Status:", raw.status);
  console.log(" - Attendance:", raw.participation?.actualAttendance, "/", raw.participation?.registeredCount);
  console.log(" - Budget Spent:", raw.finance?.budgetSpent, "of", raw.finance?.budgetAllocated);
  console.log("\nLookup result: PASS");
}

testReportReviewLookup().then(() => process.exit(0)).catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
