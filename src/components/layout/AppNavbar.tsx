import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_NAVIGATION, getRoleHomeHref } from "@/components/layout/nav-config";
import { usePendingApprovals } from "@/lib/queries/admin";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const AppNavbar: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: pendingEvents } = usePendingApprovals();
  const pendingApprovalsCount = role === "admin" ? pendingEvents?.length || 0 : 0;

  const homeHref = getRoleHomeHref(role);
  const currentNavItems = role ? ROLE_NAVIGATION[role] : ROLE_NAVIGATION.student;

  const isLinkActive = (href: string, exact?: boolean): boolean => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Top University Ribbon */}
      <div className="bg-[#004D61] text-cyan-100 text-xs py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-between border-b border-[#003847]">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
            <span className="font-semibold text-white">The Apollo University</span>
            <span className="text-cyan-300 hidden sm:inline">&bull; School of Technology (B.Tech)</span>
          </div>

          <div className="flex items-center gap-2">
            {role && (
              <span className="bg-[#F5A623] text-slate-900 text-[10px] font-bold py-0.5 px-2.5 rounded-full uppercase tracking-wider shadow-2xs">
                {role} Portal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Translucent Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-all shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile Hamburger & Official Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile Sheet Trigger */}
            {isAuthenticated && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900"
                    aria-label="Open Navigation Menu"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-white">
                  <SheetHeader className="p-4 border-b bg-slate-50 text-left">
                    <div className="flex items-center gap-3">
                      <img
                        src="/apollo-logo.png"
                        alt="The Apollo University"
                        className="h-10 w-auto object-contain"
                      />
                      <div>
                        <SheetTitle className="text-xs font-bold text-slate-900">
                          The Apollo University
                        </SheetTitle>
                        <p className="text-[11px] text-[#007A99] font-semibold">B.Tech Event Hub</p>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Mobile Navigation Links */}
                  <nav className="p-3 space-y-1">
                    {currentNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isLinkActive(item.href, item.exact);
                      const isApprovals = item.href === "/admin/approvals";

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? "bg-[#E0F3F7] text-[#007A99] shadow-xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${active ? "text-[#007A99]" : "text-slate-400"}`} />
                            <span>{item.title}</span>
                          </div>
                          {isApprovals && pendingApprovalsCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F5A623] text-slate-950">
                              {pendingApprovalsCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            )}

            {/* Official University Logo & Brand Wordmark */}
            <Link to={homeHref} className="flex items-center gap-3 group">
              <img
                src="/apollo-logo.png"
                alt="The Apollo University"
                className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-102"
              />
              <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
                <span className="font-extrabold text-xs tracking-tight text-slate-900 leading-none">
                  School of Technology
                </span>
                <span className="text-[10px] font-bold text-[#007A99] tracking-wider uppercase mt-0.5">
                  B.Tech Event Hub
                </span>
              </div>
            </Link>
          </div>

          {/* Centre-Left: Primary Navigation Links (Desktop) */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
              {currentNavItems.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href, item.exact);
                const isApprovals = item.href === "/admin/approvals";

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                      active
                        ? "bg-[#E0F3F7] text-[#007A99]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? "text-[#007A99]" : "text-slate-400"}`} />
                    <span>{item.title}</span>
                    {isApprovals && pendingApprovalsCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#F5A623] text-slate-950 animate-pulse">
                        {pendingApprovalsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right: Notification Bell & Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <ProfileDropdown />
              </>
            ) : (
              <Button
                asChild
                size="sm"
                className="bg-[#007A99] hover:bg-[#006883] text-white font-bold text-xs rounded-xl shadow-xs"
              >
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default AppNavbar;
