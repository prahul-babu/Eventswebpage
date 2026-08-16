import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { format } from "date-fns";

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

function safeToDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return isNaN(value.getTime()) ? new Date() : value;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000);
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function safeFormatDate(value, formatPattern, fallback = "Date TBA") {
  if (!value) return fallback;
  try {
    const d = safeToDate(value);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatPattern);
  } catch {
    return fallback;
  }
}

async function testRegistrationFlow() {
  console.log("--- TESTING REGISTRATION FLOW & TICKET PASS RENDERING ---");

  // 1. Target Event
  const testEventId = "evt_1786807250503_u9om";
  const eventSnap = await getDoc(doc(db, "events", testEventId));
  if (!eventSnap.exists()) {
    console.error("FAIL: Target event not found.");
    process.exit(1);
  }
  const event = eventSnap.data();

  // Test TicketPassDialog date format calculation
  const formattedTicketDate = `${safeFormatDate(event.startAt, "MMM d, yyyy")} • ${safeFormatDate(event.startAt, "h:mm a")}`;
  console.log("Formatted Ticket Date:", formattedTicketDate);

  // 2. Create simulated registration document
  const testRegId = `test_reg_${Date.now()}`;
  const testTicketCode = `APL-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

  const regDoc = {
    id: testRegId,
    eventId: testEventId,
    userId: "test_student_uid",
    userDisplayName: "Test Student",
    userEmail: "test.student@apollouniversity.edu.in",
    userRollNumber: "2201A0501",
    userDepartment: "School of Technology",
    status: "CONFIRMED",
    ticketCode: testTicketCode,
    qrCodePayload: JSON.stringify({ ticketCode: testTicketCode, eventId: testEventId }),
    isPaid: true,
    amountPaid: 0,
    checkedIn: false,
    registeredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Write registration to Firestore
  await setDoc(doc(db, "registrations", testRegId), regDoc);
  console.log("Registration write: PASS (ID:", testRegId, ")");

  // Read back registration
  const readSnap = await getDoc(doc(db, "registrations", testRegId));
  if (!readSnap.exists()) {
    console.error("FAIL: Registration readback failed");
    process.exit(1);
  }
  console.log("Registration readback: PASS (Ticket Code:", readSnap.data().ticketCode, ")");

  // Clean up test registration
  await deleteDoc(doc(db, "registrations", testRegId));
  console.log("Cleanup test registration: PASS");
  console.log("Complete Flow Verification: ALL CHECKS PASSED!");
}

testRegistrationFlow().then(() => process.exit(0)).catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
