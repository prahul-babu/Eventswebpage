import {
  Calendar,
  Ticket,
  LayoutDashboard,
  CalendarDays,
  FileBarChart,
  UserCheck,
  Users,
  Settings,
  Activity,
  LucideIcon,
  Home,
  Award,
  TrendingUp,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
  student: [
    { title: "Home", href: "/", icon: Home, exact: true },
    { title: "Events", href: "/events", icon: Calendar },
    { title: "My Registrations", href: "/my-registrations", icon: Ticket },
    { title: "My Transcript", href: "/my-participation", icon: Award },
  ],
  faculty: [
    { title: "Home", href: "/faculty", icon: Home, exact: true },
    { title: "Events", href: "/events", icon: Calendar },
    { title: "My Events", href: "/faculty/events", icon: CalendarDays },
    { title: "Reports", href: "/faculty/reports", icon: FileBarChart },
  ],
  admin: [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    { title: "Events", href: "/admin/events", icon: Calendar },
    { title: "Approvals", href: "/admin/approvals", icon: UserCheck },
    { title: "Users", href: "/admin/users", icon: Users },
    { title: "Reports", href: "/admin/reports", icon: FileBarChart },
    { title: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    { title: "Audit Logs", href: "/admin/audit-logs", icon: Activity },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ],
};

export const getRoleHomeHref = (role?: UserRole | null): string => {
  if (role === "admin") return "/admin";
  if (role === "faculty") return "/faculty";
  return "/";
};
