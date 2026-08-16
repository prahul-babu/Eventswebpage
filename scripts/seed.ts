/**
 * Apollo University Event Hub - Emulator Seed Script
 * Populates realistic sample data for local development and testing.
 *
 * Usage:
 *   npm run seed:emulator
 */

import admin from "firebase-admin";

// Ensure connection to local emulators
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

const PROJECT_ID = "demo-apollo-hub";

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const auth = admin.auth();

const now = new Date();
const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
const subDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

async function seed() {
  console.log("🌱 Starting Apollo University Event Hub Emulator Seed...");
  console.log(`📡 Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);

  // ===========================================================================
  // 1. SEED USERS & AUTH ACCOUNTS
  // ===========================================================================
  console.log("👤 Seeding 8 Users (1 Admin, 2 Faculty, 5 Students)...");

  const usersData = [
    // 1 Admin
    {
      uid: "usr_admin_001",
      email: "admin@apollo.edu.in",
      displayName: "Dr. Vikram Sarabhai",
      role: "admin" as const,
      status: "ACTIVE" as const,
      department: "Institutional Administration",
      employeeId: "ADM-APOLLO-001",
      phoneNumber: "9876543210",
      bio: "Chief Administrator, Apollo University Campus Event Management Board.",
      onboardingCompleted: true,
    },
    // 2 Faculty (1 ACTIVE, 1 PENDING)
    {
      uid: "usr_faculty_001",
      email: "dr.sharma@apollo.edu.in",
      displayName: "Dr. Ananya Sharma",
      role: "faculty" as const,
      status: "ACTIVE" as const,
      department: "B.Tech. Computer Science and Engineering",
      employeeId: "FAC-CSE-101",
      phoneNumber: "9812345678",
      bio: "Associate Professor, Department of CSE. Lead coordinator for Tech Clubs.",
      onboardingCompleted: true,
    },
    {
      uid: "usr_faculty_002",
      email: "prof.rao@apollo.edu.in",
      displayName: "Prof. Rajesh Rao",
      role: "faculty" as const,
      status: "PENDING" as const,
      department: "B.Tech. CSE - Artificial Intelligence and Machine Learning",
      employeeId: "FAC-AIML-102",
      phoneNumber: "9823456789",
      bio: "Assistant Professor, AI & Machine Learning. Awaiting dean portal approval.",
      onboardingCompleted: false,
    },
    // 5 Students
    {
      uid: "usr_student_001",
      email: "aarav.patel@apollo.edu.in",
      displayName: "Aarav Patel",
      role: "student" as const,
      status: "ACTIVE" as const,
      department: "B.Tech. Computer Science and Engineering",
      rollNumber: "AP21CS001",
      phoneNumber: "9834567890",
      bio: "4th Year CSE. President of Apollo Open Source Society.",
      onboardingCompleted: true,
    },
    {
      uid: "usr_student_002",
      email: "diya.reddy@apollo.edu.in",
      displayName: "Diya Reddy",
      role: "student" as const,
      status: "ACTIVE" as const,
      department: "B.Tech. CSE - Cyber Security",
      rollNumber: "AP21CS042",
      phoneNumber: "9845678901",
      bio: "4th Year Cyber Security. Vice-President of Cultural Events Committee.",
      onboardingCompleted: true,
    },
    {
      uid: "usr_student_003",
      email: "rohan.gupta@apollo.edu.in",
      displayName: "Rohan Gupta",
      role: "student" as const,
      status: "ACTIVE" as const,
      department: "B.Tech. CSE - Artificial Intelligence and Data Science",
      rollNumber: "AP22AI015",
      phoneNumber: "9856789012",
      bio: "3rd Year AI & Data Science. Student coordinator for Science Symposiums.",
      onboardingCompleted: true,
    },
    {
      uid: "usr_student_004",
      email: "sneha.menon@apollo.edu.in",
      displayName: "Sneha Menon",
      role: "student" as const,
      status: "ACTIVE" as const,
      department: "B.Tech. CSE - Cloud Computing",
      rollNumber: "AP22CC008",
      phoneNumber: "9867890123",
      bio: "2nd Year Cloud Computing. Coordinator for Technology Conclaves.",
      onboardingCompleted: true,
    },
    {
      uid: "usr_student_005",
      email: "vikas.kumar@apollo.edu.in",
      displayName: "Vikas Kumar",
      role: "student" as const,
      status: "ACTIVE" as const,
      department: "B.Tech. CSE - AI & Health Care Technology",
      rollNumber: "AP23HC021",
      phoneNumber: "9878901234",
      bio: "1st Year AI & Health Care Tech. Enthusiastic participant in campus sports.",
      onboardingCompleted: true,
    },
  ];

  for (const user of usersData) {
    // 1. Create or update Auth User
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
      });
    } catch {
      // User might already exist in emulator
    }

    // 2. Set Custom User Claims for Role-Based Access Control
    await auth.setCustomUserClaims(user.uid, {
      role: user.role,
      status: user.status,
    });

    // 3. Write Firestore user document
    await db.collection("users").doc(user.uid).set({
      ...user,
      createdAt: admin.firestore.Timestamp.fromDate(subDays(30)),
      updatedAt: admin.firestore.Timestamp.fromDate(subDays(1)),
    });
  }

  // ===========================================================================
  // 2. SEED 6 EVENTS
  // ===========================================================================
  console.log("📅 Seeding Events spanning all statuses & categories...");

  const eventsData = [
    {
      id: "evt_draft_001",
      title: "Apollo AI & Quantum Computing Conclave 2026",
      description: "Annual academic conclave bringing together researchers in Quantum Algorithms and Generative AI architectures.",
      category: "ACADEMIC",
      status: "DRAFT",
      venueType: "ON_CAMPUS",
      venueLocation: "Dr. APJ Abdul Kalam Auditorium, Block 3",
      startAt: addDays(45),
      endAt: addDays(46),
      registrationDeadline: addDays(40),
      isPaid: false,
      price: 0,
      currency: "INR",
      capacity: 250,
      registeredCount: 0,
      tags: ["AI", "Quantum", "Research", "CSE"],
      organiserId: "usr_faculty_001",
      organiserName: "Dr. Ananya Sharma",
      organiserEmail: "dr.sharma@apollo.edu.in",
      organiserRole: "faculty",
      createdAt: subDays(5),
      updatedAt: subDays(1),
    },
    {
      id: "evt_pending_002",
      title: "National Inter-University Healthcare Hackathon",
      description: "A 36-hour intense hackathon focusing on AI diagnosis, telemedicine pipelines, and digital health records.",
      category: "HACKATHON",
      status: "PENDING_APPROVAL",
      venueType: "HYBRID",
      venueLocation: "Apollo Innovation Labs & Microsoft Teams",
      startAt: addDays(25),
      endAt: addDays(27),
      registrationDeadline: addDays(20),
      isPaid: true,
      price: 250,
      currency: "INR",
      capacity: 120,
      registeredCount: 0,
      tags: ["Hackathon", "Healthcare", "Coding", "Innovation"],
      organiserId: "usr_faculty_001",
      organiserName: "Dr. Ananya Sharma",
      organiserEmail: "dr.sharma@apollo.edu.in",
      organiserRole: "faculty",
      createdAt: subDays(3),
      updatedAt: subDays(2),
    },
    {
      id: "evt_published_003",
      title: "Annual Cultural Extravaganza: Apollo Aurora 2026",
      description: "The flagship annual cultural festival featuring music concerts, choreo nights, drama tournaments, and celebrity performances.",
      category: "CULTURAL",
      status: "PUBLISHED",
      venueType: "ON_CAMPUS",
      venueLocation: "University Central Amphitheatre",
      startAt: addDays(14),
      endAt: addDays(16),
      registrationDeadline: addDays(12),
      isPaid: true,
      price: 150,
      currency: "INR",
      capacity: 500,
      registeredCount: 3,
      tags: ["Cultural", "Music", "Dance", "Festival"],
      organiserId: "usr_admin_001",
      organiserName: "Dr. Vikram Sarabhai",
      organiserEmail: "admin@apollo.edu.in",
      organiserRole: "admin",
      approvedBy: "usr_admin_001",
      approvedAt: subDays(10),
      createdAt: subDays(15),
      updatedAt: subDays(10),
    },
    {
      id: "evt_ongoing_004",
      title: "Hands-on Full-Stack Cloud Native Architecture Workshop",
      description: "Intensive 2-day technical workshop on modern web scale, microservices, containerization, and Firebase Cloud Functions.",
      category: "WORKSHOP",
      status: "PUBLISHED",
      venueType: "ON_CAMPUS",
      venueLocation: "Advanced Computing Lab 4, Tech Block",
      startAt: addDays(2),
      endAt: addDays(4),
      registrationDeadline: addDays(1),
      isPaid: false,
      price: 0,
      currency: "INR",
      capacity: 80,
      registeredCount: 2,
      tags: ["Workshop", "Cloud", "WebDev", "Docker"],
      organiserId: "usr_faculty_001",
      organiserName: "Dr. Ananya Sharma",
      organiserEmail: "dr.sharma@apollo.edu.in",
      organiserRole: "faculty",
      approvedBy: "usr_admin_001",
      approvedAt: subDays(8),
      createdAt: subDays(12),
      updatedAt: subDays(8),
    },
    {
      id: "evt_completed_005",
      title: "Apollo Chancellor's Leadership & Innovation Summit",
      description: "Inaugural leadership forum with distinguished alumni, healthcare leaders, and tech founders.",
      category: "GUEST_LECTURE",
      status: "COMPLETED",
      venueType: "ON_CAMPUS",
      venueLocation: "Main University Convention Hall",
      startAt: subDays(10),
      endAt: subDays(9),
      registrationDeadline: subDays(12),
      isPaid: false,
      price: 0,
      currency: "INR",
      capacity: 300,
      registeredCount: 285,
      tags: ["Leadership", "Summit", "Alumni", "Keynote"],
      organiserId: "usr_admin_001",
      organiserName: "Dr. Vikram Sarabhai",
      organiserEmail: "admin@apollo.edu.in",
      organiserRole: "admin",
      approvedBy: "usr_admin_001",
      approvedAt: subDays(20),
      createdAt: subDays(25),
      updatedAt: subDays(9),
    },
    {
      id: "evt_rejected_006",
      title: "Late Night Gaming Fest & Unofficial LAN Party",
      description: "Multiplayer esports tournament proposed without faculty supervision.",
      category: "SPORTS",
      status: "REJECTED",
      venueType: "ON_CAMPUS",
      venueLocation: "Student Lounge Block A",
      startAt: addDays(10),
      endAt: addDays(11),
      registrationDeadline: addDays(8),
      isPaid: false,
      price: 0,
      currency: "INR",
      capacity: 60,
      registeredCount: 0,
      tags: ["Gaming", "Esports"],
      organiserId: "usr_faculty_001",
      organiserName: "Dr. Ananya Sharma",
      organiserEmail: "dr.sharma@apollo.edu.in",
      organiserRole: "faculty",
      rejectionReason: "Requires formal faculty advisor signature and room booking approval from Dean of Student Affairs.",
      createdAt: subDays(6),
      updatedAt: subDays(4),
    },
  ];

  for (const event of eventsData) {
    await db.collection("events").doc(event.id).set({
      ...event,
      startAt: admin.firestore.Timestamp.fromDate(event.startAt),
      endAt: admin.firestore.Timestamp.fromDate(event.endAt),
      registrationDeadline: admin.firestore.Timestamp.fromDate(event.registrationDeadline),
      approvedAt: event.approvedAt ? admin.firestore.Timestamp.fromDate(event.approvedAt) : undefined,
      createdAt: admin.firestore.Timestamp.fromDate(event.createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(event.updatedAt),
    });
  }

  // ===========================================================================
  // 3. SEED REGISTRATIONS & PAYMENTS
  // ===========================================================================
  console.log("🎟️ Seeding Registrations and Payments for Published Events...");

  const registrationsData = [
    {
      id: "reg_aurora_001",
      eventId: "evt_published_003",
      userId: "usr_student_001",
      userDisplayName: "Aarav Patel",
      userEmail: "aarav.patel@apollo.edu.in",
      userRollNumber: "AP21CS001",
      userDepartment: "Computer Science & Engineering",
      status: "CONFIRMED" as const,
      ticketCode: "AP-AUR-801",
      qrCodePayload: JSON.stringify({ ticketCode: "AP-AUR-801", eventId: "evt_published_003", userId: "usr_student_001" }),
      isPaid: true,
      paymentId: "pay_aurora_001",
      amountPaid: 150,
      checkedIn: false,
      registeredAt: subDays(4),
      updatedAt: subDays(4),
    },
    {
      id: "reg_aurora_002",
      eventId: "evt_published_003",
      userId: "usr_student_002",
      userDisplayName: "Diya Reddy",
      userEmail: "diya.reddy@apollo.edu.in",
      userRollNumber: "AP21IT042",
      userDepartment: "Information Technology",
      status: "CONFIRMED" as const,
      ticketCode: "AP-AUR-802",
      qrCodePayload: JSON.stringify({ ticketCode: "AP-AUR-802", eventId: "evt_published_003", userId: "usr_student_002" }),
      isPaid: true,
      paymentId: "pay_aurora_002",
      amountPaid: 150,
      checkedIn: false,
      registeredAt: subDays(3),
      updatedAt: subDays(3),
    },
    {
      id: "reg_aurora_003",
      eventId: "evt_published_003",
      userId: "usr_student_003",
      userDisplayName: "Rohan Gupta",
      userEmail: "rohan.gupta@apollo.edu.in",
      userRollNumber: "AP22BT015",
      userDepartment: "Biotechnology & Bioinformatics",
      status: "CONFIRMED" as const,
      ticketCode: "AP-AUR-803",
      qrCodePayload: JSON.stringify({ ticketCode: "AP-AUR-803", eventId: "evt_published_003", userId: "usr_student_003" }),
      isPaid: true,
      paymentId: "pay_aurora_003",
      amountPaid: 150,
      checkedIn: false,
      registeredAt: subDays(2),
      updatedAt: subDays(2),
    },
    {
      id: "reg_workshop_001",
      eventId: "evt_ongoing_004",
      userId: "usr_student_001",
      userDisplayName: "Aarav Patel",
      userEmail: "aarav.patel@apollo.edu.in",
      userRollNumber: "AP21CS001",
      userDepartment: "Computer Science & Engineering",
      status: "CONFIRMED" as const,
      ticketCode: "AP-WKS-101",
      qrCodePayload: JSON.stringify({ ticketCode: "AP-WKS-101", eventId: "evt_ongoing_004", userId: "usr_student_001" }),
      isPaid: false,
      amountPaid: 0,
      checkedIn: false,
      registeredAt: subDays(2),
      updatedAt: subDays(2),
    },
    {
      id: "reg_workshop_002",
      eventId: "evt_ongoing_004",
      userId: "usr_student_004",
      userDisplayName: "Sneha Menon",
      userEmail: "sneha.menon@apollo.edu.in",
      userRollNumber: "AP22CC008",
      userDepartment: "B.Tech. CSE - Cloud Computing",
      status: "CONFIRMED" as const,
      ticketCode: "AP-WKS-102",
      qrCodePayload: JSON.stringify({ ticketCode: "AP-WKS-102", eventId: "evt_ongoing_004", userId: "usr_student_004" }),
      isPaid: false,
      amountPaid: 0,
      checkedIn: false,
      registeredAt: subDays(1),
      updatedAt: subDays(1),
    },
  ];

  for (const reg of registrationsData) {
    await db.collection("registrations").doc(reg.id).set({
      ...reg,
      registeredAt: admin.firestore.Timestamp.fromDate(reg.registeredAt),
      updatedAt: admin.firestore.Timestamp.fromDate(reg.updatedAt),
    });
  }

  // Seed payments
  const paymentsData = [
    {
      id: "pay_aurora_001",
      userId: "usr_student_001",
      eventId: "evt_published_003",
      registrationId: "reg_aurora_001",
      amount: 150,
      amountPaise: 15000,
      currency: "INR",
      status: "CAPTURED" as const,
      gateway: "RAZORPAY" as const,
      razorpayOrderId: "order_apollo_seed_001",
      razorpayPaymentId: "pay_rzp_mock_001",
      razorpaySignature: "mock_signature_valid_001",
      createdAt: subDays(4),
      updatedAt: subDays(4),
    },
    {
      id: "pay_aurora_002",
      userId: "usr_student_002",
      eventId: "evt_published_003",
      registrationId: "reg_aurora_002",
      amount: 150,
      amountPaise: 15000,
      currency: "INR",
      status: "CAPTURED" as const,
      gateway: "RAZORPAY" as const,
      razorpayOrderId: "order_apollo_seed_002",
      razorpayPaymentId: "pay_rzp_mock_002",
      razorpaySignature: "mock_signature_valid_002",
      createdAt: subDays(3),
      updatedAt: subDays(3),
    },
    {
      id: "pay_aurora_003",
      userId: "usr_student_003",
      eventId: "evt_published_003",
      registrationId: "reg_aurora_003",
      amount: 150,
      amountPaise: 15000,
      currency: "INR",
      status: "CAPTURED" as const,
      gateway: "RAZORPAY" as const,
      razorpayOrderId: "order_apollo_seed_003",
      razorpayPaymentId: "pay_rzp_mock_003",
      razorpaySignature: "mock_signature_valid_003",
      createdAt: subDays(2),
      updatedAt: subDays(2),
    },
  ];

  for (const pay of paymentsData) {
    await db.collection("payments").doc(pay.id).set({
      ...pay,
      createdAt: admin.firestore.Timestamp.fromDate(pay.createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(pay.updatedAt),
    });
  }

  // Seed default settings/config
  await db.collection("settings").doc("config").set({
    paymentEnabled: true,
    allowedEmailDomains: ["apollouniversity.edu.in", "student.apollouniversity.edu.in", "apollo.edu.in"],
    maintenanceMode: false,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log("✅ Apollo University Event Hub Seed Completed Successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed Error:", err);
    process.exit(1);
  });
