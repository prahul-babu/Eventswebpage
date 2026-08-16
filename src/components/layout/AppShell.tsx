import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, GraduationCap, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { AppFooter } from "@/components/layout/AppFooter";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isAuthenticated, firebaseUser, profile, role, status, signOut } = useAuth();

  const getInitials = (name?: string | null): string => {
    if (!name) return "AU";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const displayName = profile?.displayName || firebaseUser?.displayName || firebaseUser?.email || "Campus Member";
  const userEmail = profile?.email || firebaseUser?.email || "";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Banner Notice */}
      <div className="bg-indigo-950 text-indigo-200 text-xs py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2 border-b border-indigo-900">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Apollo University Event Hub — Campus Portal</span>
        <Badge variant="amber" className="text-[10px] py-0 px-2 h-4 uppercase tracking-wider">
          {isAuthenticated ? "Authenticated" : "Identity Layer Active"}
        </Badge>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-900 via-indigo-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/15 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="font-bold text-base sm:text-lg tracking-tight text-slate-900 leading-none">
                The Apollo University
              </div>
              <div className="text-xs font-semibold text-indigo-600 tracking-wide mt-0.5">
                Event Hub
              </div>
            </div>
          </Link>

          {/* User Auth Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated && firebaseUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={firebaseUser.photoURL || undefined} alt={displayName} />
                      <AvatarFallback className="bg-indigo-700 text-white text-xs font-bold">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col text-left">
                      <span className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[140px]">
                        {displayName}
                      </span>
                      {role && (
                        <span className="text-[10px] text-indigo-600 font-medium capitalize mt-0.5">
                          {role}
                        </span>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5">
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-semibold text-slate-900 leading-none truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-none truncate">
                        {userEmail}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        {role && (
                          <Badge variant="indigo" className="text-[10px] py-0 px-1.5 capitalize">
                            {role}
                          </Badge>
                        )}
                        {status && (
                          <Badge
                            variant={status === "ACTIVE" ? "emerald" : "amber"}
                            className="text-[10px] py-0 px-1.5 uppercase"
                          >
                            {status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm text-xs h-9 px-4 gap-2"
              >
                <Link to="/login">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  <span>Sign In</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Shared Global Footer */}
      <AppFooter />
    </div>
  );
};

export default AppShell;
