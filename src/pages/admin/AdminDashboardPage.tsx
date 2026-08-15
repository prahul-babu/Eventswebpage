import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  FileCheck,
  Clock,
  TrendingUp,
  Activity,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useAdminDashboardMetrics, useAdminAuditLogs } from "@/lib/queries/adminUsers";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const AdminDashboardPage: React.FC = () => {
  const { data: metrics, isLoading: isMetricsLoading } = useAdminDashboardMetrics();
  const { data: recentLogs, isLoading: isLogsLoading } = useAdminAuditLogs();

  if (isMetricsLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Aggregating university institutional analytics...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Students",
      value: metrics?.studentsCount || 0,
      sub: `${metrics?.facultyCount || 0} Faculty • ${metrics?.adminCount || 0} Admins`,
      icon: Users,
      href: "/admin/users",
      badge: "Directory",
      color: "text-slate-900",
    },
    {
      title: "Pending Access Requests",
      value: metrics?.pendingUsersCount || 0,
      sub: "Awaiting role clearance",
      icon: UserCheck,
      href: "/admin/users/requests",
      badge: (metrics?.pendingUsersCount || 0) > 0 ? "Action Required" : "All Clear",
      color: (metrics?.pendingUsersCount || 0) > 0 ? "text-amber-600" : "text-slate-900",
    },
    {
      title: "Event Approvals Queue",
      value: metrics?.pendingEventsCount || 0,
      sub: "Proposals in review",
      icon: Clock,
      href: "/admin/approvals",
      badge: (metrics?.pendingEventsCount || 0) > 0 ? "Review Gate" : "Clear",
      color: (metrics?.pendingEventsCount || 0) > 0 ? "text-amber-600" : "text-slate-900",
    },
    {
      title: "Published Events",
      value: metrics?.publishedEventsCount || 0,
      sub: "Active in student catalog",
      icon: Calendar,
      href: "/admin/events",
      badge: "Live Catalog",
      color: "text-indigo-600",
    },
    {
      title: "Total Registrations",
      value: metrics?.totalRegistrations || 0,
      sub: "Confirmed campus bookings",
      icon: TrendingUp,
      href: "/admin/events",
      badge: "Campus Bookings",
      color: "text-emerald-600",
    },
    {
      title: "Gross Revenue",
      value: `₹${(metrics?.totalRevenue || 0).toLocaleString()}`,
      sub: "Processed via Razorpay",
      icon: DollarSign,
      href: "/admin/events",
      badge: "Gateway Settlement",
      color: "text-slate-900",
    },
    {
      title: "Reports Awaiting Review",
      value: metrics?.pendingReportsCount || 0,
      sub: "Post-event outcomes",
      icon: FileCheck,
      href: "/admin/reports",
      badge: "Accreditation",
      color: (metrics?.pendingReportsCount || 0) > 0 ? "text-amber-600" : "text-slate-900",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Administrative Oversight Console"
        description="Comprehensive university-wide control centre for user access, policy approvals, event governance, and financial reconciliation."
        badge={{ text: "Master Administration", variant: "indigo" }}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-9 bg-white">
              <Link to="/admin/users/import">
                <span>Roster Import</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-9 shadow-xs">
              <Link to="/admin/approvals">
                <span>Approvals Queue ({metrics?.pendingEventsCount || 0})</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 1. Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link key={idx} to={card.href} className="group">
                <Card className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">{card.title}</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
                    </div>
                  </div>
                  <div className={`text-2xl font-black mt-2 tracking-tight ${card.color}`}>
                    {card.value}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t text-[10px] text-slate-400 font-medium">
                    <span className="truncate max-w-[140px]">{card.sub}</span>
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5 font-bold">
                      {card.badge}
                    </Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 2. Charts Row: Events & Registrations Monthly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-3xl border-slate-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Monthly Event Hosting Volume
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Approved symposiums, workshops and hackathons across departments
                </CardDescription>
              </div>
              <Badge variant="indigo" className="text-[10px]">AY 2025-26</Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.monthlyChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="events" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Student Registration Trends
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Verified campus attendance and seat bookings over time
                </CardDescription>
              </div>
              <Badge variant="emerald" className="text-[10px]">{metrics?.registrationGrowthBadge || "Active Term"}</Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics?.monthlyChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Line type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* 3. Recent Activity Feed from Audit Logs */}
        <Card className="rounded-3xl border-slate-200 bg-white shadow-xs overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Live Institutional Activity Feed</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Immutable audit trail of administrative approvals, role grants, and financial triggers
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs text-indigo-600 hover:text-indigo-800">
              <Link to="/admin/audit-logs">Full Audit Logs &rarr;</Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {isLogsLoading ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-indigo-600" />
                  <span>Loading recent activity feed...</span>
                </div>
              ) : recentLogs && recentLogs.length > 0 ? (
                recentLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      <div>
                        <strong className="text-slate-900 font-bold">{log.action.replace(/_/g, " ")}</strong>
                        <div className="text-[11px] text-slate-500">
                          by <span className="font-semibold text-slate-700">{log.actorEmail}</span> ({log.actorRole})
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {format(log.timestamp, "MMM d, h:mm a")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">No activity logged yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default AdminDashboardPage;
