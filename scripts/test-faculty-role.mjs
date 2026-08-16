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
  if (status === "PENDING" && role === "faculty") return "/pending";
  if (status === "SUSPENDED" || status === "REJECTED") return "/account-blocked";
  if (role === "admin") return "/admin";
  if (role === "faculty") return "/faculty";
  return "/";
}

async function testRoleChains() {
  console.log("--- TESTING FACULTY SIGNUP ROLE CHAIN ---");
  
  // 1. Simulate Faculty Signup Write
  const facultyUid = "usr_faculty_qa_test_" + Date.now();
  const facultyDocRef = doc(db, "users", facultyUid);
  const facultyProfile = {
    uid: facultyUid,
    email: "dr.faculty.qa@apollouniversity.edu.in",
    displayName: "Dr. Faculty QA",
    role: "faculty",
    status: "ACTIVE",
    department: "Department of Computer Science & Engineering",
    employeeId: "APL-FAC-1001",
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(facultyDocRef, facultyProfile);
  const snap = await getDoc(facultyDocRef);
  const data = snap.data();
  console.log("Faculty Document in Firestore:", data);

  const parsedRole = data.role.toLowerCase();
  const parsedStatus = data.status.toUpperCase();
  const facultyRoute = getPostLoginRoute(parsedRole, parsedStatus);
  console.log("Parsed Role:", parsedRole, "| Status:", parsedStatus);
  console.log("Computed Post-Login Route:", facultyRoute);

  const isFacultyPass = parsedRole === "faculty" && facultyRoute === "/faculty";
  console.log("Faculty Chain Result:", isFacultyPass ? "PASS" : "FAIL");

  // 2. Simulate Student Signup Write
  const studentUid = "usr_student_qa_test_" + Date.now();
  const studentDocRef = doc(db, "users", studentUid);
  const studentProfile = {
    uid: studentUid,
    email: "student.qa@apollouniversity.edu.in",
    displayName: "Student QA",
    role: "student",
    status: "ACTIVE",
    department: "School of Technology",
    rollNumber: "220101001",
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(studentDocRef, studentProfile);
  const sSnap = await getDoc(studentDocRef);
  const sData = sSnap.data();
  const sRole = sData.role.toLowerCase();
  const sRoute = getPostLoginRoute(sRole, sData.status.toUpperCase());
  console.log("\nStudent Document in Firestore:", sData);
  console.log("Student Route:", sRoute);
  const isStudentPass = sRole === "student" && sRoute === "/";
  console.log("Student Chain Result:", isStudentPass ? "PASS" : "FAIL");

  // Cleanup
  await deleteDoc(facultyDocRef);
  await deleteDoc(studentDocRef);
  console.log("\nCleaned up test documents.");

  if (!isFacultyPass || !isStudentPass) {
    process.exit(1);
  }
}

testRoleChains().then(() => process.exit(0)).catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
