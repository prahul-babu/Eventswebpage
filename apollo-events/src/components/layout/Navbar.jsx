import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onSearchChange, searchValue }) {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName =
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const navItems = [
    {
      label: 'Home',
      path: '/'
    },
    {
      label: 'Events',
      path: '/events'
    },
    {
      label: 'Upcoming Events',
      path: '/upcoming-events'
    },
    {
      label: 'Registered Events',
      path: '/registered-events'
    }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return location.pathname.startsWith(path);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-apollo-border">

      {/* =====================================================
          TOP ACCENT
      ====================================================== */}
      <div className="h-1 bg-apollo-navy" />


      {/* =====================================================
          MAIN NAVBAR
      ====================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="h-[105px] flex items-center justify-between gap-6">

          {/* =================================================
              LOGO
          ================================================== */}
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="flex items-center shrink-0"
          >
            <img
              src="/assets/apollo_logo_full.png"
              alt="The Apollo University"
              className="h-20 sm:h-23 w-auto object-contain"
            />
          </Link>


          {/* =================================================
              DESKTOP NAVIGATION
          ================================================== */}
          <nav className="hidden lg:flex items-center gap-1">

            {navItems.map((item) => {

              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-5 py-3 text-[16px] font-semibold transition-colors ${
                    active
                      ? 'text-apollo-navy'
                      : 'text-gray-500 hover:text-apollo-navy'
                  }`}
                >
                  {item.label}

                  {active && (
                    <span className="absolute left-3.5 right-3.5 -bottom-[21px] h-0.5 bg-apollo-teal rounded-full" />
                  )}
                </Link>
              );
            })}

          </nav>


          {/* =================================================
              RIGHT SIDE
          ================================================== */}
          <div className="flex items-center gap-2">

            {/* Search */}
            <div className="hidden md:flex items-center">

              <div className="relative">

                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  type="text"
                  placeholder="Search events"
                  value={searchValue || ''}
                  onChange={(e) =>
                    onSearchChange &&
                    onSearchChange(e.target.value)
                  }
                  className="w-[260px] lg:w-[290px] pl-9 pr-3 py-2 rounded-lg bg-[#f7f8fa] border border-apollo-border text-sm text-apollo-dark placeholder:text-gray-400 focus:outline-none focus:border-apollo-teal focus:ring-1 focus:ring-apollo-teal transition"
                />

              </div>

            </div>


            {/* User */}
            {user ? (

              <div className="relative">

                <button
                  onClick={() =>
                    setProfileOpen(!profileOpen)
                  }
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#f7f8fa] transition-colors"
                >

                  <div className="w-8 h-8 rounded-full bg-apollo-navy text-white flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>

                  <span className="hidden xl:block max-w-[100px] truncate text-sm font-semibold text-apollo-navy">
                    {displayName}
                  </span>

                  <ChevronDown
                    className={`hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform ${
                      profileOpen
                        ? 'rotate-180'
                        : ''
                    }`}
                  />

                </button>


                {/* Profile dropdown */}
                {profileOpen && (

                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl border border-apollo-border shadow-lg overflow-hidden">

                    <div className="px-4 py-3 border-b border-gray-100">

                      <p className="text-sm font-bold text-apollo-navy truncate">
                        {displayName}
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                        {user.email || ''}
                      </p>

                      <span className="inline-block mt-2 px-2 py-0.5 rounded bg-apollo-light text-[9px] font-bold uppercase tracking-wider text-apollo-teal">
                        {user.role || 'student'}
                      </span>

                    </div>


                    {/* Faculty */}
                    {user.role === 'faculty' && (
                      <div className="py-1">

                        <Link
                          to="/faculty/dashboard"
                          onClick={() =>
                            setProfileOpen(false)
                          }
                          className="block px-4 py-2.5 text-sm font-semibold text-apollo-dark hover:bg-apollo-light"
                        >
                          Faculty Dashboard
                        </Link>

                        <Link
                          to="/faculty/events/create"
                          onClick={() =>
                            setProfileOpen(false)
                          }
                          className="block px-4 py-2.5 text-sm font-semibold text-apollo-teal hover:bg-apollo-light"
                        >
                          Create New Event
                        </Link>

                      </div>
                    )}


                    {/* Admin */}
                    {user.role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() =>
                          setProfileOpen(false)
                        }
                        className="block px-4 py-2.5 text-sm font-semibold text-apollo-dark hover:bg-apollo-light border-b border-gray-100"
                      >
                        Administrator Portal
                      </Link>
                    )}


                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 border-t border-gray-100"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>

                  </div>

                )}

              </div>

            ) : (

              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-apollo-navy text-white text-sm font-bold hover:bg-apollo-teal transition-colors"
              >
                Sign In
              </Link>

            )}


            {/* Mobile menu */}
            <button
              onClick={() =>
                setMobileMenuOpen(!mobileMenuOpen)
              }
              className="lg:hidden w-9 h-9 rounded-lg border border-apollo-border flex items-center justify-center text-apollo-navy hover:bg-apollo-light transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

          </div>

        </div>

      </div>


      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}
      {mobileMenuOpen && (

        <div className="lg:hidden border-t border-apollo-border bg-white">

          <div className="max-w-7xl mx-auto px-4 py-4">

            {/* Mobile search */}
            <div className="relative mb-4">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="text"
                placeholder="Search events"
                value={searchValue || ''}
                onChange={(e) =>
                  onSearchChange &&
                  onSearchChange(e.target.value)
                }
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#f7f8fa] border border-apollo-border text-sm focus:outline-none focus:border-apollo-teal"
              />

            </div>


            {/* Mobile links */}
            <nav className="space-y-1">

              {navItems.map((item) => {

                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={`block px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-apollo-light text-apollo-navy'
                        : 'text-gray-600 hover:bg-apollo-light hover:text-apollo-navy'
                    }`}
                  >
                    {item.label}
                  </Link>
                );

              })}

            </nav>


            {/* Mobile sign in */}
            {!user && (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="mt-3 block text-center px-4 py-2.5 rounded-lg bg-apollo-navy text-white text-sm font-bold"
              >
                Sign In
              </Link>
            )}

          </div>

        </div>

      )}

    </header>
  );
}