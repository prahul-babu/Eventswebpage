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

function getPostLoginRoute(role, status) {
  const effRole = (role || "student").toLowerCase();
  const effStatus = (status || "ACTIVE").toUpperCase();

  if (effStatus === "SUSPENDED" || effStatus === "REJECTED") {
    return "/account-blocked";
  }
  if (effRole === "faculty" && effStatus === "PENDING") {
    return "/pending";
  }
  if (effRole === "faculty" && effStatus === "ACTIVE") {
    return "/faculty";
  }
  if (effRole === "admin" && effStatus === "ACTIVE") {
    return "/admin";
  }
  return "/";
}

async function testRolePersistence() {
  console.log("--- TESTING AUTH & ROLE PERSISTENCE LOGIC ---");

  // 1. Test Route Decision Function
  console.log("Route Check: Faculty ACTIVE ->", getPostLoginRoute("faculty", "ACTIVE"), "EXPECTED: /faculty");
  console.log("Route Check: Admin ACTIVE ->", getPostLoginRoute("admin", "ACTIVE"), "EXPECTED: /admin");
  console.log("Route Check: Student ACTIVE ->", getPostLoginRoute("student", "ACTIVE"), "EXPECTED: /");
  console.log("Route Check: Faculty PENDING ->", getPostLoginRoute("faculty", "PENDING"), "EXPECTED: /pending");

  if (getPostLoginRoute("faculty", "ACTIVE") !== "/faculty") throw new Error("Faculty routing failed");
  if (getPostLoginRoute("admin", "ACTIVE") !== "/admin") throw new Error("Admin routing failed");
  if (getPostLoginRoute("student", "ACTIVE") !== "/") throw new Error("Student routing failed");

  // 2. Test Firestore Profile for Dev Faculty
  const facultyDoc = {
    uid: "test_faculty_audit_01",
    email: "test.faculty@apollouniversity.edu.in",
    displayName: "Dr. Audit Professor",
    role: "faculty",
    status: "ACTIVE",
    department: "Department of Computer Science & Engineering",
    employeeId: "EMP-CSE-999",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(doc(db, "users", "test_faculty_audit_01"), facultyDoc);
  const facultySnap = await getDoc(doc(db, "users", "test_faculty_audit_01"));
  if (!facultySnap.exists()) throw new Error("Faculty profile save failed");

  const readRole = facultySnap.data().role;
  console.log("Firestore Faculty Profile Readback Role:", readRole);
  if (readRole !== "faculty") throw new Error("Firestore faculty role mismatch");

  // Clean up
  await deleteDoc(doc(db, "users", "test_faculty_audit_01"));
  console.log("All Role Persistence and Route Lifecycle Checks: PASS");
}

testRolePersistence().then(() => process.exit(0)).catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
