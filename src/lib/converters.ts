import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
  collection,
  doc,
  Firestore,
  CollectionReference,
  DocumentReference,
} from "firebase/firestore";
import type {
  User,
  FirestoreUserDocument,
  Event,
  FirestoreEventDocument,
  Registration,
  FirestoreRegistrationDocument,
  Payment,
  FirestorePaymentDocument,
  Report,
  FirestoreReportDocument,
  EventReport,
  FirestoreEventReportDocument,
} from "@/types";

/**
 * Utility helper to safely convert Firestore Timestamp or Date to JavaScript Date
 */
export function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "object" && "seconds" in value) {
    const ts = value as { seconds: number; nanoseconds?: number };
    return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
  }
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return new Date();
}

/**
 * Utility helper to safely convert Date to Firestore Timestamp
 */
export function toTimestamp(date?: Date | string | number | null): Timestamp {
  if (!date) return Timestamp.now();
  if (date instanceof Date) return Timestamp.fromDate(date);
  return Timestamp.fromDate(new Date(date));
}

// -----------------------------------------------------------------------------
// 1. User Converter
// -----------------------------------------------------------------------------
export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: User): FirestoreUserDocument {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      department: user.department,
      rollNumber: user.rollNumber,
      year: user.year,
      section: user.section,
      employeeId: user.employeeId,
      designation: user.designation,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      bio: user.bio,
      onboardingCompleted: user.onboardingCompleted,
      approvedBy: user.approvedBy,
      approvedAt: user.approvedAt ? toTimestamp(user.approvedAt) : undefined,
      rejectionReason: user.rejectionReason,
      lastLoginAt: user.lastLoginAt ? toTimestamp(user.lastLoginAt) : undefined,
      createdAt: toTimestamp(user.createdAt),
      updatedAt: toTimestamp(user.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): User {
    const data = snapshot.data(options) as FirestoreUserDocument;
    return {
      uid: snapshot.id,
      email: data.email || "",
      displayName: data.displayName || "",
      role: data.role || "student",
      status: data.status || "PENDING",
      department: data.department || "",
      rollNumber: data.rollNumber,
      year: data.year,
      section: data.section,
      employeeId: data.employeeId,
      designation: data.designation,
      phoneNumber: data.phoneNumber,
      photoURL: data.photoURL,
      bio: data.bio,
      onboardingCompleted: Boolean(data.onboardingCompleted),
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt ? toDate(data.approvedAt) : undefined,
      rejectionReason: data.rejectionReason,
      lastLoginAt: data.lastLoginAt ? toDate(data.lastLoginAt) : undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

// -----------------------------------------------------------------------------
// 2. Event Converter
// -----------------------------------------------------------------------------
export const eventConverter: FirestoreDataConverter<Event> = {
  toFirestore(event: Event): FirestoreEventDocument {
    return {
      title: event.title,
      description: event.description,
      category: event.category,
      status: event.status,
      venueType: event.venueType,
      venueLocation: event.venueLocation,
      startAt: toTimestamp(event.startAt),
      endAt: toTimestamp(event.endAt),
      registrationDeadline: toTimestamp(event.registrationDeadline),
      registrationStartAt: event.registrationStartAt ? toTimestamp(event.registrationStartAt) : undefined,
      cancellationDeadline: event.cancellationDeadline ? toTimestamp(event.cancellationDeadline) : undefined,
      isPaid: Boolean(event.isPaid),
      price: event.price || 0,
      currency: event.currency || "INR",
      capacity: event.capacity || 0,
      registeredCount: event.registeredCount || 0,
      allowWaitlist: Boolean(event.allowWaitlist),
      maxTeamSize: event.maxTeamSize || 1,
      bannerUrl: event.bannerUrl,
      gallery: event.gallery || [],
      tags: event.tags || [],
      eligibility: event.eligibility,
      prerequisites: event.prerequisites,
      customQuestions: event.customQuestions,
      organiserId: event.organiserId,
      organiserName: event.organiserName,
      organiserEmail: event.organiserEmail,
      organiserPhone: event.organiserPhone,
      organiserRole: event.organiserRole,
      department: event.department,
      approvedBy: event.approvedBy,
      approvedAt: event.approvedAt ? toTimestamp(event.approvedAt) : undefined,
      rejectionReason: event.rejectionReason,
      createdAt: toTimestamp(event.createdAt),
      updatedAt: toTimestamp(event.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Event {
    const data = snapshot.data(options) as FirestoreEventDocument;
    return {
      id: snapshot.id,
      title: data.title || "",
      description: data.description || "",
      category: data.category || "ACADEMIC",
      status: data.status || "DRAFT",
      venueType: data.venueType || "ON_CAMPUS",
      venueLocation: data.venueLocation || "",
      startAt: toDate(data.startAt),
      endAt: toDate(data.endAt),
      registrationDeadline: toDate(data.registrationDeadline),
      registrationStartAt: data.registrationStartAt ? toDate(data.registrationStartAt) : undefined,
      cancellationDeadline: data.cancellationDeadline ? toDate(data.cancellationDeadline) : undefined,
      isPaid: Boolean(data.isPaid),
      price: data.price || 0,
      currency: data.currency || "INR",
      capacity: data.capacity || 0,
      registeredCount: data.registeredCount || 0,
      allowWaitlist: Boolean(data.allowWaitlist),
      maxTeamSize: data.maxTeamSize || 1,
      bannerUrl: data.bannerUrl,
      gallery: data.gallery || [],
      tags: data.tags || [],
      eligibility: data.eligibility,
      prerequisites: data.prerequisites,
      customQuestions: data.customQuestions,
      organiserId: data.organiserId || "",
      organiserName: data.organiserName || "",
      organiserEmail: data.organiserEmail || "",
      organiserPhone: data.organiserPhone,
      organiserRole: data.organiserRole || "student",
      department: data.department || "Apollo University",
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt ? toDate(data.approvedAt) : undefined,
      rejectionReason: data.rejectionReason,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

// -----------------------------------------------------------------------------
// 3. Registration Converter
// -----------------------------------------------------------------------------
export const registrationConverter: FirestoreDataConverter<Registration> = {
  toFirestore(reg: Registration): FirestoreRegistrationDocument {
    return {
      eventId: reg.eventId,
      userId: reg.userId,
      userDisplayName: reg.userDisplayName,
      userEmail: reg.userEmail,
      userRollNumber: reg.userRollNumber,
      userDepartment: reg.userDepartment,
      userPhone: reg.userPhone,
      status: reg.status,
      ticketCode: reg.ticketCode,
      qrCodePayload: reg.qrCodePayload,
      teamName: reg.teamName,
      teamMembers: reg.teamMembers,
      answers: reg.answers,
      isPaid: Boolean(reg.isPaid),
      paymentId: reg.paymentId,
      amountPaid: reg.amountPaid || 0,
      refundFlagged: Boolean(reg.refundFlagged),
      checkedIn: Boolean(reg.checkedIn),
      checkedInAt: reg.checkedInAt ? toTimestamp(reg.checkedInAt) : undefined,
      checkedInBy: reg.checkedInBy,
      checkInMethod: reg.checkInMethod,
      registeredAt: toTimestamp(reg.registeredAt),
      updatedAt: toTimestamp(reg.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Registration {
    const data = snapshot.data(options) as FirestoreRegistrationDocument;
    return {
      id: snapshot.id,
      eventId: data.eventId || "",
      userId: data.userId || "",
      userDisplayName: data.userDisplayName || "",
      userEmail: data.userEmail || "",
      userRollNumber: data.userRollNumber,
      userDepartment: data.userDepartment,
      userPhone: data.userPhone,
      status: data.status || "CONFIRMED",
      ticketCode: data.ticketCode || "",
      qrCodePayload: data.qrCodePayload || "",
      teamName: data.teamName,
      teamMembers: data.teamMembers || [],
      answers: data.answers || {},
      isPaid: Boolean(data.isPaid),
      paymentId: data.paymentId,
      amountPaid: data.amountPaid || 0,
      refundFlagged: Boolean(data.refundFlagged),
      checkedIn: Boolean(data.checkedIn),
      checkedInAt: data.checkedInAt ? toDate(data.checkedInAt) : undefined,
      checkedInBy: data.checkedInBy,
      checkInMethod: data.checkInMethod,
      registeredAt: toDate(data.registeredAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

// -----------------------------------------------------------------------------
// 4. Payment Converter
// -----------------------------------------------------------------------------
export const paymentConverter: FirestoreDataConverter<Payment> = {
  toFirestore(pay: Payment): FirestorePaymentDocument {
    return {
      userId: pay.userId,
      eventId: pay.eventId,
      registrationId: pay.registrationId,
      amount: pay.amount,
      amountPaise: pay.amountPaise || Math.round((pay.amount || 0) * 100),
      currency: pay.currency || "INR",
      status: pay.status,
      gateway: pay.gateway,
      razorpayOrderId: pay.razorpayOrderId,
      razorpayPaymentId: pay.razorpayPaymentId,
      razorpaySignature: pay.razorpaySignature,
      errorMessage: pay.errorMessage,
      refundId: pay.refundId,
      refundedAt: pay.refundedAt ? toTimestamp(pay.refundedAt) : undefined,
      createdAt: toTimestamp(pay.createdAt),
      updatedAt: toTimestamp(pay.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Payment {
    const data = snapshot.data(options) as FirestorePaymentDocument;
    return {
      id: snapshot.id,
      userId: data.userId || "",
      eventId: data.eventId || "",
      registrationId: data.registrationId || "",
      amount: data.amount || 0,
      amountPaise: data.amountPaise || (data.amount ? Math.round(data.amount * 100) : 0),
      currency: data.currency || "INR",
      status: data.status || "PENDING",
      gateway: data.gateway || "RAZORPAY",
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
      errorMessage: data.errorMessage,
      refundId: data.refundId,
      refundedAt: data.refundedAt ? toDate(data.refundedAt) : undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

// -----------------------------------------------------------------------------
// 5. Report Converter
// -----------------------------------------------------------------------------
export const reportConverter: FirestoreDataConverter<Report> = {
  toFirestore(rep: Report): FirestoreReportDocument {
    return {
      type: rep.type,
      title: rep.title,
      generatedBy: rep.generatedBy,
      generatedByName: rep.generatedByName,
      eventId: rep.eventId,
      department: rep.department,
      attendance: rep.attendance,
      revenue: rep.revenue,
      exportUrl: rep.exportUrl,
      createdAt: toTimestamp(rep.createdAt),
      updatedAt: toTimestamp(rep.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Report {
    const data = snapshot.data(options) as FirestoreReportDocument;
    return {
      id: snapshot.id,
      type: data.type || "EVENT_ATTENDANCE",
      title: data.title || "",
      generatedBy: data.generatedBy || "",
      generatedByName: data.generatedByName || "",
      eventId: data.eventId,
      department: data.department,
      attendance: data.attendance,
      revenue: data.revenue,
      exportUrl: data.exportUrl,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

// -----------------------------------------------------------------------------
// 6. Post-Event Report (EventReport) Converter
// -----------------------------------------------------------------------------
export const eventReportConverter: FirestoreDataConverter<EventReport> = {
  toFirestore(rep: EventReport): FirestoreEventReportDocument {
    return {
      eventId: rep.eventId,
      eventTitle: rep.eventTitle,
      category: rep.category,
      eventDate: toTimestamp(rep.eventDate),
      venueLocation: rep.venueLocation,
      department: rep.department,
      organiserId: rep.organiserId,
      organiserName: rep.organiserName,
      organiserEmail: rep.organiserEmail,
      status: rep.status,
      adminFeedback: rep.adminFeedback,
      reviewedBy: rep.reviewedBy,
      reviewedByName: rep.reviewedByName,
      reviewedAt: rep.reviewedAt ? toTimestamp(rep.reviewedAt) : undefined,
      submittedAt: rep.submittedAt ? toTimestamp(rep.submittedAt) : undefined,
      summary: rep.summary,
      participation: rep.participation,
      resourcePersons: rep.resourcePersons || [],
      finance: rep.finance,
      media: rep.media,
      feedback: rep.feedback,
      institutionalMapping: rep.institutionalMapping,
      createdAt: toTimestamp(rep.createdAt),
      updatedAt: toTimestamp(rep.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): EventReport {
    const data = snapshot.data(options) as FirestoreEventReportDocument;
    return {
      id: snapshot.id,
      eventId: data.eventId || snapshot.id,
      eventTitle: data.eventTitle || "",
      category: data.category || "ACADEMIC",
      eventDate: toDate(data.eventDate),
      venueLocation: data.venueLocation || "",
      department: data.department || "",
      organiserId: data.organiserId || "",
      organiserName: data.organiserName || "",
      organiserEmail: data.organiserEmail || "",
      status: data.status || "DRAFT",
      adminFeedback: data.adminFeedback,
      reviewedBy: data.reviewedBy,
      reviewedByName: data.reviewedByName,
      reviewedAt: data.reviewedAt ? toDate(data.reviewedAt) : undefined,
      submittedAt: data.submittedAt ? toDate(data.submittedAt) : undefined,
      summary: data.summary || {
        executiveSummary: "",
        detailedProceedings: "",
        objectives: [],
        outcomesAchieved: [],
      },
      participation: data.participation || {
        registeredCount: 0,
        actualAttendance: 0,
        departmentWiseBreakdown: {},
        yearWiseBreakdown: {},
        externalParticipantsCount: 0,
        externalInstitutions: [],
        facultyCoordinators: [],
        studentVolunteersCount: 0,
        studentVolunteersNames: [],
      },
      resourcePersons: data.resourcePersons || [],
      finance: data.finance || {
        budgetAllocated: 0,
        budgetSpent: 0,
        balance: 0,
        expenses: [],
        sponsorships: [],
        revenueFromRegistrations: 0,
      },
      media: data.media || {
        photos: [],
        videos: [],
        documents: [],
      },
      feedback: data.feedback || {
        feedbackSummary: "",
        averageRating: 5,
        responseCount: 0,
        participantQuotes: [],
        suggestionsForFuture: "",
      },
      institutionalMapping: data.institutionalMapping || {
        academicYear: "2025-26",
        naacCriterion: "Criterion 1: Curricular Aspects",
        nbaProgrammeOutcomes: [],
        sdgGoals: [4],
        activityType: "Co-curricular",
        collaboratingInstitutions: [],
        certificatesIssuedCount: 0,
      },
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

// -----------------------------------------------------------------------------
// Typed Collection and Document Reference Getters
// -----------------------------------------------------------------------------
export const getUsersCollection = (db: Firestore): CollectionReference<User> =>
  collection(db, "users").withConverter(userConverter);

export const getUserDoc = (db: Firestore, uid: string): DocumentReference<User> =>
  doc(db, "users", uid).withConverter(userConverter);

export const getEventsCollection = (db: Firestore): CollectionReference<Event> =>
  collection(db, "events").withConverter(eventConverter);

export const getEventDoc = (db: Firestore, eventId: string): DocumentReference<Event> =>
  doc(db, "events", eventId).withConverter(eventConverter);

export const getRegistrationsCollection = (db: Firestore): CollectionReference<Registration> =>
  collection(db, "registrations").withConverter(registrationConverter);

export const getRegistrationDoc = (db: Firestore, registrationId: string): DocumentReference<Registration> =>
  doc(db, "registrations", registrationId).withConverter(registrationConverter);

export const getPaymentsCollection = (db: Firestore): CollectionReference<Payment> =>
  collection(db, "payments").withConverter(paymentConverter);

export const getPaymentDoc = (db: Firestore, paymentId: string): DocumentReference<Payment> =>
  doc(db, "payments", paymentId).withConverter(paymentConverter);

export const getReportsCollection = (db: Firestore): CollectionReference<Report> =>
  collection(db, "reports").withConverter(reportConverter);

export const getReportDoc = (db: Firestore, reportId: string): DocumentReference<Report> =>
  doc(db, "reports", reportId).withConverter(reportConverter);

export const getEventReportsCollection = (db: Firestore): CollectionReference<EventReport> =>
  collection(db, "event_reports").withConverter(eventReportConverter);

export const getEventReportDoc = (db: Firestore, eventId: string): DocumentReference<EventReport> =>
  doc(db, "event_reports", eventId).withConverter(eventReportConverter);
