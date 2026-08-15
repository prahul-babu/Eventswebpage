import React from "react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  User as UserIcon,
  Ticket,
  CalendarDays,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronDown,
  Bell,
} from "lucide-react";
import type { UserRole } from "@/types";

export const ProfileDropdown: React.FC = () => {
  const { firebaseUser, profile, role, status, signOut } = useAuth();

  if (!firebaseUser) {
    return null;
  }

  const displayName = profile?.displayName || firebaseUser.displayName || "Campus Member";
  const userEmail = profile?.email || firebaseUser.email || "";

  const getInitials = (name?: string | null): string => {
    if (!name) return "AU";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Role Badge Color mapping: student = slate, faculty = indigo, admin = amber
  const getRoleBadgeVariant = (userRole?: UserRole | null): "secondary" | "indigo" | "amber" => {
    if (userRole === "admin") return "amber";
    if (userRole === "faculty") return "indigo";
    return "secondary"; // slate
  };

  // Role-appropriate second link
  const renderRoleSecondLink = () => {
    if (role === "student") {
      return (
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/my-registrations" className="flex items-center">
            <Ticket className="mr-2 h-4 w-4 text-slate-500" />
            <span>My Registrations</span>
          </Link>
        </DropdownMenuItem>
      );
    }
    if (role === "faculty") {
      return (
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/faculty/events" className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-indigo-500" />
            <span>My Events</span>
          </Link>
        </DropdownMenuItem>
      );
    }
    if (role === "admin") {
      return (
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/admin/approvals" className="flex items-center">
            <ShieldCheck className="mr-2 h-4 w-4 text-amber-500" />
            <span>Pending Approvals</span>
          </Link>
        </DropdownMenuItem>
      );
    }
    return null;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open User Profile Menu"
          className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
            <AvatarImage src={firebaseUser.photoURL || undefined} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-tr from-indigo-900 to-indigo-700 text-white text-xs font-bold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-2xl shadow-2xl border-slate-200">
        {/* Header Block with Avatar, Name, Email, and Colored Role Badge */}
        <DropdownMenuLabel className="font-normal p-3 bg-slate-50/70 rounded-xl mb-1 border border-slate-100">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={firebaseUser.photoURL || undefined} alt={displayName} />
              <AvatarFallback className="bg-indigo-800 text-white text-xs font-bold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 space-y-0.5">
              <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 truncate font-mono">{userEmail}</p>
              <div className="flex items-center gap-1.5 pt-1">
                {role && (
                  <Badge
                    variant={getRoleBadgeVariant(role)}
                    className="text-[10px] py-0 px-1.5 h-4 capitalize font-semibold"
                  >
                    {role}
                  </Badge>
                )}
                {status && (
                  <Badge
                    variant={status === "ACTIVE" ? "emerald" : "amber"}
                    className="text-[10px] py-0 px-1.5 h-4 uppercase"
                  >
                    {status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Menu Items */}
        <div className="p-1 space-y-0.5 text-xs">
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/profile" className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4 text-slate-500" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>

          {renderRoleSecondLink()}

          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/profile/notifications" className="flex items-center">
              <Bell className="mr-2 h-4 w-4 text-indigo-500" />
              <span>Notification Preferences</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/help" className="flex items-center">
              <HelpCircle className="mr-2 h-4 w-4 text-slate-500" />
              <span>Help &amp; Knowledge Base</span>
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        {/* Danger Sign-Out Item */}
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer text-xs rounded-lg m-1"
        >
          <LogOut className="mr-2 h-4 w-4 text-rose-600" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
