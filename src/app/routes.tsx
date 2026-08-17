import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

// Layout Wrappers
import { StudentLayout } from "@/components/layout/StudentLayout";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Lazy-loaded Pages per Portal
const LandingPage = lazy(() => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));
const PendingPage = lazy(() => import("@/pages/PendingPage").then((m) => ({ default: m.PendingPage })));
const FacultyApplicationSubmittedPage = lazy(() => import("@/pages/faculty/FacultyApplicationSubmittedPage").then((m) => ({ default: m.FacultyApplicationSubmittedPage })));
const AccountBlockedPage = lazy(() => import("@/pages/AccountBlockedPage").then((m) => ({ default: m.AccountBlockedPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

// Shared Pages
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotificationPreferencesPage = lazy(() => import("@/pages/NotificationPreferencesPage"));
const HelpCenterPage = lazy(() => import("@/pages/HelpCenterPage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));

// Student & Ticketing Pages
const MyRegistrationsPage = lazy(() => import("@/pages/student/MyRegistrationsPage"));
const StudentParticipationPage = lazy(() => import("@/pages/student/StudentParticipationPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const TicketPassPage = lazy(() => import("@/pages/TicketPassPage"));

// Faculty Pages
const FacultyDashboardPage = lazy(() => import("@/pages/faculty/FacultyDashboardPage"));
const MyEventsPage = lazy(() => import("@/pages/faculty/MyEventsPage"));
const EventWizardPage = lazy(() => import("@/pages/faculty/EventWizardPage"));
const EventRegistrantsPage = lazy(() => import("@/pages/faculty/EventRegistrantsPage"));
const EventCheckInPage = lazy(() => import("@/pages/faculty/EventCheckInPage"));
const FacultyEventAnalyticsPage = lazy(() => import("@/pages/faculty/FacultyEventAnalyticsPage"));
const FacultyReportsPage = lazy(() => import("@/pages/faculty/FacultyReportsPage"));
const EventReportBuilderPage = lazy(() => import("@/pages/faculty/EventReportBuilderPage"));

// Admin Pages
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminEventsPage = lazy(() => import("@/pages/admin/AdminEventsPage"));
const AdminApprovalsPage = lazy(() => import("@/pages/admin/AdminApprovalsPage"));
const AdminEventReviewPage = lazy(() => import("@/pages/admin/AdminEventReviewPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminUserRequestsPage = lazy(() => import("@/pages/admin/AdminUserRequestsPage"));
const AdminUserProfilePage = lazy(() => import("@/pages/admin/AdminUserProfilePage"));
const AdminUserImportPage = lazy(() => import("@/pages/admin/AdminUserImportPage"));
const AdminReportsPage = lazy(() => import("@/pages/admin/AdminReportsPage"));
const AdminReportReviewPage = lazy(() => import("@/pages/admin/AdminReportReviewPage"));
const AdminEventDetailPage = lazy(() => import("@/pages/admin/AdminEventDetailPage"));
const AdminEventEditPage = lazy(() => import("@/pages/admin/AdminEventEditPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminAuditLogsPage = lazy(() => import("@/pages/admin/AdminAuditLogsPage"));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <Routes>
        {/* Public & Auth Flow Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/faculty/application-submitted" element={<FacultyApplicationSubmittedPage />} />
        <Route path="/account-blocked" element={<AccountBlockedPage />} />

        {/* Student Portal & Shared Campus Routes */}
        <Route element={<StudentLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/checkout/:registrationId" element={<CheckoutPage />} />
          <Route path="/tickets/:registrationId" element={<TicketPassPage />} />
          <Route path="/my-registrations" element={<MyRegistrationsPage />} />
          <Route path="/my-participation" element={<StudentParticipationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/notifications" element={<NotificationPreferencesPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
        </Route>

        {/* Faculty & Organiser Portal Routes */}
        <Route element={<FacultyLayout />}>
          <Route path="/faculty" element={<FacultyDashboardPage />} />
          <Route path="/faculty/events" element={<MyEventsPage />} />
          <Route path="/faculty/events/new" element={<EventWizardPage />} />
          <Route path="/faculty/events/:eventId/edit" element={<EventWizardPage />} />
          <Route path="/faculty/events/:eventId/registrants" element={<EventRegistrantsPage />} />
          <Route path="/faculty/events/:eventId/check-in" element={<EventCheckInPage />} />
          <Route path="/faculty/events/:eventId/analytics" element={<FacultyEventAnalyticsPage />} />
          <Route path="/faculty/events/:eventId/report" element={<EventReportBuilderPage />} />
          <Route path="/faculty/reports" element={<FacultyReportsPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
        </Route>

        {/* Institutional Admin Portal Routes */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
          <Route path="/admin/events/:eventId" element={<AdminEventDetailPage />} />
          <Route path="/admin/events/:eventId/edit" element={<AdminEventEditPage />} />
          <Route path="/admin/events/:eventId/registrations" element={<EventRegistrantsPage />} />
          <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
          <Route path="/admin/approvals/:eventId" element={<AdminEventReviewPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/requests" element={<AdminUserRequestsPage />} />
          <Route path="/admin/users/import" element={<AdminUserImportPage />} />
          <Route path="/admin/users/:uid" element={<AdminUserProfilePage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/reports/:eventId" element={<AdminReportReviewPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
export default AppRoutes;
