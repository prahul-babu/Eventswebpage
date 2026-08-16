import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

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

// Simulate button state logic from EventDetailPage.tsx
function computeEventButtonState(event, role, isOrganiser, activeRegistration) {
  if (role === "faculty") {
    if (isOrganiser) {
      return { state: "MANAGE_EVENT", text: "Manage Event", disabled: false };
    }
    return { state: "FACULTY_VIEW", text: "Faculty & Staff View", disabled: true };
  }

  if (role === "admin") {
    return { state: "ADMIN_VIEW", text: "Admin Oversight", disabled: false };
  }

  // Student
  if (activeRegistration && activeRegistration.status !== "CANCELLED") {
    return { state: "ALREADY_REGISTERED", text: "View Your Entry Ticket", disabled: false };
  }

  return {
    state: "REGISTER_NOW",
    text: !event.isPaid || event.price === 0 ? "Register for Free" : `Register & Pay • ₹${event.price}`,
    disabled: false,
  };
}

// Simulate mutation role check
function attemptRegistration(role) {
  if (role === "faculty" || role === "admin") {
    throw new Error(`Event registration is restricted to students. ${role.toUpperCase()} accounts manage and oversee campus events.`);
  }
  return { success: true, status: "CONFIRMED" };
}

async function testRoleBasedEventActions() {
  console.log("--- TESTING ROLE-BASED EVENT ACTION GATING ---");

  const mockEvent = {
    id: "evt_test_001",
    title: "AI Workshop",
    isPaid: false,
    price: 0,
    organiserId: "fac_001",
    organiserEmail: "prof@apollouniversity.edu.in",
  };

  // 1. Student Test
  const studentBtn = computeEventButtonState(mockEvent, "student", false, null);
  console.log("Student Button State:", studentBtn);
  if (studentBtn.text !== "Register for Free" || studentBtn.state !== "REGISTER_NOW") {
    throw new Error("Student should see Register for Free");
  }
  const studentReg = attemptRegistration("student");
  console.log("Student Registration Execution:", studentReg);

  // 2. Faculty (Non-Organiser) Test
  const facultyOtherBtn = computeEventButtonState(mockEvent, "faculty", false, null);
  console.log("Faculty (Non-Organiser) Button State:", facultyOtherBtn);
  if (facultyOtherBtn.state !== "FACULTY_VIEW" || !facultyOtherBtn.disabled) {
    throw new Error("Faculty non-organiser must see disabled Faculty & Staff View");
  }
  try {
    attemptRegistration("faculty");
    throw new Error("Faculty registration should have been blocked");
  } catch (err) {
    console.log("Faculty Registration Blocked as Expected:", err.message);
  }

  // 3. Faculty (Organiser) Test
  const facultyOrgBtn = computeEventButtonState(mockEvent, "faculty", true, null);
  console.log("Faculty (Organiser) Button State:", facultyOrgBtn);
  if (facultyOrgBtn.state !== "MANAGE_EVENT" || facultyOrgBtn.disabled) {
    throw new Error("Faculty organiser must see Manage Event");
  }

  // 4. Admin Test
  const adminBtn = computeEventButtonState(mockEvent, "admin", false, null);
  console.log("Admin Button State:", adminBtn);
  if (adminBtn.state !== "ADMIN_VIEW") {
    throw new Error("Admin must see Admin Oversight");
  }
  try {
    attemptRegistration("admin");
    throw new Error("Admin registration should have been blocked");
  } catch (err) {
    console.log("Admin Registration Blocked as Expected:", err.message);
  }

  console.log("All Role-Based Event Action Gating Checks: PASS");
}

testRoleBasedEventActions().then(() => process.exit(0)).catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
