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

function toDate(val) {
  if (!val) return new Date();
  if (val.toDate) return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

async function auditDatabase() {
  console.log("=== AUDITING FIRESTORE DATASETS FOR DASHBOARD & ANALYTICS ===");

  const [usersSnap, eventsSnap, regsSnap, rep1Snap, rep2Snap, logsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "events")),
    getDocs(collection(db, "registrations")),
    getDocs(collection(db, "event_reports")),
    getDocs(collection(db, "reports")),
    getDocs(collection(db, "auditLogs")),
  ]);

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const regs = regsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const reports1 = rep1Snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const reports2 = rep2Snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Users count:         ${users.length}`);
  console.log(`Events count:        ${events.length}`);
  console.log(`Registrations count: ${regs.length}`);
  console.log(`Event Reports count: ${reports1.length + reports2.length}`);
  console.log(`Audit Logs count:    ${logs.length}`);

  // User breakdown
  const students = users.filter(u => u.role === "student" && u.status === "ACTIVE");
  const faculty = users.filter(u => u.role === "faculty" && u.status === "ACTIVE");
  const admins = users.filter(u => u.role === "admin" && u.status === "ACTIVE");
  const pendingUsers = users.filter(u => u.status === "PENDING");

  console.log(`\n--- USERS BREAKDOWN ---`);
  console.log(`Active Students:     ${students.length}`);
  console.log(`Active Faculty:      ${faculty.length}`);
  console.log(`Active Admins:       ${admins.length}`);
  console.log(`Pending Users:       ${pendingUsers.length}`);

  // Events breakdown
  const pendingEvents = events.filter(e => e.status === "PENDING_APPROVAL");
  const publishedEvents = events.filter(e => e.status === "PUBLISHED" || e.status === "ONGOING");
  const completedEvents = events.filter(e => e.status === "COMPLETED");

  console.log(`\n--- EVENTS BREAKDOWN ---`);
  console.log(`Pending Approval:    ${pendingEvents.length}`);
  console.log(`Published/Live:      ${publishedEvents.length}`);
  console.log(`Completed:           ${completedEvents.length}`);

  // Registrations & Revenue
  const confirmedRegs = regs.filter(r => r.status === "CONFIRMED" || r.status === "ATTENDED");
  const totalRevenue = confirmedRegs.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
  const attendedRegs = regs.filter(r => r.checkedIn || r.status === "ATTENDED");

  console.log(`\n--- REGISTRATIONS BREAKDOWN ---`);
  console.log(`Confirmed/Attended:  ${confirmedRegs.length}`);
  console.log(`Actually Attended:   ${attendedRegs.length}`);
  console.log(`Total Revenue:       ₹${totalRevenue}`);

  // Monthly distributions
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const eventMonthly = {};
  const regMonthly = {};
  months.forEach(m => {
    eventMonthly[m] = 0;
    regMonthly[m] = 0;
  });

  events.forEach(ev => {
    const d = toDate(ev.startAt || ev.createdAt);
    const m = months[d.getMonth()];
    if (m) eventMonthly[m]++;
  });

  regs.forEach(r => {
    const d = toDate(r.registeredAt || r.createdAt);
    const m = months[d.getMonth()];
    if (m) regMonthly[m]++;
  });

  console.log(`\n--- REAL MONTHLY DISTRIBUTIONS ---`);
  months.forEach(m => {
    console.log(`${m}: Events = ${eventMonthly[m]}, Registrations = ${regMonthly[m]}`);
  });
}

auditDatabase().then(() => process.exit(0)).catch(console.error);
