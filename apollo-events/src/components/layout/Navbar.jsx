import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, Menu, X, User, LogOut, Shield, PlusCircle, 
  ChevronDown, BookOpen, Layers, LayoutDashboard, Calendar 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onSearchChange, searchValue }) {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-50 bg-white text-apollo-dark border-b border-apollo-border shadow-sm">
      
      {/* Top Banner Gold Accent Line */}
      <div className="h-1.5 bg-gradient-to-r from-apollo-navy via-apollo-teal to-apollo-gold"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* LEFT SIDE: Menu Toggle + Profile Dropdown + Apollo University Logo */}
          <div className="flex items-center gap-4">
            
            {/* Menu Toggle Button (Matching VIT reference) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-3.5 py-2 rounded-lg bg-apollo-teal hover:bg-apollo-navy text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>

            {/* Official Full Color Apollo Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <img 
                src="/assets/apollo_logo_full.png" 
                alt="The Apollo University" 
                className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Profile Dropdown Button — Left Aligned as Requested */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-apollo-light hover:bg-apollo-gray border border-apollo-border text-xs font-bold text-apollo-dark transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-apollo-navy text-apollo-gold font-extrabold flex items-center justify-center text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="hidden sm:inline font-bold uppercase tracking-wider">{displayName.toUpperCase()}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-apollo-teal text-white">
                      {user.role || 'student'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl border border-apollo-border shadow-apollo-lg py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-bold text-xs text-apollo-dark">{displayName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{user.email || ''}</p>
                      </div>

                      {user.role === 'faculty' && (
                        <>
                          <Link
                            to="/faculty/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-xs font-semibold text-apollo-dark hover:bg-apollo-light"
                          >
                            Faculty Dashboard
                          </Link>
                          <Link
                            to="/faculty/events/create"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-xs font-bold text-apollo-teal hover:bg-apollo-light"
                          >
                            + Create New Event
                          </Link>
                        </>
                      )}

                      {user.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="block px-4 py-2 text-xs font-bold text-apollo-gold bg-apollo-navy"
                        >
                          Administrator Portal
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                          navigate('/login');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-gray-100"
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
                  className="px-4 py-2 rounded-lg bg-apollo-navy text-white hover:bg-apollo-navyDark text-xs font-bold transition-colors shadow-sm"
                >
                  Sign In
                </Link>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: Real-Time Working Search Bar */}
          <div className="flex-1 max-w-md hidden md:flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-apollo-teal absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search events, workshops, hackathons..."
                value={searchValue || ''}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-apollo-light border border-apollo-border rounded-xl text-xs font-medium text-apollo-dark focus:outline-none focus:ring-2 focus:ring-apollo-teal"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="bg-apollo-light border-t border-apollo-border px-4 py-4 space-y-3">
          <div className="md:hidden pb-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-apollo-teal absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchValue || ''}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-apollo-border rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-apollo-dark hover:bg-apollo-gray"
          >
            Home / Upcoming Events Table
          </Link>
          <Link
            to="/calendar"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-apollo-dark hover:bg-apollo-gray"
          >
            University Calendar
          </Link>

          {!user && (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center px-4 py-2 rounded-lg bg-apollo-gold text-apollo-dark font-bold text-sm shadow-gold"
            >
              Sign In to Portal
            </Link>
          )}
        </div>
      )}

    </header>
  );
}
