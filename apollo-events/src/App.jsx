import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Footer from './components/layout/Footer';

// Pages
// Pages
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import UpcomingEventsPage from './pages/UpcomingEventsPage';
import RegisteredEventsPage from './pages/RegisteredEventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import FacultyDashboardPage from './pages/FacultyDashboardPage';
import CreateEventPage from './pages/CreateEventPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminEventsPage from './pages/AdminEventsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';


// Protected Route Helper
const ProtectedRoute = ({ children, allowedRoles, redirectTo }) => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Navigate to={redirectTo || '/login'} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/events" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen font-sans bg-apollo-light text-apollo-dark">
          
          <main className="flex-grow">
            <Routes>
              {/* Public Discovery Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/upcoming-events" element={<UpcomingEventsPage />}/>
              <Route path="/registered-events" element={<RegisteredEventsPage />}/>
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/categories" element={<HomePage />} />

              {/* Login Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/faculty/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              {/* Faculty Routes */}
              <Route
                path="/faculty/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']} redirectTo="/faculty/login">
                    <FacultyDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/events/create"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']} redirectTo="/faculty/login">
                    <CreateEventPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/events/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']} redirectTo="/faculty/login">
                    <CreateEventPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
                    <AdminEventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
                    <AdminCategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
                    <AdminAuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Catch-all */}
              <Route path="*" element={<Navigate to="/events" replace />} />
            </Routes>
          </main>

          <Footer />

        </div>
      </Router>
    </AuthProvider>
  );
}
